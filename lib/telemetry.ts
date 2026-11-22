import { pointAlongTrack, TOWNS } from "./geo";
import type { TelemetryResponse, TownOccupancy } from "./types";

const CYCLE_MS = 8 * 60 * 1000;
const BASE_OCCUPANCY: Record<string, number> = {
  Purmamarca: 92,
  Tilcara: 85,
  Humahuaca: 64,
  Maimará: 38,
  Uquía: 21,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function getTelemetry(now: Date = new Date()): TelemetryResponse {
  const progress = (now.getTime() % CYCLE_MS) / CYCLE_MS;
  const angle = progress * Math.PI * 2;
  const occupancy: TownOccupancy[] = TOWNS.map((town, index) => ({
    town: town.name,
    occupancyPct: Math.round(
      clamp((BASE_OCCUPANCY[town.name] ?? 30) + Math.sin(angle + index) * 4, 5, 100),
    ),
  }));
  const leastCrowded = [...occupancy].sort((a, b) => a.occupancyPct - b.occupancyPct)[0];

  return {
    train: {
      location: pointAlongTrack(progress),
      passengers: Math.round(118 + Math.sin(angle + 2) * 9),
      solarKw: Number((38 + Math.sin(angle) * 6).toFixed(1)),
      batteryPct: Math.round(78 + Math.sin(angle + 1) * 4),
      progress: Number(progress.toFixed(4)),
    },
    occupancy: occupancy.map((item) => ({
      ...item,
      ...(item.occupancyPct >= 90
        ? { alternativeTown: leastCrowded.town === item.town ? undefined : leastCrowded.town }
        : {}),
    })),
    updatedAt: now.toISOString(),
  };
}
