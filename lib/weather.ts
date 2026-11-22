import { cacheLife, cacheTag } from "next/cache";

import fixture from "@/data/fixtures/open-meteo.json";

import type { DataSourceMode, Town, WeatherHour, WeatherResponse } from "./types";

interface OpenMeteoPayload {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    precipitation: number[];
    wind_speed_10m: number[];
    temperature_2m: number[];
  };
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIME_ZONE = "America/Argentina/Jujuy";

function localHour(now: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(now)
    .replace(" ", "T")
    .slice(0, 16);
}

function toHours(payload: OpenMeteoPayload, now: Date): WeatherHour[] {
  const { time, precipitation, wind_speed_10m, temperature_2m } = payload.hourly;
  const currentHour = localHour(now);
  const found = time.findIndex((value) => value.slice(0, 16) >= currentHour);
  const start = Math.max(0, found);

  return time.slice(start, start + 6).map((value, offset) => ({
    time: value,
    precipitationMm: precipitation[start + offset] ?? 0,
    windKph: wind_speed_10m[start + offset] ?? 0,
    temperatureC: temperature_2m[start + offset] ?? 0,
  }));
}

async function fetchForecast(url: string): Promise<OpenMeteoPayload> {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag("weather");
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`);
  return (await response.json()) as OpenMeteoPayload;
}

export async function getWeatherForTown(town: Town, now: Date = new Date()): Promise<WeatherResponse> {
  let payload: OpenMeteoPayload;
  let source: DataSourceMode = "live";

  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(town.location.lat));
  url.searchParams.set("longitude", String(town.location.lng));
  url.searchParams.set("hourly", "precipitation,wind_speed_10m,temperature_2m");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", TIME_ZONE);

  try {
    payload = await fetchForecast(url.toString());
  } catch {
    payload = fixture as OpenMeteoPayload;
    source = "fixture";
  }

  const hours = toHours(payload, now);
  const total = hours.reduce((sum, hour) => sum + hour.precipitationMm, 0);

  return {
    town: town.name,
    location: town.location,
    hours,
    next6hPrecipitationMm: Number(total.toFixed(1)),
    source,
    fetchedAt: now.toISOString(),
  };
}
