# Jujuy Pay

Chatbot de WhatsApp para que los turistas compren pasajes de bus, excursiones y entradas a eventos en Jujuy, y paguen en la moneda que tengan: pesos con Mercado Pago, tarjeta del exterior (USD, EUR, BRL, GBP), USDC en Stellar o PIX.

Track: **Open Innovation regional, Jujuy** (hackathon de Cursor).

## El problema

Jujuy recibe turistas de Brasil, Chile, Bolivia, Europa y EE.UU. que llegan sin pesos y sin Mercado Pago. Los operadores chicos (combis a Purmamarca, guías de Hornocal, peñas de Tilcara) cobran en efectivo o por transferencia, y pierden ventas. El turista ya tiene WhatsApp; no quiere bajarse otra app.

## La solución

1. El turista escribe al número de WhatsApp. El bot detecta idioma y moneda por el prefijo del teléfono (+55 → portugués y reales, +1 → inglés y dólares).
2. Elige pasaje, excursión o evento. Ve el precio en pesos y en su moneda, con el dólar MEP del día.
3. Elige cómo pagar: Mercado Pago, tarjeta del exterior, USDC o PIX.
4. Recibe el ticket con QR en el mismo chat.
5. Puede suscribirse a la agenda semanal de Jujuy. Los comercios locales patrocinan esa agenda: es el ingreso publicitario del producto.

## Cómo correrlo

Requiere Node 22 o más nuevo.

```bash
npm install
cp .env.example .env   # opcional: sin claves, todo corre en modo demo
npm run dev
```

- Simulador de chat: http://localhost:3000/sim.html (cambiá el país del turista arriba a la derecha)
- Panel de operadores y agenda patrocinada: http://localhost:3000/admin.html (clave: `ADMIN_TOKEN`, por defecto `jujuy`)
- Estado de cada integración: http://localhost:3000/health

### Modo demo y modo real

Cada medio de pago funciona sin claves: el link lleva a una página propia con el botón "Simular pago". Cuando cargás la clave en `.env`, ese medio pasa a la API real.

| Medio | Variable | Real |
|---|---|---|
| Mercado Pago (ARS) | `MP_ACCESS_TOKEN` (TEST-...) | Checkout Pro + webhook |
| Tarjeta del exterior | `STRIPE_SECRET_KEY` (sk_test_...) | Stripe Checkout en la moneda del turista |
| USDC en Stellar | `STELLAR_MERCHANT_ADDRESS` | QR SEP-7 con memo; Horizon confirma el pago solo |
| PIX | (siempre simulado) | Un PIX real necesita una cuenta en Brasil |

### WhatsApp con Twilio Sandbox

1. Creá una cuenta en Twilio y entrá a *Messaging → Try it out → Send a WhatsApp message*.
2. Desde tu celular, mandá el código `join ...` al número del sandbox.
3. Levantá un túnel: `cloudflared tunnel --url http://localhost:3000` y copiá la URL `https://....trycloudflare.com` en `PUBLIC_URL`.
4. En *Sandbox settings*, "When a message comes in": `PUBLIC_URL/webhooks/twilio` (POST).
5. Cargá `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` en `.env` y reiniciá.

## Estructura (para repartir el trabajo)

```
src/
  server.ts          rutas HTTP: webhooks, simulador, checkout, tickets, panel
  bot/engine.ts      máquina de estados de la conversación (menús numerados)
  i18n.ts            textos en es/en/pt + idioma y moneda por prefijo
  catalog.ts         pasajes, excursiones y eventos (precios en ARS)
  fx.ts              cotizaciones: dólar MEP (dolarapi.com) y cruces (open.er-api.com)
  channels/          twilio.ts (WhatsApp), web.ts (simulador por SSE)
  payments/          mercadopago.ts, stripe.ts, stellar.ts; index.ts elige el medio
  orders.ts          markPaid(): confirma la orden y manda el ticket
  newsletter.ts      agenda semanal y envío patrocinado (solo con opt-in)
  pages.ts           páginas de checkout y ticket
  store.ts           persistencia en data/db.json
public/
  sim.html           simulador de WhatsApp para la demo
  admin.html         panel de operadores
```

Para trabajar en paralelo sin pisarse:

- **Bot y textos**: `bot/engine.ts`, `i18n.ts`, `catalog.ts`
- **Pagos**: `payments/*`, rutas `/pay/*` y `/webhooks/*` en `server.ts`
- **Panel, agenda y pitch**: `public/admin.html`, `newsletter.ts`, `pages.ts`

Trabajen en ramas y abran PR contra `main`.

## Reglas de WhatsApp para la agenda

Solo le llega la agenda a quien respondió SI. Cada envío dice cómo darse de baja (BAJA, STOP o SAIR). Fuera de las 24 horas desde el último mensaje del turista, WhatsApp exige plantillas aprobadas por Meta; en producción la agenda se manda con una plantilla de marketing.
