import type React from "react";
import { CloudSun, Droplets, Gauge, MapPin, Wind } from "lucide-react";
import { fetchWeather } from "@/lib/weather/client";
import { getWeatherCondition } from "@/lib/weather/codes";
import { formatTemperature, formatWindSpeed, windDirectionToCompass } from "@/lib/weather/units";

interface WeatherCardPageProps {
  searchParams: Promise<{ lat?: string; lon?: string; name?: string }>;
}

export default async function WeatherCardPage({ searchParams }: WeatherCardPageProps) {
  const params = await searchParams;
  const lat = Number(params.lat);
  const lon = Number(params.lon);
  const name = params.name || "Weather";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return <CardError message="No location provided" />;
  }

  const weather = await fetchWeather(lat, lon, "UTC");
  if (!weather) return <CardError message="Weather data unavailable" />;

  const condition = getWeatherCondition(weather.current.weather_code, weather.current.is_day);
  const temp = formatTemperature(weather.current.temperature, "celsius");
  const feels = formatTemperature(weather.current.apparent_temperature, "celsius");
  const wind = `${formatWindSpeed(weather.current.wind_speed, "kmh")} ${windDirectionToCompass(weather.current.wind_direction)}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4 text-foreground">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CloudSun className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{name}</span>
          </div>
          <h2 className="mt-1 text-3xl font-semibold leading-none">{temp}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{condition.description}, feels like {feels}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Fact icon={<Droplets className="h-3.5 w-3.5" />} label="Humidity" value={`${weather.current.humidity}%`} />
        <Fact icon={<Wind className="h-3.5 w-3.5" />} label="Wind" value={wind} />
        <Fact icon={<Gauge className="h-3.5 w-3.5" />} label="Pressure" value={`${Math.round(weather.current.pressure)} hPa`} />
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="mb-1 flex items-center gap-1 text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function CardError({ message }: { message: string }) {
  return <div className="p-4 text-center text-sm text-muted-foreground">{message}</div>;
}
