// HTML de las páginas que abre el turista desde el link de WhatsApp: checkout, resultado y ticket.
import QRCode from 'qrcode';
import { createHmac } from 'node:crypto';
import { config, live } from './config.js';
import { fmt } from './fx.js';
import { methodLabel } from './payments/index.js';
import { sep7Uri } from './payments/stellar.js';
import type { Order } from './store.js';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function layout(title: string, body: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
:root{--bg:#f6f1ea;--card:#fff;--ink:#2b2118;--muted:#7a6a5c;--accent:#c2410c;--ok:#15803d;--line:#e7dccf}
@media (prefers-color-scheme:dark){:root{--bg:#1c1814;--card:#27211b;--ink:#f3ece4;--muted:#b3a393;--line:#3a3129}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:440px;margin:0 auto;padding:24px 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:16px}
h1{font-size:20px;margin:0 0 4px}.muted{color:var(--muted);font-size:14px}
.amount{font-size:32px;font-weight:700;margin:12px 0}
.wiphala{height:6px;border-radius:3px;background:linear-gradient(90deg,#e11d48,#f97316,#facc15,#f5f5f4,#16a34a,#2563eb,#7c3aed);margin-bottom:16px}
button,.btn{display:block;width:100%;padding:14px;border:0;border-radius:12px;background:var(--accent);color:#fff;font-size:16px;font-weight:600;text-align:center;text-decoration:none;cursor:pointer;margin-top:12px}
.btn.secondary{background:transparent;color:var(--accent);border:1px solid var(--accent)}
img.qr{display:block;width:240px;max-width:100%;margin:12px auto;background:#fff;padding:8px;border-radius:12px}
code{word-break:break-all;font-size:12px;background:var(--bg);padding:2px 4px;border-radius:4px}
.ok{color:var(--ok);font-weight:700}.tag{display:inline-block;font-size:12px;padding:2px 8px;border-radius:99px;background:var(--bg);color:var(--muted)}
</style></head><body><main><div class="wiphala"></div>${body}</main></body></html>`;
}

function summary(o: Order) {
  return `<div class="card"><span class="tag">Orden ${esc(o.id)} · ${esc(methodLabel[o.method])}</span>
<h1 style="margin-top:8px">${esc(o.itemName)} x${o.qty}</h1>
<div class="amount">${fmt(o.amount, o.currency)}</div>
<div class="muted">${o.currency !== 'ARS' ? `Equivale a ${fmt(o.totalArs, 'ARS')}` : ''}</div></div>`;
}

export async function checkoutPage(o: Order) {
  if (o.status === 'paid') return donePage(o);
  const simulate = `<form method="post" action="/pay/${o.id}/simulate"><button>Simular pago (demo)</button></form>`;
  let body = '';
  if (o.method === 'stellar') {
    if (live.stellar()) {
      const uri = sep7Uri(o);
      const qr = await QRCode.toDataURL(uri, { margin: 1, width: 480 });
      body = `<div class="card"><h1>Pagá con USDC en Stellar</h1>
<p class="muted">Escaneá con tu wallet (LOBSTR, Freighter, Beans, Cosmos Pay). Red: ${esc(config.stellar.network)}.</p>
<img class="qr" src="${qr}" alt="QR de pago SEP-7">
<p class="muted">O enviá <b>${o.amount.toFixed(2)} USDC</b> a<br><code>${esc(config.stellar.merchant)}</code><br>con memo <code>${esc(o.id)}</code></p>
<a class="btn secondary" href="${esc(uri)}">Abrir en mi wallet</a>
<form method="post" action="/pay/${o.id}/check"><button>Ya pagué, verificar</button></form>
<p class="muted">La página se actualiza sola cuando llega el pago.</p></div>
<script>setInterval(async()=>{const r=await fetch('/api/orders/${o.id}');const j=await r.json();if(j.status==='paid')location.reload()},5000)</script>`;
    } else {
      body = `<div class="card"><h1>USDC en Stellar</h1><p class="muted">Falta configurar la cuenta del comercio (STELLAR_MERCHANT_ADDRESS). Modo demo.</p>${simulate}</div>`;
    }
  } else if (o.method === 'pix') {
    const qr = await QRCode.toDataURL(`PIX-DEMO|JUJUYPAY|${o.id}|BRL ${o.amount.toFixed(2)}`, { margin: 1, width: 480 });
    body = `<div class="card"><h1>Pague com PIX</h1>
<p class="muted">Escaneie o QR no app do seu banco. <b>Demo:</b> este QR não é um PIX real.</p>
<img class="qr" src="${qr}" alt="QR PIX demo">${simulate}</div>`;
  } else {
    body = `<div class="card"><h1>${esc(methodLabel[o.method])}</h1>
<p class="muted">Falta la clave del proveedor, así que este pago es simulado.</p>${simulate}</div>`;
  }
  return layout(`Pagar ${o.id}`, summary(o) + body);
}

export function donePage(o: Order) {
  return layout(
    `Pago confirmado ${o.id}`,
    `${summary(o)}<div class="card"><p class="ok">✅ Pago confirmado</p>
<p>Te mandamos el ticket por WhatsApp. Ya podés volver al chat.</p>
<a class="btn" href="/ticket/${o.id}">Ver ticket</a></div>`,
  );
}

export function pendingPage(o: Order) {
  return layout(`Pago pendiente ${o.id}`, `${summary(o)}<div class="card"><p>⏳ Todavía no vemos el pago acreditado. Si ya pagaste, en unos segundos te llega el ticket por WhatsApp.</p></div>`);
}

export const ticketCode = (o: Order) =>
  `JUJUYPAY|${o.id}|${o.itemId}|${o.qty}|${createHmac('sha256', config.adminToken).update(o.id).digest('hex').slice(0, 10)}`;

export async function ticketPng(o: Order) {
  return QRCode.toBuffer(ticketCode(o), { margin: 2, width: 512 });
}

export function ticketPage(o: Order) {
  return layout(
    `Ticket ${o.id}`,
    `<div class="card" style="text-align:center"><span class="tag">Jujuy Pay · Ticket</span>
<h1 style="margin-top:8px">${esc(o.itemName)}</h1><p class="muted">Cantidad: ${o.qty} · Orden ${esc(o.id)}</p>
<img class="qr" src="/ticket/${o.id}.png" alt="QR del ticket">
<p class="muted">Pagado con ${esc(methodLabel[o.method])}: ${fmt(o.amount, o.currency)}</p></div>`,
  );
}
