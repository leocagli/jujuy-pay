import { createHmac, timingSafeEqual } from "node:crypto";

const TWILIO_MESSAGES_URL = "https://api.twilio.com/2010-04-01/Accounts";

export function validateTwilioSignature(input: {
  signature: string;
  url: string;
  params: Record<string, string>;
  authToken?: string;
}): boolean {
  const authToken = input.authToken ?? process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !input.signature) return false;

  const sorted = Object.keys(input.params)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}${input.params[key] ?? ""}`)
    .join("");
  const expected = createHmac("sha1", authToken)
    .update(`${input.url}${sorted}`)
    .digest("base64");

  const received = Buffer.from(input.signature);
  const calculated = Buffer.from(expected);
  if (received.length !== calculated.length) return false;
  return timingSafeEqual(received, calculated);
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!accountSid || !authToken || !from) {
    throw new Error("Faltan credenciales de Twilio");
  }

  const response = await fetch(
    `${TWILIO_MESSAGES_URL}/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) throw new Error(`Twilio respondió ${response.status}`);
}
