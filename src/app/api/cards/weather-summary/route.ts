import {getLocale, getTranslations} from "next-intl/server";
import {getTranslations as getInterfaceTranslations} from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather/client";
import { getWeatherCondition } from "@/lib/weather/codes";
import { formatTemperature, formatWindSpeed, windDirectionToCompass } from "@/lib/weather/units";

export async function GET(request: NextRequest) {
  const translateInterface = await getInterfaceTranslations("interface");
  const locale = await getLocale();
  const conditionText = await getTranslations("weather.conditions");
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const name = searchParams.get("name") ?? translateInterface("mda03bf3b5441");

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  const weather = await fetchWeather(lat, lon, "UTC");
  if (!weather) {
    return NextResponse.json({ error: "Weather data unavailable" }, { status: 502 });
  }

  const condition = getWeatherCondition(weather.current.weather_code, weather.current.is_day, conditionText);
  const tempStr = formatTemperature(weather.current.temperature, "celsius");
  const feelsLikeStr = formatTemperature(weather.current.apparent_temperature, "celsius");
  const windStr = formatWindSpeed(weather.current.wind_speed, "kmh", locale);
  const windDir = windDirectionToCompass(weather.current.wind_direction, locale);

  const baseUrl = process.env.WEATHER_EXTERNAL_URL ?? "";

  return NextResponse.json({
    card_type: "weather-summary",
    provider: "ye-weather",
    title: name,
    description: translateInterface("m783a25904730", {condition: condition.description, temperature: tempStr, feelsLike: feelsLikeStr}),
    facts: [
      { label: translateInterface("mb958ce8b871a"), value: tempStr },
      { label: translateInterface("mf46eec59df4d"), value: feelsLikeStr },
      { label: translateInterface("m46819ccb5e6d"), value: `${weather.current.humidity}%` },
      { label: translateInterface("md151346fe7ee"), value: `${windStr} ${windDir}` },
      { label: translateInterface("m1f8407f9eeb1"), value: `${Math.round(weather.current.pressure)} hPa` },
      { label: translateInterface("m30d547de2787"), value: `${weather.current.cloud_cover}%` },
    ],
    actions: [
      { label: translateInterface("mc38bea1e5464"), url: baseUrl, type: "link" },
    ],
    source_url: baseUrl,
    external_url: null,
  });
}
