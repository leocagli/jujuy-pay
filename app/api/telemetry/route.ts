import { connection } from "next/server";

import { getTelemetry } from "@/lib/telemetry";

export async function GET() {
  await connection();
  return Response.json(getTelemetry());
}
