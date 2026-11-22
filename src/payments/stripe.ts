// Stripe Checkout para tarjetas del exterior (USD/EUR/BRL/GBP). Sin SDK: la API REST alcanza.
import { config, live } from '../config.js';
import type { Order } from '../store.js';
import { demoUrl, type PayResult } from './index.js';

const API = 'https://api.stripe.com/v1';
const headers = () => ({ Authorization: `Bearer ${config.stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' });

export async function create(o: Order): Promise<PayResult> {
  if (!live.stripe()) return { url: demoUrl(o), live: false };
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': o.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(Math.round(o.amount * 100)),
    'line_items[0][price_data][product_data][name]': `${o.itemName} x${o.qty}`,
    client_reference_id: o.id,
    'metadata[orderId]': o.id,
    success_url: `${config.publicUrl}/pay/stripe/return?order=${o.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.publicUrl}/pay/${o.id}`,
  });
  const r = await fetch(`${API}/checkout/sessions`, { method: 'POST', headers: headers(), body: form });
  const j: any = await r.json();
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${j.error?.message ?? ''}`);
  return { url: j.url, live: true, providerRef: j.id };
}

// Devuelve el id de orden si la sesión está pagada.
export async function verifySession(sessionId: string): Promise<string | null> {
  if (!live.stripe()) return null;
  const r = await fetch(`${API}/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: headers() });
  if (!r.ok) return null;
  const s: any = await r.json();
  return s.payment_status === 'paid' ? String(s.client_reference_id) : null;
}
