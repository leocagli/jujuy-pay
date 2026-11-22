import { connection } from "next/server";

import { TOWNS } from "@/lib/geo";
import { isValidPhone, maskPhone, normalizePhone, subscribe } from "@/lib/subscribers";
import type { SubscribeRequest, SubscribeResponse } from "@/lib/types";

export async function POST(request: Request) {
  await connection();
  let body: SubscribeRequest;
  try {
    body = (await request.json()) as SubscribeRequest;
  } catch {
    return Response.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  if (!body || typeof body.phone !== "string" || typeof body.town !== "string") {
    return Response.json({ error: "Se requieren phone y town" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone);
  if (!isValidPhone(phone)) {
    return Response.json({ error: "El teléfono debe estar en formato E.164" }, { status: 400 });
  }

  const town = TOWNS.find((candidate) => candidate.name.toLowerCase() === body.town.toLowerCase());
  if (!town) {
    return Response.json({ error: `Pueblo desconocido: ${body.town}` }, { status: 404 });
  }

  subscribe(phone, town.name);
  const response: SubscribeResponse = { ok: true, phone: maskPhone(phone), town: town.name };
  return Response.json(response);
}
