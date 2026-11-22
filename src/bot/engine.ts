// Motor de conversación: una máquina de estados por usuario, con menús numerados.
// Recibe el texto del turista y devuelve los mensajes a contestar. No sabe nada del canal.
import { byCategory, findItem, type Category, type Lang } from '../catalog.js';
import type { Out } from '../channels/index.js';
import { convertArs, fmt, rates } from '../fx.js';
import { detectLocale, t } from '../i18n.js';
import { agenda } from '../newsletter.js';
import { chargeCurrency, createPayment } from '../payments/index.js';
import { orders, users, type ChannelId, type Order, type PayMethod, type User } from '../store.js';

const CATS: Category[] = ['bus', 'tour', 'event'];
const METHODS: PayMethod[] = ['mp', 'stripe', 'stellar', 'pix'];
const LANGS: Lang[] = ['es', 'en', 'pt'];

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const GREET = new Set(['hola', 'menu', 'inicio', 'hi', 'hello', 'oi', 'ola', 'start', 'empezar', 'comenzar']);
const STOP = new Set(['baja', 'stop', 'sair', 'unsubscribe', 'cancelar suscripcion']);
const LANG_CMD = new Set(['idioma', 'language', 'lingua', 'lang']);
const YES = new Set(['si', 'yes', 'sim', 's', 'y', 'dale', 'ok']);
const NO = new Set(['no', 'nao', 'n']);

export function getOrCreateUser(channel: ChannelId, phone: string): { user: User; isNew: boolean } {
  const id = `${channel}:${phone}`;
  const existing = users.get(id);
  if (existing) return { user: existing, isNew: false };
  const { lang, currency } = detectLocale(phone);
  const user: User = { id, channel, phone, lang, currency, state: 'menu', draft: {}, subscribed: false, createdAt: new Date().toISOString() };
  users.put(user);
  return { user, isNew: true };
}

async function priceLine(lang: Lang, ars: number, currency: string) {
  const local = fmt(ars, 'ARS', lang);
  if (currency === 'ARS') return `${local} (≈ ${fmt(await convertArs(ars, 'USD'), 'USD', lang)})`;
  return `${local} (≈ ${fmt(await convertArs(ars, currency), currency, lang)})`;
}

async function itemList(u: User, cat: Category) {
  const lines = await Promise.all(
    byCategory(cat).map(async (it, i) => `${i + 1}️⃣ *${it.name}*\n    ${it.desc[u.lang]}\n    ${await priceLine(u.lang, it.priceArs, u.currency)}`),
  );
  return `${t(u.lang, 'pickItem')}\n\n${lines.join('\n\n')}`;
}

const menu = (u: User): Out[] => {
  u.state = 'menu';
  u.draft = {};
  return [{ text: t(u.lang, 'menu') }];
};

export async function handle(u: User, raw: string, isNew = false): Promise<Out[]> {
  const out = await route(u, raw, isNew);
  users.put(u);
  return out;
}

