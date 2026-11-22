// Datos de ejemplo para que el panel no arranque vacío en la demo. Todo queda marcado como simulado
// (live: false, providerRef "seed") y los teléfonos son ficticios (55501xx).
import { catalog } from './catalog.js';
import { convertArs } from './fx.js';
import { detectLocale } from './i18n.js';
import { chargeCurrency } from './payments/index.js';
import { orders, users, type PayMethod } from './store.js';

const TOURISTS: [string, PayMethod][] = [
  ['+5511955550111', 'pix'],
  ['+5521955550112', 'stripe'],
  ['+12025550113', 'stripe'],
  ['+12025550114', 'stellar'],
  ['+34655550115', 'stripe'],
  ['+56955550116', 'stellar'],
  ['+5493885550117', 'mp'],
  ['+5491155550118', 'mp'],
  ['+44755550119', 'stripe'],
  ['+59175550120', 'stellar'],
  ['+5511955550121', 'pix'],
  ['+5493885550122', 'mp'],
];

export async function seed() {
  let n = 0;
  for (const [i, [phone, method]] of TOURISTS.entries()) {
    const id = `web:${phone}`;
    if (users.get(id)) continue;
    const { lang, currency } = detectLocale(phone);
    const at = new Date(Date.now() - (TOURISTS.length - i) * 17 * 60 * 1000).toISOString();
    users.put({ id, channel: 'web', phone, lang, currency, state: 'menu', draft: {}, subscribed: i % 3 !== 0, createdAt: at });
    const item = catalog[(i * 5) % catalog.length];
    const qty = 1 + (i % 3);
    const cur = chargeCurrency(method, currency);
    const totalArs = item.priceArs * qty;
    orders.put({
      id: orders.newId(),
      userId: id,
      itemId: item.id,
      itemName: item.name,
      qty,
      totalArs,
      method,
      currency: cur,
      amount: Math.round((await convertArs(totalArs, cur)) * 100) / 100,
      status: 'paid',
      live: false,
      providerRef: 'seed',
      createdAt: at,
      paidAt: at,
    });
    n++;
  }
  return n;
}
