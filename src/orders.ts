// Confirmación de pagos: sea cual sea el medio, termina acá. Marca la orden pagada y le manda el ticket al turista.
import { config } from './config.js';
import { send, type Out } from './channels/index.js';
import { t } from './i18n.js';
import { orders, users } from './store.js';

export const ticketImageUrl = (id: string) => `${config.publicUrl}/ticket/${id}.png`;

export async function markPaid(orderId: string, providerRef?: string) {
  const o = orders.get(orderId);
  if (!o || o.status === 'paid') return o;
  o.status = 'paid';
  o.paidAt = new Date().toISOString();
  if (providerRef) o.providerRef = providerRef;
  orders.put(o);

  const u = users.get(o.userId);
  if (!u) return o;
  const msgs: Out[] = [{ text: t(u.lang, 'paid', { item: o.itemName, qty: o.qty, id: o.id }), mediaUrl: ticketImageUrl(o.id) }];
  if (u.subscribed) {
    u.state = 'menu';
  } else {
    msgs.push({ text: t(u.lang, 'optinAsk') });
    u.state = 'optin';
  }
  u.draft = {};
  users.put(u);
  await send(u, msgs);
  console.log(`[pago] ${o.id} ${o.method} ${o.amount} ${o.currency} ${o.live ? 'real' : 'simulado'}`);
  return o;
}
