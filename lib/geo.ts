import type { Point, Town } from "./types";

const EARTH_RADIUS_KM = 6371;
const TO_RAD = Math.PI / 180;

export const TRACK: readonly Point[] = [
  { lat: -24.1944, lng: -65.3211 },
  { lat: -23.7539, lng: -65.4647 },
  { lat: -23.6333, lng: -65.4 },
  { lat: -23.5782, lng: -65.3952 },
  { lat: -23.42, lng: -65.37 },
  { lat: -23.3036, lng: -65.3561 },
  { lat: -23.2054, lng: -65.3505 },
];

export const TOWNS: readonly Town[] = [
  { name: "Purmamarca", location: { lat: -23.7539, lng: -65.4647 }, population: 2600 },
  { name: "Tilcara", location: { lat: -23.5782, lng: -65.3952 }, population: 5640 },
  { name: "Humahuaca", location: { lat: -23.2054, lng: -65.3505 }, population: 11369 },
  { name: "Maimará", location: { lat: -23.6333, lng: -65.4 }, population: 2200 },
  { name: "Uquía", location: { lat: -23.3036, lng: -65.3561 }, population: 525 },
];

export function haversineKm(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * TO_RAD;
  const dLng = (b.lng - a.lng) * TO_RAD;
  const half =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * TO_RAD) * Math.cos(b.lat * TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(half)));
}

function project(point: Point, latitudeRad: number) {
  return {
    x: point.lng * TO_RAD * Math.cos(latitudeRad) * EARTH_RADIUS_KM,
    y: point.lat * TO_RAD * EARTH_RADIUS_KM,
  };
}

export function distanceToSegmentKm(point: Point, a: Point, b: Point): number {
  const latitudeRad = ((point.lat + a.lat + b.lat) / 3) * TO_RAD;
  const p = project(point, latitudeRad);
  const start = project(a, latitudeRad);
  const end = project(b, latitudeRad);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return haversineKm(point, a);

  const fraction = Math.max(
    0,
    Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / lengthSquared),
  );
  return Math.hypot(p.x - (start.x + fraction * dx), p.y - (start.y + fraction * dy));
}

export function distanceToTrackKm(point: Point, track: readonly Point[] = TRACK): number {
  let shortest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < track.length - 1; index += 1) {
    shortest = Math.min(shortest, distanceToSegmentKm(point, track[index], track[index + 1]));
  }
  return shortest;
}

export function trackLengthKm(track: readonly Point[] = TRACK): number {
  let total = 0;
  for (let index = 0; index < track.length - 1; index += 1) {
    total += haversineKm(track[index], track[index + 1]);
  }
  return total;
}

export function pointAlongTrack(progress: number, track: readonly Point[] = TRACK): Point {
  const bounded = Math.max(0, Math.min(1, progress));
  const lengths: number[] = [];
  for (let index = 0; index < track.length - 1; index += 1) {
    lengths.push(haversineKm(track[index], track[index + 1]));
  }
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = bounded * total;

  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const fraction = lengths[index] === 0 ? 0 : remaining / lengths[index];
      const from = track[index];
      const to = track[index + 1];
      return {
        lat: from.lat + (to.lat - from.lat) * fraction,
        lng: from.lng + (to.lng - from.lng) * fraction,
      };
    }
    remaining -= lengths[index];
  }

  return track[track.length - 1];
}

export function nearestTown(
  point: Point,
  towns: readonly Town[] = TOWNS,
): Town & { distanceKm: number } {
  return towns
    .map((town) => ({ ...town, distanceKm: haversineKm(point, town.location) }))
    .reduce((closest, candidate) =>
      candidate.distanceKm < closest.distanceKm ? candidate : closest,
    );
}

export function trackBounds(track: readonly Point[] = TRACK, paddingKm = 20) {
  const latitudes = track.map((point) => point.lat);
  const longitudes = track.map((point) => point.lng);
  const latitudePadding = paddingKm / 111.32;
  const meanLatitude = latitudes.reduce((sum, lat) => sum + lat, 0) / latitudes.length;
  const longitudePadding = paddingKm / (111.32 * Math.cos(meanLatitude * TO_RAD));

  return {
    south: Math.min(...latitudes) - latitudePadding,
    north: Math.max(...latitudes) + latitudePadding,
    west: Math.min(...longitudes) - longitudePadding,
    east: Math.max(...longitudes) + longitudePadding,
  };
}
