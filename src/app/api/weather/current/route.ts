import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/migrate";
import { fetchWeather } from "@/lib/weather/client";
import { formatTemperature, formatWindSpeed } from "@/lib/weather/units";
import { getWeatherCondition } from "@/lib/weather/codes";
import { emitWeatherCheckEvent } from "@/lib/timeline/emit";
import { query } from "@/lib/db/client";
import { resolveWeatherDataUserId } from "@/lib/weather/user-id";
import type { UserPreferences, SavedLocation } from "@/lib/weather/types";

export async function GET(request: NextRequest) {
  const session = await getSession("ye-weather");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const dataUserId = await resolveWeatherDataUserId(session.userId);

  const { searchParams } = new URL(request.url);
  let lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null;
  let lon = searchParams.get("lon") ? parseFloat(searchParams.get("lon")!) : null;
  let tz = searchParams.get("tz") ?? "UTC";
  let locationId = searchParams.get("location_id") ?? null;
  let locationName = searchParams.get("location_name") ?? "Unknown";

  // Get user preferences
  const prefsResult = await query<UserPreferences>(
    `SELECT temperature_unit, wind_speed_unit, precipitation_unit, default_location_id
     FROM user_preferences WHERE user_id = $1`,
    [dataUserId]
  );
  const prefs: UserPreferences = prefsResult.rows[0] ?? {
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    default_location_id: null,
  };

  // If no lat/lon provided, use default location
  if (lat === null || lon === null) {
    const defaultId = prefs.default_location_id;
    if (!defaultId) {
      return NextResponse.json({ data: null, message: "No default location set" });
    }
    const locResult = await query<SavedLocation>(
      `SELECT * FROM saved_locations WHERE id = $1 AND user_id = $2`,
      [defaultId, dataUserId]
    );
    if (!locResult.rows[0]) {
      return NextResponse.json({ data: null, message: "Default location not found" });
    }
    const loc = locResult.rows[0];
    lat = loc.latitude;
    lon = loc.longitude;
    tz = loc.timezone;
    locationId = loc.id;
    locationName = loc.name;
  }

  const weather = await fetchWeather(lat, lon, tz, prefs.temperature_unit, prefs.wind_speed_unit, prefs.precipitation_unit, dataUserId);
  if (!weather) {
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 502 });
  }

  const condition = getWeatherCondition(weather.current.weather_code, weather.current.is_day);
  const tempStr = formatTemperature(weather.current.temperature, prefs.temperature_unit);
  const windStr = formatWindSpeed(weather.current.wind_speed, prefs.wind_speed_unit);

  // Emit timeline event (non-blocking, best-effort) — derive domain from request, never hardcode
  if (locationId) {
    const domain = process.env.WEATHER_EXTERNAL_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? request.headers.get("host") ?? "";
    if (domain) {
      emitWeatherCheckEvent(dataUserId, locationName, locationId, tempStr, condition.description, domain, lat, lon).catch(() => {});
    }
  }

  return NextResponse.json({
    data: {
      location_name: locationName,
      current: weather.current,
      temperature: tempStr,
      feels_like: formatTemperature(weather.current.apparent_temperature, prefs.temperature_unit),
      condition: condition.description,
      icon: condition.icon,
      wind: windStr,
      prefs,
    },
  });
}
