// Un canal sabe mandar mensajes a un usuario. El bot no sabe si habla por WhatsApp o por el simulador web.
import type { User } from '../store.js';
import * as twilio from './twilio.js';
import * as web from './web.js';

export interface Out {
  text: string;
  mediaUrl?: string;
}

export async function send(user: User, msgs: Out[]) {
  for (const m of msgs) {
    try {
      if (user.channel === 'twilio') await twilio.send(user.phone, m);
      else web.send(user.phone, m);
    } catch (e) {
      console.error(`[send ${user.id}]`, (e as Error).message);
    }
  }
}
