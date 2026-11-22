import { distanceToTrackKm, nearestTown, TOWNS } from "./geo";
import type {
  Alert,
  AlertKind,
  FireHotspot,
  Point,
  Severity,
  TelemetryResponse,
  Town,
  WeatherResponse,
} from "./types";

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createAlert(
  input: {
    kind: AlertKind;
    severity: Severity;
    town: string;
    message: string;
    location: Point;
    source: Alert["source"];
  },
  now: Date,
): Alert {
  return {
    ...input,
    id: `alert-${input.kind}-${slug(input.town)}-${Math.floor(now.getTime() / 60000)}`,
    issuedAt: now.toISOString(),
  };
}

export function floodAlerts(
  entries: { town: Town; weather: WeatherResponse }[],
  now: Date = new Date(),
): Alert[] {
  return entries
    .filter(({ weather }) => weather.next6hPrecipitationMm > 10)
    .map(({ town, weather }) =>
      createAlert(
        {
          kind: "flood",
          severity: weather.next6hPrecipitationMm > 20 ? "critical" : "warning",
          town: town.name,
          message: `Lluvia prevista de ${weather.next6hPrecipitationMm} mm en las próximas 6 horas`,
          location: town.location,
          source: "open-meteo",
        },
        now,
      ),
    );
}

export function fireAlerts(fires: FireHotspot[], now: Date = new Date()): Alert[] {
  const byTown = new Map<string, { alert: Alert; distanceKm: number }>();

  for (const fire of fires) {
    const nearest = nearestTown(fire.location);
    const trackDistance = distanceToTrackKm(fire.location);
    if (nearest.distanceKm > 10 && trackDistance > 10) continue;

    const severity: Severity = nearest.distanceKm < 3 || trackDistance < 3 ? "critical" : "warning";
    const previous = byTown.get(nearest.name);
    if (
      previous &&
      (SEVERITY_RANK[severity] > SEVERITY_RANK[previous.alert.severity] ||
        (SEVERITY_RANK[severity] === SEVERITY_RANK[previous.alert.severity] &&
          nearest.distanceKm >= previous.distanceKm))
    ) {
      continue;
    }

    byTown.set(nearest.name, {
      distanceKm: nearest.distanceKm,
      alert: createAlert(
        {
          kind: "fire",
          severity,
          town: nearest.name,
          message: `Foco de calor a ${nearest.distanceKm.toFixed(1)} km de ${nearest.name}`,
          location: fire.location,
          source: "firms",
        },
        now,
      ),
    });
  }

  return [...byTown.values()].map(({ alert }) => alert);
}

export function crowdingAlerts(telemetry: TelemetryResponse, now: Date = new Date()): Alert[] {
  return telemetry.occupancy
    .filter((item) => item.occupancyPct >= 90)
    .map((item) => {
      const town = TOWNS.find((candidate) => candidate.name === item.town);
      return createAlert(
        {
          kind: "crowding",
          severity: "info",
          town: item.town,
          message: `Ocupación del ${item.occupancyPct}%. Considerá ${item.alternativeTown ?? "otro pueblo"}.`,
          location: town?.location ?? { lat: 0, lng: 0 },
          source: "telemetry",
        },
        now,
      );
    });
}

export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      b.issuedAt.localeCompare(a.issuedAt) ||
      a.town.localeCompare(b.town),
  );
}
