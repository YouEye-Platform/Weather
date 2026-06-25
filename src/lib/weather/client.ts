import type { GeocodingResult, WeatherData } from "./types";
import { internetFetch } from "@/lib/internet";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** In-process cache: key = "lat,lon" (2 decimals), value = { data, fetchedAt } */
const weatherCache = new Map<string, { data: WeatherData; fetchedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 200;

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function evictStaleEntries(): void {
  if (weatherCache.size <= MAX_CACHE_ENTRIES) return;
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const [key, entry] of weatherCache.entries()) {
    if (entry.fetchedAt < cutoff) weatherCache.delete(key);
  }
}

export async function searchLocations(
  q: string,
  language = "en",
  userId?: string,
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    name: q,
    count: "10",
    language,
    format: "json",
  });
  const res = await internetFetch(`${GEOCODING_URL}?${params}`, {}, userId);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []) as GeocodingResult[];
}

export async function fetchWeather(
  lat: number,
  lon: number,
  timezone: string,
  temperatureUnit: "celsius" | "fahrenheit" = "celsius",
  windSpeedUnit: "kmh" | "mph" | "ms" | "knots" = "kmh",
  precipitationUnit: "mm" | "inch" = "mm",
  userId?: string,
): Promise<WeatherData | null> {
  const key = cacheKey(lat, lon);
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone,
    temperature_unit: temperatureUnit,
    wind_speed_unit: windSpeedUnit,
    precipitation_unit: precipitationUnit,
    current: [
      "temperature_2m", "relative_humidity_2m", "apparent_temperature",
      "is_day", "precipitation", "rain", "showers", "snowfall",
      "weather_code", "cloud_cover", "pressure_msl", "surface_pressure",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
    ].join(","),
    hourly: [
      "temperature_2m", "relative_humidity_2m", "apparent_temperature",
      "precipitation_probability", "precipitation", "weather_code",
      "wind_speed_10m", "is_day",
    ].join(","),
    daily: [
      "weather_code", "temperature_2m_max", "temperature_2m_min",
      "apparent_temperature_max", "apparent_temperature_min",
      "sunrise", "sunset", "uv_index_max", "precipitation_sum",
      "precipitation_probability_max", "wind_speed_10m_max",
    ].join(","),
    forecast_days: "7",
  });

  try {
    const res = await internetFetch(`${FORECAST_URL}?${params}`, {}, userId);
    if (!res.ok) return null;
    const raw = await res.json();

    const data: WeatherData = {
      current: {
        temperature: raw.current.temperature_2m,
        apparent_temperature: raw.current.apparent_temperature,
        humidity: raw.current.relative_humidity_2m,
        weather_code: raw.current.weather_code,
        is_day: raw.current.is_day === 1,
        wind_speed: raw.current.wind_speed_10m,
        wind_direction: raw.current.wind_direction_10m,
        wind_gusts: raw.current.wind_gusts_10m,
        cloud_cover: raw.current.cloud_cover,
        pressure: raw.current.pressure_msl,
        precipitation: raw.current.precipitation,
      },
      hourly: raw.hourly as WeatherData["hourly"],
      daily: raw.daily as WeatherData["daily"],
      timezone: raw.timezone,
    };

    evictStaleEntries();
    weatherCache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  }
}
