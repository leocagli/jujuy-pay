import type { Lang } from './catalog.js';

// Idioma y moneda según el prefijo del teléfono del turista.
const PREFIXES: [string, Lang, string][] = [
  ['+54', 'es', 'ARS'],
  ['+55', 'pt', 'BRL'],
  ['+56', 'es', 'CLP'],
  ['+591', 'es', 'BOB'],
  ['+598', 'es', 'UYU'],
  ['+51', 'es', 'PEN'],
  ['+34', 'es', 'EUR'],
  ['+351', 'pt', 'EUR'],
  ['+33', 'en', 'EUR'],
  ['+49', 'en', 'EUR'],
  ['+39', 'en', 'EUR'],
  ['+44', 'en', 'GBP'],
  ['+1', 'en', 'USD'],
];

export function detectLocale(phone: string): { lang: Lang; currency: string } {
  const p = phone.startsWith('+') ? phone : '+' + phone;
  const hit = [...PREFIXES].sort((a, b) => b[0].length - a[0].length).find(([pre]) => p.startsWith(pre));
  return hit ? { lang: hit[1], currency: hit[2] } : { lang: 'en', currency: 'USD' };
}

const S = {
  welcome: {
    es: '¡Hola! 👋 Soy *Jujuy Pay*. Comprá pasajes, excursiones y entradas en Jujuy y pagá como quieras: Mercado Pago, tarjeta del exterior, USDC o PIX.',
    en: 'Hi! 👋 I am *Jujuy Pay*. Buy bus tickets, tours and event passes in Jujuy and pay your way: Mercado Pago, foreign card, USDC or PIX.',
    pt: 'Olá! 👋 Eu sou o *Jujuy Pay*. Compre passagens, passeios e ingressos em Jujuy e pague como quiser: Mercado Pago, cartão estrangeiro, USDC ou PIX.',
  },
  menu: {
    es: '*¿Qué necesitás?*\n1️⃣ Pasajes de bus 🚌\n2️⃣ Excursiones 🏔️\n3️⃣ Eventos 🎉\n4️⃣ Agenda y promos de la semana 📰\n\nRespondé con el número. Escribí *IDIOMA* para cambiar de idioma.',
    en: '*What do you need?*\n1️⃣ Bus tickets 🚌\n2️⃣ Tours 🏔️\n3️⃣ Events 🎉\n4️⃣ This week\'s agenda and deals 📰\n\nReply with the number. Type *LANGUAGE* to switch language.',
    pt: '*Do que você precisa?*\n1️⃣ Passagens de ônibus 🚌\n2️⃣ Passeios 🏔️\n3️⃣ Eventos 🎉\n4️⃣ Agenda e promoções da semana 📰\n\nResponda com o número. Escreva *IDIOMA* para trocar o idioma.',
  },
  pickItem: {
    es: 'Elegí una opción (0 para volver):',
    en: 'Pick an option (0 to go back):',
    pt: 'Escolha uma opção (0 para voltar):',
  },
  askQty: {
    es: '¿Cuántos? Respondé un número del 1 al 10.',
    en: 'How many? Reply with a number from 1 to 10.',
    pt: 'Quantos? Responda um número de 1 a 10.',
  },
  summary: { es: '*Tu compra*', en: '*Your order*', pt: '*Seu pedido*' },
  total: { es: 'Total', en: 'Total', pt: 'Total' },
  rateNote: { es: 'Cotización', en: 'Rate', pt: 'Cotação' },
  payMenu: {
    es: '*¿Cómo pagás?*\n1️⃣ Mercado Pago (pesos)\n2️⃣ Tarjeta del exterior ({cur})\n3️⃣ USDC en Stellar (dólar digital)\n4️⃣ PIX (reales)',
    en: '*How do you want to pay?*\n1️⃣ Mercado Pago (pesos)\n2️⃣ Foreign card ({cur})\n3️⃣ USDC on Stellar (digital dollar)\n4️⃣ PIX (reais)',
    pt: '*Como você quer pagar?*\n1️⃣ Mercado Pago (pesos)\n2️⃣ Cartão estrangeiro ({cur})\n3️⃣ USDC na Stellar (dólar digital)\n4️⃣ PIX (reais)',
  },
  payLink: {
    es: '💳 Pagá *{amount}* acá:\n{url}\n\nOrden *{id}*. Te mando el ticket apenas se acredite.',
    en: '💳 Pay *{amount}* here:\n{url}\n\nOrder *{id}*. I will send your ticket as soon as it clears.',
    pt: '💳 Pague *{amount}* aqui:\n{url}\n\nPedido *{id}*. Envio o ingresso assim que o pagamento for confirmado.',
  },
  demoNote: {
    es: '_(Modo demo: el pago es simulado.)_',
    en: '_(Demo mode: payment is simulated.)_',
    pt: '_(Modo demo: o pagamento é simulado.)_',
  },
  waiting: {
    es: 'Estoy esperando el pago de la orden *{id}*:\n{url}\n\nEscribí *MENU* para empezar otra compra.',
    en: 'Waiting for payment of order *{id}*:\n{url}\n\nType *MENU* to start another purchase.',
    pt: 'Aguardando o pagamento do pedido *{id}*:\n{url}\n\nEscreva *MENU* para começar outra compra.',
  },
  paid: {
    es: '✅ ¡Pago recibido! Acá está tu ticket de *{item}* x{qty}.\nOrden *{id}*. Mostrá el QR al subir o en la entrada.',
    en: '✅ Payment received! Here is your ticket for *{item}* x{qty}.\nOrder *{id}*. Show the QR when boarding or at the door.',
    pt: '✅ Pagamento recebido! Aqui está seu ingresso de *{item}* x{qty}.\nPedido *{id}*. Mostre o QR no embarque ou na entrada.',
  },
  optinAsk: {
    es: '📰 ¿Querés recibir la agenda de la semana en Jujuy (eventos, ferias y promos de comercios locales)? Respondé *SI* o *NO*. Podés darte de baja cuando quieras con *BAJA*.',
    en: '📰 Want this week\'s Jujuy agenda (events, fairs and local deals)? Reply *YES* or *NO*. Unsubscribe anytime with *STOP*.',
    pt: '📰 Quer receber a agenda da semana em Jujuy (eventos, feiras e promoções locais)? Responda *SIM* ou *NÃO*. Cancele quando quiser com *SAIR*.',
  },
  optinYes: {
    es: '¡Listo! Te llega la agenda cada semana. Escribí *BAJA* para no recibir más.',
    en: 'Done! You will get the agenda every week. Type *STOP* to unsubscribe.',
    pt: 'Pronto! Você vai receber a agenda toda semana. Escreva *SAIR* para cancelar.',
  },
  optinNo: { es: 'Ok, no te escribo con promos.', en: 'Ok, no promos then.', pt: 'Ok, sem promoções.' },
  alreadySub: {
    es: 'Ya estás suscripto a la agenda. Escribí *BAJA* para salir.',
    en: 'You are already subscribed. Type *STOP* to leave.',
    pt: 'Você já está inscrito. Escreva *SAIR* para cancelar.',
  },
  unsub: {
    es: 'Te diste de baja de la agenda. No te vamos a mandar más promos.',
    en: 'You have unsubscribed. No more promos.',
    pt: 'Inscrição cancelada. Sem mais promoções.',
  },
  langMenu: {
    es: 'Elegí idioma:\n1️⃣ Español\n2️⃣ English\n3️⃣ Português',
    en: 'Choose language:\n1️⃣ Español\n2️⃣ English\n3️⃣ Português',
    pt: 'Escolha o idioma:\n1️⃣ Español\n2️⃣ English\n3️⃣ Português',
  },
  invalid: {
    es: 'No te entendí 🙈. Respondé con un número de la lista o escribí *MENU*.',
    en: 'Sorry, I did not get that 🙈. Reply with a number from the list or type *MENU*.',
    pt: 'Não entendi 🙈. Responda com um número da lista ou escreva *MENU*.',
  },
  payError: {
    es: 'No pude generar el link de pago ({err}). Probá con otro medio.',
    en: 'Could not create the payment link ({err}). Try another method.',
    pt: 'Não consegui gerar o link de pagamento ({err}). Tente outro meio.',
  },
  agendaHead: {
    es: '*Esta semana en Jujuy* 📅',
    en: '*This week in Jujuy* 📅',
    pt: '*Esta semana em Jujuy* 📅',
  },
  broadcastFoot: {
    es: 'Respondé *MENU* para comprar o *BAJA* para no recibir más.',
    en: 'Reply *MENU* to buy or *STOP* to unsubscribe.',
    pt: 'Responda *MENU* para comprar ou *SAIR* para cancelar.',
  },
  sponsored: { es: 'Patrocinado por', en: 'Sponsored by', pt: 'Patrocinado por' },
} satisfies Record<string, Record<Lang, string>>;

export type Key = keyof typeof S;

export function t(lang: Lang, key: Key, vars: Record<string, string | number> = {}) {
  return S[key][lang].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
