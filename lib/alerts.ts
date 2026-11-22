import { fireAlerts, floodAlerts, crowdingAlerts, sortAlerts } from "./alert-rules";
import { getFires } from "./firms";
import { TOWNS } from "./geo";
import { getTelemetry } from "./telemetry";
import type { Alert, Town, WeatherResponse } from "./types";
import { getWeatherForTown } from "./weather";

export async function buildAlerts(now: Date = new Date()): Promise<Alert[]> {
  const weather = await Promise.all(
    TOWNS.map(async (town) => {
      try {
        return { town, weather: await getWeatherForTown(town, now) };
      } catch {
        return null;
      }
    }),
  );
  const availableWeather = weather.filter(
    (entry): entry is { town: Town; weather: WeatherResponse } => entry !== null,
  );

  const [firesResult] = await Promise.all([getFires(now).catch(() => null)]);
  const telemetry = getTelemetry(now);

  return sortAlerts([
    ...floodAlerts(availableWeather, now),
    ...fireAlerts(firesResult?.fires ?? [], now),
    ...crowdingAlerts(telemetry, now),
  ]);
}
