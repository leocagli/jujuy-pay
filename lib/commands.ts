import { buildAlerts } from "./alerts";
import { TOWNS } from "./geo";
import { hasSubscription, normalizePhone, subscribe, unsubscribe } from "./subscribers";
import type { Alert } from "./types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findTown(value: string) {
  return TOWNS.find((town) => normalize(town.name) === normalize(value));
}

function formatAlerts(alerts: Alert[]): string {
  if (alerts.length === 0) return "No hay alertas activas en este momento.";
  return alerts.slice(0, 5).map((alert) => `[${alert.severity}] ${alert.town}: ${alert.message}`).join("\n");
}

export async function respondToCommand(body: string, from: string): Promise<string> {
  const parts = body.trim().split(/\s+/).filter(Boolean);
  const command = (parts[0] ?? "").toLowerCase();
  const argument = parts.slice(1).join(" ");

  if (command === "alertas") {
    const alerts = await buildAlerts();
    const town = argument ? findTown(argument) : undefined;
    if (argument && !town) return `No conozco el pueblo ${argument}. Probá con: ${TOWNS.map((item) => item.name).join(", ")}.`;
    return formatAlerts(town ? alerts.filter((alert) => alert.town === town.name) : alerts);
  }

  if (command === "suscribir") {
    const town = findTown(argument);
    if (!town) return "Escribí: suscribir <pueblo>. Pueblos: " + TOWNS.map((item) => item.name).join(", ") + ".";
    subscribe(from, town.name);
    return `Listo: recibirás alertas de ${town.name}.`;
  }

  if (command === "baja") {
    if (!hasSubscription(from)) return "No tenías una suscripción activa.";
    unsubscribe(normalizePhone(from));
    return "Te diste de baja del servicio de alertas.";
  }

  return "Comandos: alertas, alertas <pueblo>, suscribir <pueblo>, baja.";
}
