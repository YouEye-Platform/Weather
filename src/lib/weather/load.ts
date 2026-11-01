import type { UserPreferences, WeatherData } from "./types";

export interface CurrentData {
  location_name: string;
  current: WeatherData["current"];
  temperature: string;
  feels_like: string;
  condition: string;
  icon: string;
  wind: string;
  prefs: UserPreferences;
}

export interface ForecastData {
  daily: WeatherData["daily"];
  hourly: WeatherData["hourly"];
  timezone: string;
}

interface WeatherHandlers {
  onCurrent: (data: CurrentData | null) => void;
  onCurrentError: () => void;
  onCurrentSettled: () => void;
  onForecast: (data: ForecastData) => void;
  onForecastError: () => void;
}

/** Load each surface independently; an optional forecast never hides current data.
 * The request's shared signal also guards callbacks after response decoding, since
 * an older location's response may finish even when its transport ignores abort.
 */
export async function loadWeather(
  params: URLSearchParams,
  signal: AbortSignal,
  handlers: WeatherHandlers,
  fetchWeather: typeof fetch = fetch,
): Promise<void> {
  if (signal.aborted) return;

  const current = async () => {
    try {
      const response = await fetchWeather(`/api/weather/current?${params}`, { signal });
      if (!response.ok) throw new Error("Current request failed");
      const result = await response.json();
      if (!signal.aborted) handlers.onCurrent(result.data ?? null);
    } catch {
      if (!signal.aborted) handlers.onCurrentError();
    } finally {
      if (!signal.aborted) handlers.onCurrentSettled();
    }
  };

  const forecast = async () => {
    try {
      const response = await fetchWeather(`/api/weather/forecast?${params}`, { signal });
      if (!response.ok) throw new Error("Forecast request failed");
      const result = await response.json();
      if (!result.data) throw new Error("Forecast data missing");
      if (!signal.aborted) handlers.onForecast({
        daily: result.data.daily,
        hourly: result.data.hourly,
        timezone: result.data.timezone ?? "UTC",
      });
    } catch {
      if (!signal.aborted) handlers.onForecastError();
    }
  };

  await Promise.all([current(), forecast()]);
}
