import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/migrate";
import { fetchWeather } from "@/lib/weather/client";
import { formatTemperature, formatWindSpeed } from "@/lib/weather/units";
import { getWeatherCondition } from "@/lib/weather/codes";
import { query } from "@/lib/db/client";
import type { UserPreferences, SavedLocation } from "@/lib/weather/types";

export async function GET(request: NextRequest) {
  const session = await getSession("ye-weather");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({
      title: "Weather",
      content: "Sign in to see weather",
      items: [],
    });
  }

  try {
    await ensureSchema();

    // Get user's preferences
    const prefsResult = await query<UserPreferences>(
      `SELECT temperature_unit, wind_speed_unit, precipitation_unit, default_location_id
       FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
    const prefs: UserPreferences = prefsResult.rows[0] ?? {
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
      default_location_id: null,
    };

    if (!prefs.default_location_id) {
      return NextResponse.json({
        widget_type: "custom",
        title: "Weather",
        data: null,
        action: { label: "Open Weather", url: process.env.WEATHER_EXTERNAL_URL ?? "" },
        empty_message: "No default location set. Open Weather to add one.",
      });
    }

    // Get default location
    const locResult = await query<SavedLocation>(
      `SELECT * FROM saved_locations WHERE id = $1 AND user_id = $2`,
      [prefs.default_location_id, userId]
    );
    const location = locResult.rows[0];
    if (!location) {
      return NextResponse.json({
        widget_type: "custom",
        title: "Weather",
        data: null,
        action: { label: "Open Weather", url: process.env.WEATHER_EXTERNAL_URL ?? "" },
        empty_message: "Default location not found. Open Weather to set one.",
      });
    }

    const weather = await fetchWeather(
      location.latitude,
      location.longitude,
      location.timezone,
      prefs.temperature_unit,
      prefs.wind_speed_unit,
      prefs.precipitation_unit
    );

    if (!weather) {
      return NextResponse.json({
        widget_type: "custom",
        title: "Weather",
        data: null,
        empty_message: "Weather data unavailable.",
      });
    }

    const condition = getWeatherCondition(weather.current.weather_code, weather.current.is_day);

    return NextResponse.json({
      widget_type: "custom",
      title: "Weather",
      data: {
        location: location.name,
        temperature: formatTemperature(weather.current.temperature, prefs.temperature_unit),
        feels_like: formatTemperature(weather.current.apparent_temperature, prefs.temperature_unit),
        condition: condition.description,
        icon: condition.icon,
        humidity: weather.current.humidity,
        wind: formatWindSpeed(weather.current.wind_speed, prefs.wind_speed_unit),
        is_day: weather.current.is_day,
      },
      action: { label: "Open Weather", url: process.env.WEATHER_EXTERNAL_URL ?? "" },
    });
  } catch {
    return NextResponse.json({
      widget_type: "custom",
      title: "Weather",
      data: null,
      empty_message: "Weather data unavailable.",
    });
  }
}
