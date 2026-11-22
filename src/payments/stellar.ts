// USDC en Stellar. El turista paga desde su wallet con un link SEP-7; identificamos la orden por el memo.
// Un poller mira los pagos entrantes de la cuenta del comercio en Horizon.
import { config, live } from '../config.js';
import type { Order } from '../store.js';
import { demoUrl, type PayResult } from './index.js';

export const memoFor = (o: Order) => o.id; // "JPXXXXXX", entra en un memo de texto (28 bytes)

export function sep7Uri(o: Order) {
  const p = new URLSearchParams({
    destination: config.stellar.merchant,
    amount: o.amount.toFixed(2),
    asset_code: 'USDC',
    asset_issuer: config.stellar.usdcIssuer,
    memo: memoFor(o),
    memo_type: 'MEMO_TEXT',
    msg: `Jujuy Pay ${o.id}`,
  });
  if (config.stellar.network !== 'public') p.set('network_passphrase', 'Test SDF Network ; September 2015');
  return `web+stellar:pay?${p.toString()}`;
}

export async function create(o: Order): Promise<PayResult> {
  // Siempre mandamos a nuestra página, que muestra el QR SEP-7 (WhatsApp no abre links web+stellar:).
  return { url: demoUrl(o), live: live.stellar() };
}

// Busca un pago de USDC con el memo de la orden y monto suficiente. Devuelve el hash de la transacción.
export async function findPayment(o: Order): Promise<string | null> {
  if (!live.stellar()) return null;
  const url = `${config.stellar.horizon}/accounts/${config.stellar.merchant}/payments?order=desc&limit=50&join=transactions`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const j: any = await r.json();
  for (const p of j._embedded?.records ?? []) {
    if (p.type !== 'payment' || p.to !== config.stellar.merchant) continue;
    if (p.asset_code !== 'USDC' || p.asset_issuer !== config.stellar.usdcIssuer) continue;
    if (p.transaction?.memo !== memoFor(o)) continue;
    if (Number(p.amount) + 1e-7 < Number(o.amount.toFixed(2))) continue;
    return p.transaction_hash;
  }
  return null;
}