async function route(u: User, raw: string, isNew: boolean): Promise<Out[]> {
  const msg = norm(raw);
  const n = Number.parseInt(msg, 10);

  if (isNew) return [{ text: t(u.lang, 'welcome') }, ...menu(u)];

  // Comandos que valen en cualquier momento
  if (GREET.has(msg)) return menu(u);
  if (STOP.has(msg)) {
    u.subscribed = false;
    return [{ text: t(u.lang, 'unsub') }];
  }
  if (LANG_CMD.has(msg)) {
    u.state = 'lang';
    return [{ text: t(u.lang, 'langMenu') }];
  }
  if (msg === 'agenda') return [{ text: agenda(u.lang) }];

  switch (u.state) {
    case 'lang': {
      if (n >= 1 && n <= 3) {
        u.lang = LANGS[n - 1];
        return menu(u);
      }
      return [{ text: t(u.lang, 'langMenu') }];
    }

    case 'menu': {
      if (n >= 1 && n <= 3) {
        u.draft = { category: CATS[n - 1] };
        u.state = 'pick';
        return [{ text: await itemList(u, CATS[n - 1]) }];
      }
      if (n === 4) {
        if (u.subscribed) return [{ text: agenda(u.lang) }, { text: t(u.lang, 'alreadySub') }];
        u.state = 'optin';
        return [{ text: agenda(u.lang) }, { text: t(u.lang, 'optinAsk') }];
      }
      return [{ text: t(u.lang, 'invalid') }];
    }

    case 'pick': {
      if (n === 0) return menu(u);
      const items = byCategory(u.draft.category as Category);
      if (n >= 1 && n <= items.length) {
        u.draft.itemId = items[n - 1].id;
        u.state = 'qty';
        return [{ text: `*${items[n - 1].name}*\n${t(u.lang, 'askQty')}` }];
      }
      return [{ text: t(u.lang, 'invalid') }];
    }

    case 'qty': {
      const item = findItem(u.draft.itemId ?? '');
      if (!item) return menu(u);
      if (!(n >= 1 && n <= 10)) return [{ text: t(u.lang, 'askQty') }];
      u.draft.qty = n;
      u.state = 'pay';
      const total = item.priceArs * n;
      const r = await rates();
      const stripeCur = chargeCurrency('stripe', u.currency);
      const text =
        `${t(u.lang, 'summary')}\n${item.name} x${n}\n${t(u.lang, 'total')}: *${await priceLine(u.lang, total, u.currency)}*\n` +
        `_${t(u.lang, 'rateNote')}: 1 USD = ${fmt(r.arsPerUsd, 'ARS', u.lang)} (${r.source})_\n\n` +
        t(u.lang, 'payMenu', { cur: stripeCur });
      return [{ text }];
    }

    case 'pay': {
      const item = findItem(u.draft.itemId ?? '');
      if (!item || !u.draft.qty) return menu(u);
      if (!(n >= 1 && n <= 4)) return [{ text: t(u.lang, 'invalid') }];
      const method = METHODS[n - 1];
      const currency = chargeCurrency(method, u.currency);
      const totalArs = item.priceArs * u.draft.qty;
      const amount = Math.round((await convertArs(totalArs, currency)) * 100) / 100;
      const order: Order = {
        id: orders.newId(),
        userId: u.id,
        itemId: item.id,
        itemName: item.name,
        qty: u.draft.qty,
        totalArs,
        method,
        currency,
        amount,
        status: 'pending',
        live: false,
        createdAt: new Date().toISOString(),
      };
      try {
        const res = await createPayment(order);
        Object.assign(order, { payUrl: res.url, live: res.live, providerRef: res.providerRef });
      } catch (e) {
        return [{ text: t(u.lang, 'payError', { err: (e as Error).message.slice(0, 80) }) }];
      }
      orders.put(order);
      u.draft.orderId = order.id;
      u.state = 'await_payment';
      const msgs: Out[] = [{ text: t(u.lang, 'payLink', { amount: fmt(amount, currency, u.lang), url: order.payUrl!, id: order.id }) }];
      if (!order.live) msgs.push({ text: t(u.lang, 'demoNote') });
      return msgs;
    }

    case 'await_payment': {
      const o = orders.get(u.draft.orderId ?? '');
      if (!o || o.status === 'paid') return menu(u);
      return [{ text: t(u.lang, 'waiting', { id: o.id, url: o.payUrl ?? '' }) }];
    }

    case 'optin': {
      if (YES.has(msg)) {
        u.subscribed = true;
        u.state = 'menu';
        return [{ text: t(u.lang, 'optinYes') }];
      }
      if (NO.has(msg)) {
        u.state = 'menu';
        return [{ text: t(u.lang, 'optinNo') }];
      }
      return [{ text: t(u.lang, 'optinAsk') }];
    }

    default:
      return menu(u);
  }
}
