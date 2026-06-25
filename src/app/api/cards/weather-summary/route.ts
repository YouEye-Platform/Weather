import { NextRequest, NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather/client";
import { getWeatherCondition } from "@/lib/weather/codes";
import { formatTemperature, formatWindSpeed, windDirectionToCompass } from "@/lib/weather/units";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const name = searchParams.get("name") ?? "Unknown Location";

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  const weather = await fetchWeather(lat, lon, "UTC");
  if (!weather) {
    return NextResponse.json({ error: "Weather data unavailable" }, { status: 502 });
  }

  const condition = getWeatherCondition(weather.current.weather_code, weather.current.is_day);
  const tempStr = formatTemperature(weather.current.temperature, "celsius");
  const feelsLikeStr = formatTemperature(weather.current.apparent_temperature, "celsius");
  const windStr = formatWindSpeed(weather.current.wind_speed, "kmh");
  const windDir = windDirectionToCompass(weather.current.wind_direction);

  const baseUrl = process.env.WEATHER_EXTERNAL_URL ?? "";

  return NextResponse.json({
    card_type: "weather-summary",
    provider: "ye-weather",
    title: name,
    description: `${condition.description}, ${tempStr} (feels like ${feelsLikeStr})`,
    facts: [
      { label: "Temperature", value: tempStr },
      { label: "Feels Like", value: feelsLikeStr },
      { label: "Humidity", value: `${weather.current.humidity}%` },
      { label: "Wind", value: `${windStr} ${windDir}` },
      { label: "Pressure", value: `${Math.round(weather.current.pressure)} hPa` },
      { label: "Cloud Cover", value: `${weather.current.cloud_cover}%` },
    ],
    actions: [
      { label: "View Forecast", url: baseUrl, type: "link" },
    ],
    source_url: baseUrl,
    external_url: null,
  });
}
