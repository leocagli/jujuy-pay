// Agenda semanal con espacio patrocinado. Solo se manda a quien aceptó explícitamente (opt-in) y
// cualquiera se da de baja con BAJA/STOP/SAIR. Fuera de la ventana de 24 h, WhatsApp exige plantillas aprobadas por Meta.
import { byCategory, type Lang } from './catalog.js';
import { send } from './channels/index.js';
import { t } from './i18n.js';
import { broadcasts, users } from './store.js';

export function agenda(lang: Lang) {
  const lines = byCategory('event').map((e) => `• *${e.name}*: ${e.desc[lang]}`);
  return `${t(lang, 'agendaHead')}\n${lines.join('\n')}`;
}

export async function broadcast(sponsor: string, text: string) {
  const subs = users.all().filter((u) => u.subscribed);
  for (const u of subs) {
    const head = sponsor ? `📰 ${t(u.lang, 'agendaHead')}\n_${t(u.lang, 'sponsored')} ${sponsor}_` : `📰 ${t(u.lang, 'agendaHead')}`;
    await send(u, [{ text: `${head}\n\n${text}\n\n${t(u.lang, 'broadcastFoot')}` }]);
  }
  broadcasts.add({ at: new Date().toISOString(), sponsor, text, sent: subs.length });
  return subs.length;
}
