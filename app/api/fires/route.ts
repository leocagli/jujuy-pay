import { connection } from "next/server";

import { getFires } from "@/lib/firms";

export async function GET() {
  await connection();
  return Response.json(await getFires());
}
