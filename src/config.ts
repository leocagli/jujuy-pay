try {
  process.loadEnvFile();
} catch {
  // sin .env: todo corre en modo demo
}

const env = (k: string, d = '') => (process.env[k] ?? d).trim();

export const config = {
  port: Number(env('PORT', '3000')),
  publicUrl: env('PUBLIC_URL', `http://localhost:${env('PORT', '3000')}`).replace(/\/$/, ''),
  adminToken: env('ADMIN_TOKEN', 'jujuy'),
  twilio: {
    sid: env('TWILIO_ACCOUNT_SID'),
    token: env('TWILIO_AUTH_TOKEN'),
    from: env('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886'),
  },
  mpToken: env('MP_ACCESS_TOKEN'),
  stripeKey: env('STRIPE_SECRET_KEY'),
  stellar: {
    network: env('STELLAR_NETWORK', 'testnet'),
    merchant: env('STELLAR_MERCHANT_ADDRESS'),
    usdcIssuer: env('STELLAR_USDC_ISSUER', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'),
    get horizon() {
      return this.network === 'public' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org';
    },
  },
};

export const live = {
  twilio: () => Boolean(config.twilio.sid && config.twilio.token),
  mp: () => Boolean(config.mpToken),
  stripe: () => Boolean(config.stripeKey),
  stellar: () => Boolean(config.stellar.merchant),
};
