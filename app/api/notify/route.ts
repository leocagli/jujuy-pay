import { connection } from "next/server";

import { subscribersForTown } from "@/lib/subscribers";
import { sendWhatsAppMessage } from "@/lib/twilio";
import type { Alert, NotifyRequest, NotifyResponse } from "@/lib/types";

export async function POST(request: Request) {
  await connection();
  let body: NotifyRequest;
  try {
    body = (await request.json()) as NotifyRequest;
  } catch {
    return Response.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const alert = body?.alert as Alert | undefined;
  if (!alert || typeof alert.town !== "string" || typeof alert.message !== "string") {
    return Response.json({ error: "Se requiere una alerta con town y message" }, { status: 400 });
  }

  const recipients = subscribersForTown(alert.town);
  if (recipients.length === 0) {
    const response: NotifyResponse = { recipients: 0, sent: 0, failed: 0 };
    return Response.json(response);
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM) {
    return Response.json({ error: "Faltan credenciales de Twilio" }, { status: 503 });
  }

  const results = await Promise.allSettled(
    recipients.map((subscriber) =>
      sendWhatsAppMessage(subscriber.phone, `[${alert.severity}] ${alert.message}`),
    ),
  );
  const sent = results.filter((result) => result.status === "fulfilled").length;
  const response: NotifyResponse = {
    recipients: recipients.length,
    sent,
    failed: recipients.length - sent,
  };
  return Response.json(response);
}
