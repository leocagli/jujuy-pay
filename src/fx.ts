// Cotizaciones. ARS por USD sale del dólar MEP (lo que paga un turista con tarjeta extranjera);
// el resto de las monedas, del cruce contra USD. Si las APIs no responden, usamos valores fijos.

const FALLBACK_ARS_PER_USD = 1740;
const FALLBACK_USD_RATES: Record<string, number> = { USD: 1, EUR: 0.86, BRL: 5.4, CLP: 940, BOB: 6.9, UYU: 40, GBP: 0.75, PEN: 3.4 };

let cache: { at: number; ttl: number; arsPerUsd: number; usdRates: Record<string, number>; source: string } | null = null;
const TTL = 10 * 60 * 1000;
const TTL_FALLBACK = 30 * 1000; // si fallaron las APIs, reintentamos pronto

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

export async function rates() {
  if (cache && Date.now() - cache.at < cache.ttl) return cache;
  let arsPerUsd = FALLBACK_ARS_PER_USD;
  let usdRates = FALLBACK_USD_RATES;
  let ok = true;
  const sources: string[] = [];
  try {
    const mep = await getJson('https://dolarapi.com/v1/dolares/bolsa');
    if (Number(mep.venta) > 0) {
      arsPerUsd = Number(mep.venta);
      sources.push('dólar MEP (dolarapi.com)');
    }
  } catch {
    ok = false;
    sources.push('dólar MEP de referencia');
  }
  try {
    const fx = await getJson('https://open.er-api.com/v6/latest/USD');
    if (fx.rates) usdRates = { ...FALLBACK_USD_RATES, ...fx.rates };
  } catch {
    ok = false; // seguimos con los fijos
  }
  cache = { at: Date.now(), ttl: ok ? TTL : TTL_FALLBACK, arsPerUsd, usdRates, source: sources.join(', ') };
  return cache;
}

export async function convertArs(amountArs: number, currency: string): Promise<number> {
  if (currency === 'ARS') return amountArs;
  const r = await rates();
  const usd = amountArs / r.arsPerUsd;
  const rate = r.usdRates[currency] ?? 1;
  return usd * rate;
}

const ZERO_DECIMAL = new Set(['CLP', 'PYG', 'JPY']);

export function fmt(amount: number, currency: string, lang = 'es') {
  const locale = lang === 'pt' ? 'pt-BR' : lang === 'en' ? 'en-US' : 'es-AR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: ZERO_DECIMAL.has(currency) || currency === 'ARS' ? 0 : 2,
  }).format(amount);
}
