import express from 'express';
import { fileURLToPath } from 'node:url';
import { config, live } from './config.js';
import { getOrCreateUser, handle } from './bot/engine.js';
import { send } from './channels/index.js';
import { phoneFrom } from './channels/twilio.js';
import * as web from './channels/web.js';
import { broadcast } from './newsletter.js';
import { markPaid } from './orders.js';
import { checkoutPage, donePage, pendingPage, ticketPage, ticketPng } from './pages.js';
import { verifyPayment as verifyMp } from './payments/mercadopago.js';
import { findPayment } from './payments/stellar.js';
import { verifySession as verifyStripe } from './payments/stripe.js';
import { rates } from './fx.js';
import { broadcasts, orders, users } from './store.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

app.get('/', (_req, res) => res.redirect('/sim.html'));
app.get('/health', (_req, res) =>
  res.json({ ok: true, live: { twilio: live.twilio(), mp: live.mp(), stripe: live.stripe(), stellar: live.stellar() } }),
);

// ---------- Entrada de mensajes ----------
async function incoming(channel: 'twilio' | 'web', phone: string, text: string) {
  const { user, isNew } = getOrCreateUser(channel, phone);
  const out = await handle(user, text, isNew);
  await send(user, out);
}

// Twilio WhatsApp: configurar en el Sandbox "When a message comes in" = PUBLIC_URL/webhooks/twilio
app.post('/webhooks/twilio', (req, res) => {
  const phone = phoneFrom(String(req.body.From ?? ''));
  const text = String(req.body.Body ?? '');
  res.type('text/xml').send('<Response></Response>'); // contestamos por la API REST
  if (phone) incoming('twilio', phone, text).catch((e) => console.error('[twilio]', e));
});

// Simulador web
app.get('/sim/stream', (req, res) => web.subscribe(String(req.query.phone ?? ''), res));
app.post('/sim/send', async (req, res) => {
  const phone = String(req.body.phone ?? '').trim();
  const text = String(req.body.text ?? '');
  if (!/^\+\d{6,15}$/.test(phone)) return res.status(400).json({ error: 'phone' });
  await incoming('web', phone, text);
  res.json({ ok: true });
});
app.post('/sim/reset', (req, res) => {
  const u = users.get(`web:${String(req.body.phone ?? '')}`);
  if (u) {
    u.state = 'menu';
    u.draft = {};
  }
  res.json({ ok: true });
});

// ---------- Pagos ----------
app.get('/api/orders/:id', (req, res) => {
  const o = orders.get(req.params.id);
  return o ? res.json({ id: o.id, status: o.status }) : res.status(404).json({ error: 'not found' });
});

app.get('/pay/mp/return', async (req, res) => {
  const o = orders.get(String(req.query.order ?? ''));
  if (!o) return res.status(404).send('Orden no encontrada');
  const paymentId = String(req.query.payment_id ?? '');
  if (paymentId && (await verifyMp(paymentId)) === o.id) await markPaid(o.id, paymentId);
  const fresh = orders.get(o.id)!;
  res.send(fresh.status === 'paid' ? donePage(fresh) : pendingPage(fresh));
});

app.post('/webhooks/mercadopago', async (req, res) => {
  res.sendStatus(200);
  const id = String(req.body?.data?.id ?? req.query['data.id'] ?? req.query.id ?? '');
  const type = String(req.body?.type ?? req.query.type ?? req.query.topic ?? '');
  if (type !== 'payment' || !id) return;
  const orderId = await verifyMp(id);
  if (orderId) await markPaid(orderId, id);
});

app.get('/pay/stripe/return', async (req, res) => {
  const o = orders.get(String(req.query.order ?? ''));
  if (!o) return res.status(404).send('Orden no encontrada');
  const sid = String(req.query.session_id ?? '');
  if (sid && (await verifyStripe(sid)) === o.id) await markPaid(o.id, sid);
  const fresh = orders.get(o.id)!;
  res.send(fresh.status === 'paid' ? donePage(fresh) : pendingPage(fresh));
});

app.get('/pay/:id', async (req, res) => {
  const o = orders.get(req.params.id);
  if (!o) return res.status(404).send('Orden no encontrada');
  res.send(await checkoutPage(o));
});

// Solo para pagos en modo demo (o PIX, que siempre es simulado). Un pago real no se puede "simular".
app.post('/pay/:id/simulate', async (req, res) => {
  const o = orders.get(req.params.id);
  if (!o) return res.status(404).send('Orden no encontrada');
  if (o.live && o.method !== 'pix') return res.status(400).send('Este pago es real: no se puede simular.');
  await markPaid(o.id, 'demo');
  res.redirect(`/pay/${o.id}`);
});

app.post('/pay/:id/check', async (req, res) => {
  const o = orders.get(req.params.id);
  if (!o) return res.status(404).send('Orden no encontrada');
  if (o.method === 'stellar' && o.status === 'pending') {
    const hash = await findPayment(o);
    if (hash) await markPaid(o.id, hash);
  }
  res.redirect(`/pay/${o.id}`);
});

// Poller de Stellar: revisa cada 15 s las órdenes USDC pendientes.
setInterval(async () => {
  if (!live.stellar()) return;
  for (const o of orders.all().filter((x) => x.method === 'stellar' && x.status === 'pending')) {
    try {
      const hash = await findPayment(o);
      if (hash) await markPaid(o.id, hash);
    } catch (e) {
      console.error('[stellar poll]', (e as Error).message);
    }
  }
}, 15000);

// ---------- Tickets ----------
app.get('/ticket/:id.png', async (req, res) => {
  const o = orders.get(req.params.id);
  if (!o || o.status !== 'paid') return res.status(404).send('Ticket no disponible');
  res.type('image/png').send(await ticketPng(o));
});
app.get('/ticket/:id', (req, res) => {
  const o = orders.get(req.params.id);
  if (!o || o.status !== 'paid') return res.status(404).send('Ticket no disponible');
  res.send(ticketPage(o));
});

// ---------- Panel ----------
const isAdmin = (req: express.Request) => req.get('x-admin-token') === config.adminToken;

app.get('/api/admin/summary', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'token' });
  const all = orders.all();
  const paid = all.filter((o) => o.status === 'paid');
  res.json({
    live: { twilio: live.twilio(), mp: live.mp(), stripe: live.stripe(), stellar: live.stellar() },
    rate: await rates(),
    users: users.all().length,
    subscribers: users.all().filter((u) => u.subscribed).length,
    paidCount: paid.length,
    revenueArs: paid.reduce((s, o) => s + o.totalArs, 0),
    byMethod: paid.reduce<Record<string, number>>((acc, o) => ((acc[o.method] = (acc[o.method] ?? 0) + o.totalArs), acc), {}),
    byCurrency: paid.reduce<Record<string, number>>((acc, o) => ((acc[o.currency] = (acc[o.currency] ?? 0) + o.amount), acc), {}),
    orders: all.slice(0, 50),
    broadcasts: broadcasts.all().slice(0, 10),
  });
});

app.post('/api/admin/broadcast', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'token' });
  const text = String(req.body.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'text' });
  const sent = await broadcast(String(req.body.sponsor ?? '').trim(), text);
  res.json({ sent });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Jujuy Pay en http://localhost:${config.port}  (público: ${config.publicUrl})`);
  console.log(`Simulador: http://localhost:${config.port}/sim.html   Panel: http://localhost:${config.port}/admin.html`);
  console.log('Modo real:', { twilio: live.twilio(), mp: live.mp(), stripe: live.stripe(), stellar: live.stellar() });
});
