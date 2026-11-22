import { connection } from "next/server";

import { buildAlerts } from "@/lib/alerts";

export async function GET() {
  await connection();
  const now = new Date();
  return Response.json({ alerts: await buildAlerts(now), generatedAt: now.toISOString() });
}
