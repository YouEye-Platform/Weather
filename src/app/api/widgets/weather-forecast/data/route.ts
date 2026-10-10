import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/migrate";
import { fetchWeather } from "@/lib/weather/client";
import { formatTemperature } from "@/lib/weather/units";
import { getWeatherCondition } from "@/lib/weather/codes";
import { query } from "@/lib/db/client";
import type { UserPreferences, SavedLocation } from "@/lib/weather/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(request: NextRequest) {
  const session = await getSession("ye-weather");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({
      title: "Weather Forecast",
      content: "Sign in to see forecast",
      items: [],
    });
  }

  try {
    await ensureSchema();

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
        widget_type: "list",
        title: "Weather Forecast",
        items: [],
        empty_message: "No default location set. Open Weather to add one.",
        action: { label: "Open Weather", url: process.env.WEATHER_EXTERNAL_URL ?? "" },
      });
    }

    const locResult = await query<SavedLocation>(
      `SELECT * FROM saved_locations WHERE id = $1 AND user_id = $2`,
      [prefs.default_location_id, userId]
    );
    const location = locResult.rows[0];
    if (!location) {
      return NextResponse.json({
        widget_type: "list",
        title: "Weather Forecast",
        items: [],
        empty_message: "Default location not found.",
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
        widget_type: "list",
        title: "Weather Forecast",
        items: [],
        empty_message: "Weather data unavailable.",
      });
    }

    const items = weather.daily.time.slice(0, 5).map((dateStr, i) => {
      const date = new Date(dateStr + "T12:00:00");
      const dayName = i === 0 ? "Today" : DAY_NAMES[date.getDay()] ?? dateStr;
      const condition = getWeatherCondition(weather.daily.weather_code[i] ?? 0, true);
      return {
        id: dateStr,
        title: dayName,
        subtitle: condition.description,
        metadata: `${formatTemperature(weather.daily.temperature_2m_max[i] ?? 0, prefs.temperature_unit)} / ${formatTemperature(weather.daily.temperature_2m_min[i] ?? 0, prefs.temperature_unit)}`,
        icon: condition.icon,
      };
    });

    return NextResponse.json({
      widget_type: "list",
      title: `Forecast — ${location.name}`,
      items,
      action: { label: "Open Weather", url: process.env.WEATHER_EXTERNAL_URL ?? "" },
    });
  } catch {
    return NextResponse.json({
      widget_type: "list",
      title: "Weather Forecast",
      items: [],
      empty_message: "Weather data unavailable.",
    });
  }
}
