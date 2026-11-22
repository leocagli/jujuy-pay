// USDC en Stellar. El turista paga desde su wallet con un link SEP-7; identificamos la orden por el memo.
// Un poller mira los pagos entrantes de la cuenta del comercio en Horizon.
import { Asset, BASE_FEE, Horizon, Keypair, Memo, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
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

export const canPayFromDemoWallet = () =>
  live.stellar() && config.stellar.network !== 'public' && Boolean(config.stellar.demoTouristSecret);

export const explorerTx = (hash: string) =>
  `https://stellar.expert/explorer/${config.stellar.network === 'public' ? 'public' : 'testnet'}/tx/${hash}`;

// Demo en testnet: el turista de prueba paga con XLM y el DEX de Stellar lo convierte a USDC en el camino
// (path payment). El comercio recibe exactamente los USDC de la orden, con el memo de la orden.
export async function payFromDemoWallet(o: Order): Promise<string> {
  if (!canPayFromDemoWallet()) throw new Error('billetera de prueba no configurada');
  const server = new Horizon.Server(config.stellar.horizon);
  const tourist = Keypair.fromSecret(config.stellar.demoTouristSecret);
  const usdc = new Asset('USDC', config.stellar.usdcIssuer);
  const amount = o.amount.toFixed(2);
  const paths = await server.strictReceivePaths([Asset.native()], usdc, amount).call();
  const best = paths.records.sort((a, b) => Number(a.source_amount) - Number(b.source_amount))[0];
  if (!best) throw new Error('no hay liquidez XLM→USDC en el DEX');
  const account = await server.loadAccount(tourist.publicKey());
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: (Number(best.source_amount) * 1.05).toFixed(7),
        destination: config.stellar.merchant,
        destAsset: usdc,
        destAmount: amount,
        path: best.path.map((p) => (p.asset_type === 'native' ? Asset.native() : new Asset(p.asset_code!, p.asset_issuer!))),
      }),
    )
    .addMemo(Memo.text(memoFor(o)))
    .setTimeout(60)
    .build();
  tx.sign(tourist);
  const res = await server.submitTransaction(tx);
  return res.hash;
}

// Un pago directo o un path payment (el turista paga con otro activo y llega USDC): en ambos, asset_* y amount
// son lo que recibió el comercio.
const PAYMENT_TYPES = new Set(['payment', 'path_payment_strict_receive', 'path_payment_strict_send']);

// Busca un pago de USDC con el memo de la orden y monto suficiente. Devuelve el hash de la transacción.
export async function findPayment(o: Order): Promise<string | null> {
  if (!live.stellar()) return null;
  const url = `${config.stellar.horizon}/accounts/${config.stellar.merchant}/payments?order=desc&limit=50&join=transactions`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const j: any = await r.json();
  for (const p of j._embedded?.records ?? []) {
    if (!PAYMENT_TYPES.has(p.type) || p.to !== config.stellar.merchant) continue;
    if (p.asset_code !== 'USDC' || p.asset_issuer !== config.stellar.usdcIssuer) continue;
    if (p.transaction?.memo !== memoFor(o)) continue;
    if (Number(p.amount) + 1e-7 < Number(o.amount.toFixed(2))) continue;
    return p.transaction_hash;
  }
  return null;
}
