import { NextRequest, NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather/client";
import { getWeatherCondition } from "@/lib/weather/codes";
import { formatTemperature, formatWindSpeed, windDirectionToCompass } from "@/lib/weather/units";
import { query } from "@/lib/db/client";

type LocationRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
};

export async function POST(request: NextRequest) {
  let body: { request_type?: string; data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { request_type, data } = body;

  if (request_type === "weather-summary") {
    const lat = typeof data?.lat === "number" ? data.lat : null;
    const lon = typeof data?.lon === "number" ? data.lon : null;
    if (lat === null || lon === null) {
      return NextResponse.json({ error: "lat and lon required for weather-summary" }, { status: 400 });
    }

    const weather = await fetchWeather(lat, lon, "UTC");
    if (!weather) {
      return NextResponse.json({ error: "Weather data unavailable" }, { status: 502 });
    }

    const condition = getWeatherCondition(weather.current.weather_code, weather.current.is_day);
    return NextResponse.json({
      result: {
        temperature: formatTemperature(weather.current.temperature, "celsius"),
        condition: condition.description,
        icon: condition.icon,
        wind: `${formatWindSpeed(weather.current.wind_speed, "kmh")} ${windDirectionToCompass(weather.current.wind_direction)}`,
        humidity: weather.current.humidity,
      },
    });
  }

  if (request_type === "search") {
    const q = typeof data?.query === "string" ? data.query : "";
    const userId = typeof data?.user_id === "string" ? data.user_id : null;
    if (!userId) {
      return NextResponse.json({ results: [] });
    }

    const result = await query<LocationRow>(
      `SELECT * FROM saved_locations
       WHERE user_id = $1 AND LOWER(name) LIKE LOWER($2)
       ORDER BY sort_order, created_at LIMIT 10`,
      [userId, `%${q}%`]
    );

    return NextResponse.json({
      results: result.rows.map((loc) => ({
        id: loc.id,
        title: loc.name,
        subtitle: [loc.admin1, loc.country].filter(Boolean).join(", "),
        url: process.env.WEATHER_EXTERNAL_URL ? `${process.env.WEATHER_EXTERNAL_URL}/?location=${loc.id}` : null,
      })),
    });
  }

  return NextResponse.json({ error: `Unknown request_type: ${request_type}` }, { status: 400 });
}
