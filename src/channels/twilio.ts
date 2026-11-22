// WhatsApp por Twilio (Sandbox o número aprobado). Entrada: webhook POST /webhooks/twilio. Salida: API REST.
import { config, live } from '../config.js';
import type { Out } from './index.js';

export async function send(phone: string, m: Out) {
  if (!live.twilio()) {
    console.log(`[twilio sin credenciales] -> ${phone}: ${m.text}`);
    return;
  }
  const form = new URLSearchParams({ From: config.twilio.from, To: `whatsapp:${phone}`, Body: m.text });
  // Twilio necesita una URL pública para la imagen; con localhost no la puede bajar.
  if (m.mediaUrl && !m.mediaUrl.includes('localhost')) form.set('MediaUrl', m.mediaUrl);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilio.sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${config.twilio.sid}:${config.twilio.token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${await r.text()}`);
}

// "whatsapp:+5493884123456" -> "+5493884123456"
export const phoneFrom = (from: string) => from.replace(/^whatsapp:/, '');
