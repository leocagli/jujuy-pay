import { connection, type NextRequest } from "next/server";

import { respondToCommand } from "@/lib/commands";
import { validateTwilioSignature } from "@/lib/twilio";

const XML_ENTITIES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => XML_ENTITIES[character]);
}

export async function POST(request: NextRequest) {
  await connection();
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL ?? request.url;

  if (!validateTwilioSignature({ signature, url: webhookUrl, params })) {
    return new Response("Firma inválida", { status: 403 });
  }

  const message = await respondToCommand(params.Body ?? "", params.From ?? "");
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
