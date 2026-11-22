// Cada medio de pago expone create(order) y devuelve el link que le mandamos al turista.
// Si falta la clave del proveedor, cae en modo demo: link a nuestra página /pay/:id con botón "simular pago".
import { config } from '../config.js';
import type { Order, PayMethod } from '../store.js';
import * as mp from './mercadopago.js';
import * as stripe from './stripe.js';
import * as stellar from './stellar.js';

export interface PayResult {
  url: string;
  live: boolean;
  providerRef?: string;
}

export const demoUrl = (o: Order) => `${config.publicUrl}/pay/${o.id}`;

// Moneda y monto que se cobran según el medio. Las tarjetas extranjeras van en la moneda del turista
// si Stripe la acepta; USDC siempre en dólares; PIX en reales; Mercado Pago en pesos.
export const STRIPE_CURRENCIES = ['USD', 'EUR', 'BRL', 'GBP'];

export function chargeCurrency(method: PayMethod, userCurrency: string) {
  if (method === 'mp') return 'ARS';
  if (method === 'stellar') return 'USD';
  if (method === 'pix') return 'BRL';
  return STRIPE_CURRENCIES.includes(userCurrency) ? userCurrency : 'USD';
}

export async function createPayment(o: Order): Promise<PayResult> {
  switch (o.method) {
    case 'mp':
      return mp.create(o);
    case 'stripe':
      return stripe.create(o);
    case 'stellar':
      return stellar.create(o);
    case 'pix':
      // PIX real necesita una cuenta en Brasil; en la demo siempre es simulado.
      return { url: demoUrl(o), live: false };
  }
}

export const methodLabel: Record<PayMethod, string> = {
  mp: 'Mercado Pago',
  stripe: 'Tarjeta (Stripe)',
  stellar: 'USDC (Stellar)',
  pix: 'PIX',
};
