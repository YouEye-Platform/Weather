import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/migrate";
import { fetchWeather } from "@/lib/weather/client";
import { query } from "@/lib/db/client";
import { resolveWeatherDataUserId } from "@/lib/weather/user-id";
import type { UserPreferences } from "@/lib/weather/types";

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

  // If no lat/lon, use default
  if (lat === null || lon === null) {
    const defaultId = prefs.default_location_id;
    if (!defaultId) {
      return NextResponse.json({ data: null, message: "No default location set" });
    }
    const locResult = await query<{ latitude: number; longitude: number; timezone: string }>(
      `SELECT latitude, longitude, timezone FROM saved_locations WHERE id = $1 AND user_id = $2`,
      [defaultId, dataUserId]
    );
    if (!locResult.rows[0]) {
      return NextResponse.json({ data: null, message: "Default location not found" });
    }
    lat = locResult.rows[0].latitude;
    lon = locResult.rows[0].longitude;
    tz = locResult.rows[0].timezone;
  }

  const weather = await fetchWeather(lat, lon, tz, prefs.temperature_unit, prefs.wind_speed_unit, prefs.precipitation_unit, dataUserId);
  if (!weather) {
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 502 });
  }

  return NextResponse.json({
    data: {
      daily: weather.daily,
      hourly: weather.hourly,
      timezone: weather.timezone,
      prefs,
    },
  });
}
