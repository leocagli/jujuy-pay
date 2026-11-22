// Prepara Stellar testnet para la demo: crea la cuenta del comercio (con trustline a USDC)
// y una billetera de turista de prueba con XLM. Guarda todo en .env (que no se sube al repo).
// Uso: npm run stellar:setup
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

const HORIZON = 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = process.env.STELLAR_USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const server = new Horizon.Server(HORIZON);

const envText = existsSync('.env') ? readFileSync('.env', 'utf8') : readFileSync('.env.example', 'utf8');
const get = (k: string) => envText.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
let out = envText;
const set = (k: string, v: string) => {
  out = new RegExp(`^${k}=`, 'm').test(out) ? out.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : `${out.trimEnd()}\n${k}=${v}\n`;
};

async function fund(pub: string) {
  const r = await fetch(`https://friendbot.stellar.org?addr=${pub}`);
  if (!r.ok && r.status !== 400) throw new Error(`friendbot ${r.status}`);
}

async function main() {
  // Comercio
  let merchantSecret = get('STELLAR_MERCHANT_SECRET');
  if (!merchantSecret) {
    const kp = Keypair.random();
    merchantSecret = kp.secret();
    console.log('Creando cuenta del comercio', kp.publicKey());
    await fund(kp.publicKey());
  }
  const merchant = Keypair.fromSecret(merchantSecret);
  const usdc = new Asset('USDC', USDC_ISSUER);
  const acct = await server.loadAccount(merchant.publicKey());
  const hasTrust = acct.balances.some((b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER);
  if (!hasTrust) {
    console.log('Agregando trustline a USDC');
    const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.changeTrust({ asset: usdc }))
      .setTimeout(60)
      .build();
    tx.sign(merchant);
    await server.submitTransaction(tx);
  }
  set('STELLAR_NETWORK', 'testnet');
  set('STELLAR_MERCHANT_ADDRESS', merchant.publicKey());
  set('STELLAR_MERCHANT_SECRET', merchantSecret);

  // Turista de prueba (paga con XLM; el DEX lo convierte a USDC)
  let touristSecret = get('STELLAR_DEMO_TOURIST_SECRET');
  if (!touristSecret) {
    const kp = Keypair.random();
    touristSecret = kp.secret();
    console.log('Creando billetera de turista de prueba', kp.publicKey());
    await fund(kp.publicKey());
  }
  set('STELLAR_DEMO_TOURIST_SECRET', touristSecret);

  writeFileSync('.env', out);
  console.log('Listo. Comercio:', merchant.publicKey());
  console.log('Turista de prueba:', Keypair.fromSecret(touristSecret).publicKey());
}

main().catch((e) => {
  console.error(e?.response?.data?.extras?.result_codes ?? e);
  process.exit(1);
});
