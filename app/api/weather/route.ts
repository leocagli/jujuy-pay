import { connection, type NextRequest } from "next/server";

import { TOWNS } from "@/lib/geo";
import { getWeatherForTown } from "@/lib/weather";

export async function GET(request: NextRequest) {
  await connection();
  const requested = request.nextUrl.searchParams.get("town");
  if (!requested) {
    return Response.json({ error: "Falta el parámetro town" }, { status: 400 });
  }

  const town = TOWNS.find((candidate) => candidate.name.toLowerCase() === requested.toLowerCase());
  if (!town) {
    return Response.json({ error: `Pueblo desconocido: ${requested}` }, { status: 404 });
  }

  return Response.json(await getWeatherForTown(town));
}
