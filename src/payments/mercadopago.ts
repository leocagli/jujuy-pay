// Mercado Pago Checkout Pro (ARS). Docs: https://www.mercadopago.com.ar/developers/es/reference/preferences/_checkout_preferences/post
import { config, live } from '../config.js';
import type { Order } from '../store.js';
import { demoUrl, type PayResult } from './index.js';

const API = 'https://api.mercadopago.com';
const auth = () => ({ Authorization: `Bearer ${config.mpToken}`, 'Content-Type': 'application/json' });

export async function create(o: Order): Promise<PayResult> {
  if (!live.mp()) return { url: demoUrl(o), live: false };
  const body = {
    items: [{ id: o.itemId, title: `${o.itemName} x${o.qty}`, quantity: 1, currency_id: 'ARS', unit_price: o.totalArs }],
    external_reference: o.id,
    notification_url: `${config.publicUrl}/webhooks/mercadopago`,
    back_urls: {
      success: `${config.publicUrl}/pay/mp/return?order=${o.id}`,
      failure: `${config.publicUrl}/pay/${o.id}`,
      pending: `${config.publicUrl}/pay/${o.id}`,
    },
    auto_return: 'approved',
  };
  const r = await fetch(`${API}/checkout/preferences`, { method: 'POST', headers: auth(), body: JSON.stringify(body) });
  const j: any = await r.json();
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${j.message ?? ''}`);
  const url = config.mpToken.startsWith('TEST-') ? j.sandbox_init_point ?? j.init_point : j.init_point;
  return { url, live: true, providerRef: j.id };
}

// Devuelve el id de orden si el pago está aprobado.
export async function verifyPayment(paymentId: string): Promise<string | null> {
  if (!live.mp()) return null;
  const r = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, { headers: auth() });
  if (!r.ok) return null;
  const p: any = await r.json();
  return p.status === 'approved' ? String(p.external_reference) : null;
}
