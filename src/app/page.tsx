"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale as useInterfaceLocale, useTranslations as useInterfaceTranslations } from "next-intl";
import { useTranslations as useConditionTranslations } from "next-intl";
import { loadWeather, type CurrentData, type ForecastData } from "@/lib/weather/load";
import Link from "next/link";
import {
  MapPin, Wind, Droplets, Sunrise, Sunset, ChevronDown, RefreshCw, AlertCircle,
} from "lucide-react";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { getWeatherCondition } from "@/lib/weather/codes";
import {
  formatTemperature, formatWindSpeed, windDirectionToCompass,
} from "@/lib/weather/units";
import type { SavedLocation, UserPreferences, WeatherData } from "@/lib/weather/types";

/* ── helpers ── */


function getUVSeverity(uv: number) {
  if (uv <= 2) return { label: "uvLow", bg: "bg-green-500", text: "text-green-600 dark:text-green-400" };
  if (uv <= 5) return { label: "uvModerate", bg: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400" };
  if (uv <= 7) return { label: "uvHigh", bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" };
  if (uv <= 10) return { label: "uvVeryHigh", bg: "bg-red-500", text: "text-red-600 dark:text-red-400" };
  return { label: "uvExtreme", bg: "bg-purple-600", text: "text-purple-600 dark:text-purple-400" };
}

function getHumidityComfort(h: number) {
  if (h < 30) return "humidityDry";
  if (h < 60) return "humidityComfortable";
  if (h < 70) return "humidityHumid";
  return "humidityVeryHumid";
}

function fmtTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

/* ── types ── */

type TabType = "today" | "hourly" | "7day";


/* ── page ── */

export default function WeatherHome() {
  const translateInterface = useInterfaceTranslations("interface");

  const conditionText = useConditionTranslations("weather.conditions");

  const interfaceLocale = useInterfaceLocale();


  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);
  const [currentData, setCurrentData] = useState<CurrentData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState(false);
  const weatherRequest = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d.data ?? []))
      .catch(() => {});
  }, []);

  const fetchCurrent = useCallback(async (location?: SavedLocation) => {
    weatherRequest.current?.abort();
    const controller = new AbortController();
    weatherRequest.current = controller;
    setLoading(true);
    setError(null);
    setForecastError(false);
    setCurrentData(null);
    setForecastData(null);
    const params = location ? new URLSearchParams({
      lat: String(location.latitude), lon: String(location.longitude), tz: location.timezone,
      location_id: location.id, location_name: location.name,
    }) : new URLSearchParams();
    await loadWeather(params, controller.signal, {
      onCurrent: setCurrentData,
      onCurrentError: () => setError(translateInterface("currentLoadError")),
      onCurrentSettled: () => setLoading(false),
      onForecast: setForecastData,
      onForecastError: () => setForecastError(true),
    });
  }, [translateInterface]);

  useEffect(() => {
    fetchCurrent(selectedLocation ?? undefined);
    return () => weatherRequest.current?.abort();
  }, [selectedLocation, fetchCurrent]);

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
    <div className="weather-workspace">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="mb-1 text-sm text-muted-foreground">{translateInterface("dayIntroduction")}</p><h1 className="text-3xl font-semibold tracking-tight">{translateInterface("weatherTitle")}</h1></div>
          <Link href="/locations" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><MapPin className="h-4 w-4" />{translateInterface("manageLocations")}</Link>
        </div>
        {/* ── location switcher ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {locations.map((loc) => (
            <button
              key={loc.id}
              aria-pressed={(selectedLocation?.id ?? prefs.default_location_id) === loc.id}
              onClick={() => { setSelectedLocation(loc); setExpandedDay(null); }}
              className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition-colors border ${
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
            className="min-h-11 rounded-xl px-4 py-2 text-sm font-medium border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            {translateInterface("addLocation")}
          </Link>
        </div>

        {/* ── hero section ── */}
        {loading ? (
          <div className="rounded-2xl bg-card/60 backdrop-blur-sm p-12 text-center text-muted-foreground">
            <div className="text-5xl mb-4 animate-pulse">
              <WeatherIcon name="CloudSun" size={48} className="mx-auto" />
            </div>
            <p>{translateInterface("m8606e2e31bf4")}</p>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-border bg-card p-6">
            <AlertCircle className="mb-3 h-5 w-5 text-destructive" />
            <h2 className="mb-2 text-lg font-semibold">{translateInterface("weatherUnavailable")}</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={() => fetchCurrent(selectedLocation ?? undefined)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm"><RefreshCw className="h-4 w-4" />{translateInterface("tryAgain")}</button>
          </div>
        ) : !currentData ? (
          <div className="rounded-2xl bg-card/60 backdrop-blur-sm p-12 text-center">
            <div className="text-6xl mb-4">
              <MapPin size={48} className="mx-auto text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-6">
              {locations.length ? translateInterface("chooseSavedLocation") : translateInterface("addFirstLocation")}
            </p>
            <Link
              href="/locations"
              className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {locations.length ? translateInterface("manageLocations") : translateInterface("addLocation")}
            </Link>
          </div>
        ) : (
          <section className="weather-current">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <MapPin size={18} className="text-primary shrink-0" />
                  <h2 className="text-2xl font-semibold text-foreground break-words">
                    {currentData.location_name}
                  </h2>
                </div>
                {locationSubtitle && (
                  <p className="text-sm text-muted-foreground ml-[26px] mb-4">
                    {locationSubtitle}
                  </p>
                )}
                <div className="text-[4.5rem] md:text-[6.5rem] font-light tracking-tighter text-foreground leading-none">
                  {currentData.temperature}
                </div>
                <p className="text-lg text-muted-foreground mt-1">
                  {getWeatherCondition(currentData.current.weather_code, currentData.current.is_day, conditionText).description}
                </p>
                <p className="text-sm text-muted-foreground">
                  {translateInterface("mc72137c4af3a")}{" "}{currentData.feels_like}
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
                  {translateInterface("weatherHigh", {temperature: formatTemperature(forecastData.daily.temperature_2m_max[0] ?? 0, prefs.temperature_unit)})}{" "}
                  {translateInterface("weatherLow", {temperature: formatTemperature(forecastData.daily.temperature_2m_min[0] ?? 0, prefs.temperature_unit)})}
                </span>
              )}
              <span className="opacity-25">|</span>
              <span className="flex items-center gap-1">
                <Wind size={14} />
                {formatWindSpeed(currentData.current.wind_speed, prefs.wind_speed_unit, interfaceLocale)}{" "}
                {windDirectionToCompass(currentData.current.wind_direction, interfaceLocale)}
              </span>
              {forecastData && (
                <>
                  <span className="opacity-25">|</span>
                  <span className="flex items-center gap-1">
                    <Droplets size={14} className="text-blue-400" />
                    {translateInterface("ma6d20aa6a4c7")}{" "}
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
                aria-pressed={activeTab === tab}
                onClick={() => {
                  setActiveTab(tab);
                  setExpandedDay(null);
                }}
                className={`min-h-11 px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab === "today" ? translateInterface("m2b065c7c9ce4") : tab === "hourly" ? translateInterface("meab0cd8fdf9b") : translateInterface("mbd4189eb36a9")}
              </button>
            ))}
          </div>
        )}

        {forecastError && !loading && currentData && <div role="alert" className="rounded-xl border border-border bg-card p-4 text-sm">
          <p>{translateInterface("forecastUnavailable")}</p>
          <button onClick={() => fetchCurrent(selectedLocation ?? undefined)} className="mt-2 inline-flex min-h-11 items-center gap-2 font-medium"><RefreshCw className="h-4 w-4" />{translateInterface("retryForecast")}</button>
        </div>}
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
                <div className="rounded-2xl bg-card border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b border-border/10 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {translateInterface("m3181eed107eb")}
                    </h3>
                    <button
                      onClick={() => setActiveTab("7day")}
                      className="text-xs text-primary hover:underline"
                    >
                      {translateInterface("md7a8c446069a")}</button>
                  </div>
                  {forecastData.daily.time.map((dateStr, i) => {
                    const date = new Date(dateStr + "T12:00:00");
                    const dayName =
                      i === 0 ? translateInterface("today") : new Intl.DateTimeFormat(interfaceLocale, { weekday: "short" }).format(date);
                    const cond = getWeatherCondition(
                      forecastData.daily.weather_code[i] ?? 0,
                      true, conditionText
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
                      ? translateInterface("today")
                      : new Intl.DateTimeFormat(interfaceLocale, { weekday: "long" }).format(date);
                  const cond = getWeatherCondition(
                    forecastData.daily.weather_code[i] ?? 0,
                    true, conditionText
                  );
                  const isExpanded = expandedDay === i;
                  const hourStart = i * 24;

                  return (
                    <div
                      key={dateStr}
                      className="rounded-xl bg-card border border-border overflow-hidden"
                    >
                      <button
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedDay(isExpanded ? null : i)}
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
                            prefs.wind_speed_unit, interfaceLocale,
                          )}{" "}
                          {translateInterface("m9baf3a40312f")}</span>
                        <span>
                          {translateInterface("m027fcbbc3e6f")}{" "}
                          {forecastData.daily.uv_index_max[i] ?? 0}
                        </span>
                      </div>

                      {/* expanded hourly */}
                      {isExpanded && (
                        <div className="border-t border-border/10 px-4 pb-4 pt-3">
                          <p className="text-sm font-medium text-muted-foreground mb-3">
                            {translateInterface("meab0cd8fdf9b")}
                          </p>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {forecastData.hourly.time
                              .slice(hourStart, hourStart + 24)
                              .map((time, hi) => {
                                const gi = hourStart + hi;
                                const hCond = getWeatherCondition(
                                  forecastData.hourly.weather_code[gi] ?? 0,
                                  (forecastData.hourly.is_day[gi] ?? 1) === 1, conditionText
                                );
                                return (
                                  <div
                                    key={time}
                                    className="flex items-center gap-3 text-sm py-1"
                                  >
                                    <span className="w-16 text-muted-foreground text-xs">
                                      {new Date(time).toLocaleTimeString(interfaceLocale, {
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
  const conditionText = useConditionTranslations("weather.conditions");

  const interfaceLocale = useInterfaceLocale();

  const translateInterface = useInterfaceTranslations("interface");

  const nowMs = Date.now();
  const startIdx = Math.max(
    0,
    hourly.time.findIndex((t) => new Date(t).getTime() >= nowMs - 1800000),
  );
  const hours = hourly.time.slice(startIdx, startIdx + 24);

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {translateInterface("m2832fde21ae2")}
      </h3>
      <div className="overflow-x-auto">
        <div className="flex gap-3 pb-1" style={{ minWidth: "max-content" }}>
          {hours.map((timeStr, i) => {
            const gi = startIdx + i;
            const isDay = (hourly.is_day[gi] ?? 1) === 1;
            const cond = getWeatherCondition(
              hourly.weather_code[gi] ?? 0,
              isDay, conditionText
            );
            const temp = formatTemperature(
              hourly.temperature_2m[gi] ?? 0,
              prefs.temperature_unit,
            );
            const isNow = i === 0;
            const label = isNow
              ? translateInterface("mfe18013d93d2")
              : new Date(timeStr).toLocaleTimeString(interfaceLocale, { hour: "numeric" });

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
  const translateInterface = useInterfaceTranslations("interface");

  const severity = getUVSeverity(uv);
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        {translateInterface("ma25c25db5066")}
      </h3>
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold ${severity.bg}`}
        >
          {Math.round(uv)}
        </div>
        <span className={`text-sm font-medium ${severity.text}`}>
          {translateInterface(severity.label)}
        </span>
      </div>
    </div>
  );
}

function HumidityCard({ humidity }: { humidity: number }) {
  const translateInterface = useInterfaceTranslations("interface");

  const comfort = getHumidityComfort(humidity);
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        {translateInterface("m46819ccb5e6d")}
      </h3>
      <div className="flex items-center gap-4">
        <Droplets size={32} className="text-blue-400 shrink-0" />
        <div>
          <p className="text-3xl font-semibold text-foreground">{humidity}%</p>
          <p className="text-sm text-muted-foreground">{translateInterface(comfort)}</p>
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
  const interfaceLocale = useInterfaceLocale();
  const translateInterface = useInterfaceTranslations("interface");

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
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        {translateInterface("mbdc8665f208c")}
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
          {fmtTime(sunrise, interfaceLocale)}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Sunset size={14} className="text-orange-500" />
          {fmtTime(sunset, interfaceLocale)}
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
  const conditionText = useConditionTranslations("weather.conditions");

  const interfaceLocale = useInterfaceLocale();

  const hours = hourly.time.slice(0, 48);
  const temps = hourly.temperature_2m.slice(0, 48);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {hours.map((timeStr, i) => {
        const time = new Date(timeStr);
        const timeLabel = time.toLocaleTimeString(interfaceLocale, {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dateLabel =
          i === 0 || time.getHours() === 0
            ? time.toLocaleDateString(interfaceLocale, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : null;
        const temp = hourly.temperature_2m[i] ?? 0;
        const isDay = (hourly.is_day[i] ?? 1) === 1;
        const cond = getWeatherCondition(hourly.weather_code[i] ?? 0, isDay, conditionText);
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
