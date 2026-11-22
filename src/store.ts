// Persistencia mínima en un JSON. Alcanza para la demo; se cambia por una base real después.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import type { Lang } from './catalog.js';

export type ChannelId = 'twilio' | 'web';
export type PayMethod = 'mp' | 'stripe' | 'stellar' | 'pix';

export interface User {
  id: string; // "twilio:+549..." o "web:+55..."
  channel: ChannelId;
  phone: string;
  lang: Lang;
  currency: string;
  state: string;
  draft: { category?: string; itemId?: string; qty?: number; orderId?: string };
  subscribed: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  qty: number;
  totalArs: number;
  method: PayMethod;
  currency: string; // moneda en la que se cobra
  amount: number; // monto en esa moneda
  status: 'pending' | 'paid';
  payUrl?: string;
  providerRef?: string;
  live: boolean; // false = pago simulado (modo demo)
  createdAt: string;
  paidAt?: string;
}

interface Db {
  users: Record<string, User>;
  orders: Record<string, Order>;
  broadcasts: { at: string; sponsor: string; text: string; sent: number }[];
}

const FILE = 'data/db.json';
let db: Db = { users: {}, orders: {}, broadcasts: [] };
if (existsSync(FILE)) db = JSON.parse(readFileSync(FILE, 'utf8'));

export function save() {
  mkdirSync('data', { recursive: true });
  writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export const users = {
  get: (id: string) => db.users[id],
  all: () => Object.values(db.users),
  put: (u: User) => {
    db.users[u.id] = u;
    save();
  },
};

export const orders = {
  get: (id: string) => db.orders[id],
  all: () => Object.values(db.orders).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  put: (o: Order) => {
    db.orders[o.id] = o;
    save();
  },
  newId: () => 'JP' + randomBytes(4).toString('hex').toUpperCase().slice(0, 6),
};

export const broadcasts = {
  all: () => db.broadcasts,
  add: (b: Db['broadcasts'][number]) => {
    db.broadcasts.unshift(b);
    save();
  },
};
