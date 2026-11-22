import { readFileSync } from "node:fs";
import path from "node:path";

import { cacheLife, cacheTag } from "next/cache";

import { TRACK, trackBounds } from "./geo";
import type { DataSourceMode, FiresResponse, FireHotspot, Point } from "./types";

const FIXTURE_PATH = path.join(process.cwd(), "data", "fixtures", "firms.csv");
const FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

type Bounds = ReturnType<typeof trackBounds>;

function parseCsv(csv: string): Record<string, string>[] {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(",").map((column) => column.trim());
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(",").map((value) => value.trim());
      return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
    });
}

function toHotspot(row: Record<string, string>): FireHotspot | null {
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const time = (row.acq_time ?? "0000").padStart(4, "0");
  const detected = new Date(`${row.acq_date}T${time.slice(0, 2)}:${time.slice(2)}:00-03:00`);
  if (Number.isNaN(detected.getTime())) return null;

  const frp = row.frp ? Number(row.frp) : Number.NaN;
  return {
    id: `${row.satellite ?? "sat"}-${row.acq_date ?? "unknown"}-${time}-${lat}-${lng}`,
    location: { lat, lng },
    detectedAt: detected.toISOString(),
    confidence: row.confidence || "n/a",
    frp: Number.isFinite(frp) ? frp : null,
  };
}

function insideBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  );
}

async function fetchFirms(url: string): Promise<string> {
  "use cache";
  cacheLife({ revalidate: 3600 });
  cacheTag("fires");
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`FIRMS respondió ${response.status}`);
  return response.text();
}

export async function getFires(now: Date = new Date()): Promise<FiresResponse> {
  const bounds = trackBounds(TRACK, 30);
  const mapKey = process.env.FIRMS_MAP_KEY;
  let csv: string;
  let source: DataSourceMode = "live";

  if (mapKey) {
    const area = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
    const url = `${FIRMS_URL}/${encodeURIComponent(mapKey)}/VIIRS_SNPP_NRT/${area}/1`;
    try {
      csv = await fetchFirms(url);
    } catch {
      csv = readFileSync(FIXTURE_PATH, "utf8");
      source = "fixture";
    }
  } else {
    csv = readFileSync(FIXTURE_PATH, "utf8");
    source = "fixture";
  }

  const fires = parseCsv(csv)
    .map(toHotspot)
    .filter((hotspot): hotspot is FireHotspot => hotspot !== null)
    .filter((hotspot) => insideBounds(hotspot.location, bounds))
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

  return { fires, source, fetchedAt: now.toISOString() };
}
