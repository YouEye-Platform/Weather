import { getSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/migrate";
import { fetchWeather } from "@/lib/weather/client";
import { formatTemperature, formatWindSpeed } from "@/lib/weather/units";
import { getWeatherCondition } from "@/lib/weather/codes";
import { query } from "@/lib/db/client";
import { resolveWeatherDataUserId } from "@/lib/weather/user-id";
import type { UserPreferences, SavedLocation, WeatherData } from "@/lib/weather/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEATHER_ICONS: Record<string, string> = {
  Sun: "\u2600\uFE0F",
  Moon: "\uD83C\uDF19",
  CloudSun: "\u26C5",
  CloudMoon: "\u2601\uFE0F",
  Cloud: "\u2601\uFE0F",
  CloudFog: "\uD83C\uDF2B\uFE0F",
  CloudDrizzle: "\uD83C\uDF27\uFE0F",
  CloudRain: "\uD83C\uDF27\uFE0F",
  CloudSnow: "\uD83C\uDF28\uFE0F",
  Snowflake: "\u2744\uFE0F",
  CloudLightning: "\u26C8\uFE0F",
};

function getEmoji(iconName: string): string {
  return WEATHER_ICONS[iconName] ?? "\uD83C\uDF24\uFE0F";
}

interface WeatherContext {
  readonly weather: WeatherData;
  readonly location: SavedLocation;
  readonly prefs: UserPreferences;
}

async function loadWeatherContext(userId: string): Promise<WeatherContext | null> {
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

  if (!prefs.default_location_id) return null;

  const locResult = await query<SavedLocation>(
    `SELECT * FROM saved_locations WHERE id = $1 AND user_id = $2`,
    [prefs.default_location_id, userId]
  );
  const location = locResult.rows[0];
  if (!location) return null;

  const weather = await fetchWeather(
    location.latitude,
    location.longitude,
    location.timezone,
    prefs.temperature_unit,
    prefs.wind_speed_unit,
    prefs.precipitation_unit,
    userId
  );
  if (!weather) return null;

  return { weather, location, prefs };
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[120px] p-4">
      <p className="text-sm text-muted-foreground/70">{message}</p>
    </div>
  );
}

function CurrentWeatherWidget({ ctx }: { ctx: WeatherContext }) {
  const { weather, location, prefs } = ctx;
  const condition = getWeatherCondition(weather.current.weather_code, weather.current.is_day);
  const emoji = getEmoji(condition.icon);

  return (
    <div className="h-full p-2">
      <div className="h-full rounded-xl bg-card/50 backdrop-blur-md border border-border/20 p-4 flex flex-col gap-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
          {location.name}
        </p>

        <div className="flex items-center gap-3">
          <span className="text-4xl leading-none" aria-hidden="true">{emoji}</span>
          <div>
            <p className="text-3xl font-semibold leading-tight">
              {formatTemperature(weather.current.temperature, prefs.temperature_unit)}
            </p>
            <p className="text-sm text-muted-foreground">{condition.description}</p>
          </div>
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground mt-auto">
          <span>
            Feels {formatTemperature(weather.current.apparent_temperature, prefs.temperature_unit)}
          </span>
          <span>
            Humidity {weather.current.humidity}%
          </span>
          <span>
            Wind {formatWindSpeed(weather.current.wind_speed, prefs.wind_speed_unit)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ForecastWeatherWidget({ ctx }: { ctx: WeatherContext }) {
  const { weather, location, prefs } = ctx;
  const days = weather.daily.time.slice(0, 5);

  return (
    <div className="h-full p-2">
      <div className="h-full rounded-xl bg-card/50 backdrop-blur-md border border-border/20 p-4 flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
          {location.name} — 5-Day Forecast
        </p>

        <div className="flex flex-col gap-1 mt-1">
          {days.map((dateStr, i) => {
            const date = new Date(dateStr + "T12:00:00");
            const dayName = i === 0 ? "Today" : DAY_NAMES[date.getDay()] ?? dateStr;
            const condition = getWeatherCondition(weather.daily.weather_code[i] ?? 0, true);
            const emoji = getEmoji(condition.icon);
            const high = formatTemperature(weather.daily.temperature_2m_max[i] ?? 0, prefs.temperature_unit);
            const low = formatTemperature(weather.daily.temperature_2m_min[i] ?? 0, prefs.temperature_unit);

            return (
              <div key={dateStr} className="flex items-center gap-2 py-1 text-sm">
                <span className="w-12 font-medium truncate">{dayName}</span>
                <span className="text-base" aria-hidden="true">{emoji}</span>
                <span className="flex-1 text-muted-foreground truncate text-xs">
                  {condition.description}
                </span>
                <span className="tabular-nums text-right whitespace-nowrap">
                  <span className="font-medium">{high}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-muted-foreground">{low}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default async function EmbedWidgetPage({
  params,
}: {
  params: Promise<{ widgetId: string }>;
}) {
  const { widgetId } = await params;
  const session = await getSession("ye-weather").catch(() => null);

  if (!session) {
    return <EmptyState message="Sign in to see weather data." />;
  }

  try {
    const dataUserId = await resolveWeatherDataUserId(session.userId);
    const ctx = await loadWeatherContext(dataUserId);

    if (!ctx) {
      return <EmptyState message="No default location set. Open Weather to add one." />;
    }

    if (widgetId === "weather-current") {
      return <CurrentWeatherWidget ctx={ctx} />;
    }

    if (widgetId === "weather-forecast") {
      return <ForecastWeatherWidget ctx={ctx} />;
    }

    return <EmptyState message={`Unknown widget: ${widgetId}`} />;
  } catch {
    return <EmptyState message="Weather data unavailable." />;
  }
}
