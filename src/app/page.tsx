"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MapPin, Wind, Droplets, Sunrise, Sunset, ChevronDown,
} from "lucide-react";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { getWeatherCondition } from "@/lib/weather/codes";
import {
  formatTemperature, formatWindSpeed, windDirectionToCompass,
} from "@/lib/weather/units";
import type { SavedLocation, UserPreferences, WeatherData } from "@/lib/weather/types";

/* ── helpers ── */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getUVSeverity(uv: number) {
  if (uv <= 2) return { label: "Low", bg: "bg-green-500", text: "text-green-600 dark:text-green-400" };
  if (uv <= 5) return { label: "Moderate", bg: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400" };
  if (uv <= 7) return { label: "High", bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" };
  if (uv <= 10) return { label: "Very High", bg: "bg-red-500", text: "text-red-600 dark:text-red-400" };
  return { label: "Extreme", bg: "bg-purple-600", text: "text-purple-600 dark:text-purple-400" };
}

function getHumidityComfort(h: number) {
  if (h < 30) return "Dry";
  if (h < 60) return "Comfortable";
  if (h < 70) return "Humid";
  return "Very Humid";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ── types ── */

type TabType = "today" | "hourly" | "7day";

interface CurrentData {
  location_name: string;
  current: WeatherData["current"];
  temperature: string;
  feels_like: string;
  condition: string;
  icon: string;
  wind: string;
  prefs: UserPreferences;
}

interface ForecastData {
  daily: WeatherData["daily"];
  hourly: WeatherData["hourly"];
  timezone: string;
}

/* ── page ── */

export default function WeatherHome() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);
  const [currentData, setCurrentData] = useState<CurrentData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d.data ?? []))
      .catch(() => {});
  }, []);

  const fetchCurrent = useCallback(async (location?: SavedLocation) => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/weather/current";
      if (location) {
        url += `?lat=${location.latitude}&lon=${location.longitude}&tz=${encodeURIComponent(location.timezone)}&location_id=${location.id}&location_name=${encodeURIComponent(location.name)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setCurrentData(data.data ?? null);
    } catch {
      setError("Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrent(selectedLocation ?? undefined);
  }, [selectedLocation, fetchCurrent]);

  useEffect(() => {
    const loc = selectedLocation;
    let url = "/api/weather/forecast";
    if (loc) {
      url += `?lat=${loc.latitude}&lon=${loc.longitude}&tz=${encodeURIComponent(loc.timezone)}`;
    }
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setForecastData({
            daily: d.data.daily,
            hourly: d.data.hourly,
            timezone: d.data.timezone ?? "UTC",
          });
        }
      })
      .catch(() => {});
  }, [selectedLocation]);

  const prefs = currentData?.prefs ?? {
    temperature_unit: "celsius" as const,
    wind_speed_unit: "kmh" as const,
    precipitation_unit: "mm" as const,
    default_location_id: null,
  };

  // Resolve location subtitle (admin1, country)
  const activeLocation =
    selectedLocation ??
    locations.find((l) => l.id === prefs.default_location_id) ??
    null;
  const locationSubtitle = activeLocation
    ? [activeLocation.admin1, activeLocation.country].filter(Boolean).join(", ")
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100/60 via-sky-50/30 to-background dark:from-blue-950/40 dark:via-background dark:to-background">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 space-y-6">
        {/* ── location switcher ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${
                (selectedLocation?.id ?? prefs.default_location_id) === loc.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/70 text-foreground border-border/30 hover:bg-card"
              }`}
            >
              {loc.name}
            </button>
          ))}
          <Link
            href="/locations"
            className="rounded-full px-4 py-1.5 text-sm font-medium border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            + Add
          </Link>
        </div>

        {/* ── hero section ── */}
        {loading ? (
          <div className="rounded-2xl bg-card/60 backdrop-blur-sm p-12 text-center text-muted-foreground">
            <div className="text-5xl mb-4 animate-pulse">
              <WeatherIcon name="CloudSun" size={48} className="mx-auto" />
            </div>
            <p>Loading weather...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center text-destructive">
            {error}
          </div>
        ) : !currentData ? (
          <div className="rounded-2xl bg-card/60 backdrop-blur-sm p-12 text-center">
            <div className="text-6xl mb-4">
              <MapPin size={48} className="mx-auto text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-6">
              Add your first location to see weather
            </p>
            <Link
              href="/locations"
              className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Add Location
            </Link>
          </div>
        ) : (
          <section className="pt-2 pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <MapPin size={18} className="text-primary shrink-0" />
                  <h1 className="text-2xl font-bold text-foreground truncate">
                    {currentData.location_name}
                  </h1>
                </div>
                {locationSubtitle && (
                  <p className="text-sm text-muted-foreground ml-[26px] mb-4">
                    {locationSubtitle}
                  </p>
                )}
                <div className="text-[5rem] md:text-[6.5rem] font-extralight tracking-tighter text-foreground leading-none">
                  {currentData.temperature}
                </div>
                <p className="text-lg text-muted-foreground mt-1">
                  {currentData.condition}
                </p>
                <p className="text-sm text-muted-foreground">
                  Feels like {currentData.feels_like}
                </p>
              </div>
              <div className="hidden md:flex items-start pt-8">
                <WeatherIcon
                  name={currentData.icon}
                  size={120}
                  className="drop-shadow-lg opacity-90"
                />
              </div>
            </div>

            {/* quick stats row */}
            <div className="flex items-center gap-3 mt-5 text-sm text-muted-foreground flex-wrap">
              {forecastData && (
                <span>
                  H:{" "}
                  {formatTemperature(
                    forecastData.daily.temperature_2m_max[0] ?? 0,
                    prefs.temperature_unit,
                  )}{" "}
                  L:{" "}
                  {formatTemperature(
                    forecastData.daily.temperature_2m_min[0] ?? 0,
                    prefs.temperature_unit,
                  )}
                </span>
              )}
              <span className="opacity-25">|</span>
              <span className="flex items-center gap-1">
                <Wind size={14} />
                {currentData.wind}{" "}
                {windDirectionToCompass(currentData.current.wind_direction)}
              </span>
              {forecastData && (
                <>
                  <span className="opacity-25">|</span>
                  <span className="flex items-center gap-1">
                    <Droplets size={14} className="text-blue-400" />
                    Rain{" "}
                    {forecastData.daily.precipitation_probability_max[0] ?? 0}%
                  </span>
                </>
              )}
            </div>
          </section>
        )}

        {/* ── tab bar ── */}
        {currentData && !loading && (
          <div className="flex gap-2">
            {(["today", "hourly", "7day"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setExpandedDay(null);
                }}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab === "today" ? "Today" : tab === "hourly" ? "Hourly" : "7-Day"}
              </button>
            ))}
          </div>
        )}

        {/* ── tab content ── */}
        {currentData && forecastData && !loading && (
          <>
            {/* ─── TODAY TAB ─── */}
            {activeTab === "today" && (
              <div className="space-y-5">
                <HourlyScroll
                  hourly={forecastData.hourly}
                  prefs={prefs}
                />

                {/* metric cards row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <UVCard uv={forecastData.daily.uv_index_max[0] ?? 0} />
                  <HumidityCard humidity={currentData.current.humidity} />
                  <SunriseSunsetCard
                    sunrise={forecastData.daily.sunrise[0] ?? ""}
                    sunset={forecastData.daily.sunset[0] ?? ""}
                  />
                </div>

                {/* 7-day mini */}
                <div className="rounded-2xl bg-card/90 border border-border/20 overflow-hidden">
                  <div className="px-5 py-3 border-b border-border/10 flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      7-Day Forecast
                    </h3>
                    <button
                      onClick={() => setActiveTab("7day")}
                      className="text-xs text-primary hover:underline"
                    >
                      See all
                    </button>
                  </div>
                  {forecastData.daily.time.map((dateStr, i) => {
                    const date = new Date(dateStr + "T12:00:00");
                    const dayName =
                      i === 0 ? "Today" : (DAY_NAMES[date.getDay()] ?? "");
                    const cond = getWeatherCondition(
                      forecastData.daily.weather_code[i] ?? 0,
                      true,
                    );
                    return (
                      <div
                        key={dateStr}
                        className="px-5 py-3 flex items-center gap-4 border-b border-border/10 last:border-b-0"
                      >
                        <span className="w-12 text-sm font-medium">
                          {dayName}
                        </span>
                        <WeatherIcon name={cond.icon} size={20} />
                        <span className="flex-1 text-xs text-muted-foreground hidden sm:block">
                          {cond.description}
                        </span>
                        <span className="text-sm font-medium w-12 text-right">
                          {formatTemperature(
                            forecastData.daily.temperature_2m_max[i] ?? 0,
                            prefs.temperature_unit,
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {formatTemperature(
                            forecastData.daily.temperature_2m_min[i] ?? 0,
                            prefs.temperature_unit,
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── HOURLY TAB ─── */}
            {activeTab === "hourly" && (
              <HourlyExpanded
                hourly={forecastData.hourly}
                prefs={prefs}
              />
            )}

            {/* ─── 7-DAY TAB ─── */}
            {activeTab === "7day" && (
              <div className="space-y-3">
                {forecastData.daily.time.map((dateStr, i) => {
                  const date = new Date(dateStr + "T12:00:00");
                  const dayName =
                    i === 0
                      ? "Today"
                      : (DAY_NAMES_FULL[date.getDay()] ?? dateStr);
                  const cond = getWeatherCondition(
                    forecastData.daily.weather_code[i] ?? 0,
                    true,
                  );
                  const isExpanded = expandedDay === i;
                  const hourStart = i * 24;

                  return (
                    <div
                      key={dateStr}
                      className="rounded-xl bg-card/90 border border-border/20 overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedDay(isExpanded ? null : i)
                        }
                        className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                      >
                        <span className="w-28 text-sm font-medium">
                          {dayName}
                        </span>
                        <WeatherIcon name={cond.icon} size={24} />
                        <span className="flex-1 text-sm text-muted-foreground">
                          {cond.description}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-semibold">
                            {formatTemperature(
                              forecastData.daily.temperature_2m_max[i] ?? 0,
                              prefs.temperature_unit,
                            )}
                          </span>
                          <span className="text-sm text-muted-foreground mx-1">
                            /
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatTemperature(
                              forecastData.daily.temperature_2m_min[i] ?? 0,
                              prefs.temperature_unit,
                            )}
                          </span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* day summary */}
                      <div className="px-4 pb-3 flex gap-4 text-xs text-muted-foreground border-t border-border/10 pt-3">
                        <span className="flex items-center gap-1">
                          <Droplets size={12} className="text-blue-400" />
                          {forecastData.daily.precipitation_probability_max[i] ??
                            0}
                          %
                        </span>
                        <span className="flex items-center gap-1">
                          <Wind size={12} />
                          {formatWindSpeed(
                            forecastData.daily.wind_speed_10m_max[i] ?? 0,
                            prefs.wind_speed_unit,
                          )}{" "}
                          max
                        </span>
                        <span>
                          UV{" "}
                          {forecastData.daily.uv_index_max[i] ?? 0}
                        </span>
                      </div>

                      {/* expanded hourly */}
                      {isExpanded && (
                        <div className="border-t border-border/10 px-4 pb-4 pt-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                            Hourly
                          </p>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {forecastData.hourly.time
                              .slice(hourStart, hourStart + 24)
                              .map((time, hi) => {
                                const gi = hourStart + hi;
                                const hCond = getWeatherCondition(
                                  forecastData.hourly.weather_code[gi] ?? 0,
                                  (forecastData.hourly.is_day[gi] ?? 1) === 1,
                                );
                                return (
                                  <div
                                    key={time}
                                    className="flex items-center gap-3 text-sm py-1"
                                  >
                                    <span className="w-16 text-muted-foreground text-xs">
                                      {new Date(time).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    <WeatherIcon
                                      name={hCond.icon}
                                      size={16}
                                    />
                                    <span className="font-medium w-16">
                                      {formatTemperature(
                                        forecastData.hourly.temperature_2m[gi] ??
                                          0,
                                        prefs.temperature_unit,
                                      )}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                      {forecastData.hourly
                                        .precipitation_probability[gi] ?? 0}
                                      %
                                    </span>
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Sub-components (kept in same file — page-specific)
   ══════════════════════════════════════════════════════════ */

function HourlyScroll({
  hourly,
  prefs,
}: {
  hourly: WeatherData["hourly"];
  prefs: UserPreferences;
}) {
  const nowMs = Date.now();
  const startIdx = Math.max(
    0,
    hourly.time.findIndex((t) => new Date(t).getTime() >= nowMs - 1800000),
  );
  const hours = hourly.time.slice(startIdx, startIdx + 24);

  return (
    <div className="rounded-2xl bg-card/90 border border-border/20 p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
        Hourly Forecast
      </h3>
      <div className="overflow-x-auto">
        <div className="flex gap-3 pb-1" style={{ minWidth: "max-content" }}>
          {hours.map((timeStr, i) => {
            const gi = startIdx + i;
            const isDay = (hourly.is_day[gi] ?? 1) === 1;
            const cond = getWeatherCondition(
              hourly.weather_code[gi] ?? 0,
              isDay,
            );
            const temp = formatTemperature(
              hourly.temperature_2m[gi] ?? 0,
              prefs.temperature_unit,
            );
            const isNow = i === 0;
            const label = isNow
              ? "Now"
              : new Date(timeStr).toLocaleTimeString([], { hour: "numeric" });

            return (
              <div
                key={timeStr}
                className={`shrink-0 w-[72px] rounded-xl p-3 flex flex-col items-center gap-2 text-center transition-colors ${
                  isNow
                    ? "bg-primary/10 border border-primary/30"
                    : "border border-border/10 hover:bg-muted/20"
                }`}
              >
                <span
                  className={`text-xs font-medium ${isNow ? "text-primary" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
                <WeatherIcon name={cond.icon} size={22} />
                <span className="text-sm font-semibold">{temp}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UVCard({ uv }: { uv: number }) {
  const severity = getUVSeverity(uv);
  return (
    <div className="rounded-2xl bg-card/90 border border-border/20 p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        UV Index
      </h3>
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold ${severity.bg}`}
        >
          {Math.round(uv)}
        </div>
        <span className={`text-sm font-medium ${severity.text}`}>
          {severity.label}
        </span>
      </div>
    </div>
  );
}

function HumidityCard({ humidity }: { humidity: number }) {
  const comfort = getHumidityComfort(humidity);
  return (
    <div className="rounded-2xl bg-card/90 border border-border/20 p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Humidity
      </h3>
      <div className="flex items-center gap-4">
        <Droplets size={32} className="text-blue-400 shrink-0" />
        <div>
          <p className="text-3xl font-semibold text-foreground">{humidity}%</p>
          <p className="text-sm text-muted-foreground">{comfort}</p>
        </div>
      </div>
    </div>
  );
}

function SunriseSunsetCard({
  sunrise,
  sunset,
}: {
  sunrise: string;
  sunset: string;
}) {
  if (!sunrise || !sunset) return null;

  const sunriseMs = new Date(sunrise).getTime();
  const sunsetMs = new Date(sunset).getTime();
  const nowMs = Date.now();
  const progress = Math.max(
    0,
    Math.min(1, (nowMs - sunriseMs) / (sunsetMs - sunriseMs)),
  );
  const isDaytime = nowMs >= sunriseMs && nowMs <= sunsetMs;

  // Arc geometry: semicircle from (20,80) to (180,80)
  const angle = Math.PI * (1 - progress);
  const sunX = 100 + 80 * Math.cos(angle);
  const sunY = 80 - 65 * Math.sin(angle);

  return (
    <div className="rounded-2xl bg-card/90 border border-border/20 p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Sunrise & Sunset
      </h3>
      <svg viewBox="0 0 200 100" className="w-full h-auto mb-2">
        {/* horizon line */}
        <line
          x1="15"
          y1="82"
          x2="185"
          y2="82"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1"
        />
        {/* full arc track (dashed) */}
        <path
          d="M 20 80 A 80 65 0 0 1 180 80"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        {/* elapsed arc */}
        {isDaytime && progress > 0.02 && (
          <path
            d={`M 20 80 A 80 65 0 0 1 ${sunX.toFixed(1)} ${sunY.toFixed(1)}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
        {/* sun dot */}
        {isDaytime && (
          <>
            <circle
              cx={sunX}
              cy={sunY}
              r="8"
              fill="#fbbf24"
              opacity="0.3"
            />
            <circle cx={sunX} cy={sunY} r="5" fill="#f59e0b" />
          </>
        )}
      </svg>
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Sunrise size={14} className="text-amber-500" />
          {fmtTime(sunrise)}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Sunset size={14} className="text-orange-500" />
          {fmtTime(sunset)}
        </span>
      </div>
    </div>
  );
}

function HourlyExpanded({
  hourly,
  prefs,
}: {
  hourly: WeatherData["hourly"];
  prefs: UserPreferences;
}) {
  const hours = hourly.time.slice(0, 48);
  const temps = hourly.temperature_2m.slice(0, 48);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="rounded-2xl bg-card/90 border border-border/20 overflow-hidden">
      {hours.map((timeStr, i) => {
        const time = new Date(timeStr);
        const timeLabel = time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dateLabel =
          i === 0 || time.getHours() === 0
            ? time.toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : null;
        const temp = hourly.temperature_2m[i] ?? 0;
        const isDay = (hourly.is_day[i] ?? 1) === 1;
        const cond = getWeatherCondition(hourly.weather_code[i] ?? 0, isDay);
        const barW = Math.max(5, Math.round(((temp - minTemp) / tempRange) * 100));
        const precip = hourly.precipitation_probability[i] ?? 0;

        return (
          <div key={timeStr}>
            {dateLabel && (
              <div className="px-5 py-2 bg-muted/20 border-t border-border/10 first:border-t-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {dateLabel}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-border/10 first:border-t-0 hover:bg-muted/10 transition-colors">
              <span className="w-14 text-sm text-muted-foreground">
                {timeLabel}
              </span>
              <WeatherIcon name={cond.icon} size={20} />
              <span className="w-16 text-sm font-semibold">
                {formatTemperature(temp, prefs.temperature_unit)}
              </span>
              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
                  style={{ width: `${barW}%` }}
                />
              </div>
              {precip > 0 && (
                <span className="w-14 text-xs text-blue-400 text-right flex items-center justify-end gap-1">
                  <Droplets size={12} />
                  {precip}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
