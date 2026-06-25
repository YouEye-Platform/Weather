"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Droplets } from "lucide-react";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { getWeatherCondition } from "@/lib/weather/codes";
import { formatTemperature, formatWindSpeed } from "@/lib/weather/units";
import type { WeatherData, UserPreferences } from "@/lib/weather/types";

export default function HourlyPage() {
  const [data, setData] = useState<{ hourly: WeatherData["hourly"]; daily: WeatherData["daily"]; prefs: UserPreferences } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weather/forecast")
      .then((r) => r.json())
      .then((d) => setData(d.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="mb-4 animate-pulse flex justify-center"><WeatherIcon name="CloudSun" size={48} /></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No data available. Set a default location first.</p>
          <Link href="/locations" className="text-primary hover:underline">Manage locations →</Link>
        </div>
      </div>
    );
  }

  const { hourly, daily, prefs } = data;

  // Get min/max temp for the visible range (for bar scaling)
  const hours = hourly.time.slice(0, 48);
  const temps = hourly.temperature_2m.slice(0, 48);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;

  // Get sunrise/sunset for day 0 and day 1
  const sunrises = [daily.sunrise[0] ?? "", daily.sunrise[1] ?? ""];
  const sunsets = [daily.sunset[0] ?? "", daily.sunset[1] ?? ""];
  const sunEvents = [...sunrises, ...sunsets].filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/30 via-background to-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
          <h1 className="text-2xl font-bold">48-Hour Forecast</h1>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          {hours.map((timeStr, i) => {
            const time = new Date(timeStr);
            const timeLabel = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const dateLabel = i === 0 || time.getHours() === 0 ? time.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : null;
            const temp = hourly.temperature_2m[i] ?? 0;
            const isDay = (hourly.is_day[i] ?? 1) === 1;
            const condition = getWeatherCondition(hourly.weather_code[i] ?? 0, isDay);
            const barWidth = Math.max(5, Math.round(((temp - minTemp) / tempRange) * 100));
            const precipProb = hourly.precipitation_probability[i] ?? 0;
            const wind = hourly.wind_speed_10m[i] ?? 0;

            // Check if a sun event falls between this and previous hour
            const isSunEvent = sunEvents.some((e) => {
              const eTime = new Date(e).getTime();
              const prevHour = i > 0 ? new Date(hours[i - 1]!).getTime() : 0;
              return eTime >= prevHour && eTime < time.getTime();
            });

            return (
              <div key={timeStr}>
                {dateLabel && (
                  <div className="px-4 py-2 bg-muted/20 border-t border-border/30 first:border-t-0">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dateLabel}</span>
                  </div>
                )}
                {isSunEvent && !dateLabel && (
                  <div className="px-4 py-1 bg-amber-500/10 border-t border-amber-500/20 text-xs text-amber-500">
                    ☀️ Sunrise/Sunset
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3 border-t border-border/10 first:border-t-0 hover:bg-card/80 transition-colors">
                  <span className="w-14 text-sm text-muted-foreground">{timeLabel}</span>
                  <WeatherIcon name={condition.icon} size={22} />
                  <span className="w-16 text-sm font-semibold">{formatTemperature(temp, prefs.temperature_unit)}</span>

                  {/* Temperature bar */}
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-orange-400"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {precipProb > 0 && (
                    <span className="w-14 text-xs text-blue-400 text-right flex items-center justify-end gap-1">
                      <Droplets size={12} />{precipProb}%
                    </span>
                  )}
                  <span className="w-20 text-xs text-muted-foreground text-right hidden md:block">
                    {formatWindSpeed(wind, prefs.wind_speed_unit)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
