"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Droplets, Wind, ChevronDown } from "lucide-react";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { getWeatherCondition } from "@/lib/weather/codes";
import { formatTemperature, formatWindSpeed } from "@/lib/weather/units";
import type { WeatherData, UserPreferences } from "@/lib/weather/types";

const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ForecastPage() {
  const [forecast, setForecast] = useState<{ daily: WeatherData["daily"]; hourly: WeatherData["hourly"]; prefs: UserPreferences } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/weather/forecast")
      .then((r) => r.json())
      .then((d) => setForecast(d.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="mb-4 animate-pulse flex justify-center">
            <WeatherIcon name="CloudSun" size={48} />
          </div>
          <p>Loading forecast...</p>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No forecast available. Set a default location first.</p>
          <Link href="/locations" className="text-primary hover:underline">Manage locations →</Link>
        </div>
      </div>
    );
  }

  const { daily, hourly, prefs } = forecast;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/30 via-background to-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
          <h1 className="text-2xl font-bold">7-Day Forecast</h1>
        </div>

        {daily.time.map((dateStr, i) => {
          const date = new Date(dateStr + "T12:00:00");
          const dayName = i === 0 ? "Today" : (DAY_NAMES_FULL[date.getDay()] ?? dateStr);
          const condition = getWeatherCondition(daily.weather_code[i] ?? 0, true);
          const isExpanded = expandedDay === i;

          // Hourly data for this day (24 hours starting at i*24)
          const hourStart = i * 24;
          const dayHours = hourly.time.slice(hourStart, hourStart + 24);

          return (
            <div key={dateStr} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              <button
                onClick={() => setExpandedDay(isExpanded ? null : i)}
                className="w-full p-4 flex items-center gap-4 hover:bg-card/80 transition-colors text-left"
              >
                <span className="w-28 text-sm font-medium text-foreground">{dayName}</span>
                <WeatherIcon name={condition.icon} size={24} />
                <span className="flex-1 text-sm text-muted-foreground">{condition.description}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-foreground">
                    {formatTemperature(daily.temperature_2m_max[i] ?? 0, prefs.temperature_unit)}
                  </span>
                  <span className="text-sm text-muted-foreground mx-1">/</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTemperature(daily.temperature_2m_min[i] ?? 0, prefs.temperature_unit)}
                  </span>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {/* Day details */}
              <div className="px-4 pb-3 flex gap-4 text-xs text-muted-foreground border-t border-border/20 pt-3">
                <span className="flex items-center gap-1"><Droplets size={12} className="text-blue-400" /> {daily.precipitation_probability_max[i] ?? 0}% precip</span>
                <span className="flex items-center gap-1"><Wind size={12} /> {formatWindSpeed(daily.wind_speed_10m_max[i] ?? 0, prefs.wind_speed_unit)} max</span>
                <span>UV {daily.uv_index_max[i] ?? 0}</span>
              </div>

              {/* Expanded hourly breakdown */}
              {isExpanded && dayHours.length > 0 && (
                <div className="border-t border-border/20 px-4 pb-4 pt-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Hourly breakdown</p>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {dayHours.map((time, hi) => {
                      const hi2 = hourStart + hi;
                      const hCondition = getWeatherCondition(hourly.weather_code[hi2] ?? 0, (hourly.is_day[hi2] ?? 1) === 1);
                      const timeStr = new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      return (
                        <div key={time} className="flex items-center gap-3 text-sm">
                          <span className="w-16 text-muted-foreground text-xs">{timeStr}</span>
                          <WeatherIcon name={hCondition.icon} size={16} />
                          <span className="font-medium w-16">{formatTemperature(hourly.temperature_2m[hi2] ?? 0, prefs.temperature_unit)}</span>
                          <span className="text-muted-foreground text-xs">{hourly.precipitation_probability[hi2] ?? 0}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
