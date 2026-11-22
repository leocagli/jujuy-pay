// Simulador web: el navegador abre un stream SSE por número de teléfono y manda mensajes por POST.
// Sirve para la demo en vivo aunque WhatsApp no ande.
import type { Response } from 'express';
import type { Out } from './index.js';

const streams = new Map<string, Set<Response>>();
const backlog = new Map<string, Out[]>(); // mensajes que llegaron sin pestaña abierta (ej. pago confirmado)

export function subscribe(phone: string, res: Response) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  if (!streams.has(phone)) streams.set(phone, new Set());
  streams.get(phone)!.add(res);
  for (const m of backlog.get(phone) ?? []) res.write(`data: ${JSON.stringify(m)}\n\n`);
  backlog.delete(phone);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  res.on('close', () => {
    clearInterval(ping);
    streams.get(phone)?.delete(res);
  });
}

export function send(phone: string, m: Out) {
  const subs = streams.get(phone);
  if (!subs || subs.size === 0) {
    backlog.set(phone, [...(backlog.get(phone) ?? []), m]);
    return;
  }
  for (const res of subs) res.write(`data: ${JSON.stringify(m)}\n\n`);
}
