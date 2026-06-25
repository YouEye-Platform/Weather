export interface GeocodingResult {
  readonly id: number;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
  readonly country: string;
  readonly country_code: string;
  readonly admin1?: string;
}

export interface CurrentWeather {
  readonly temperature: number;
  readonly apparent_temperature: number;
  readonly humidity: number;
  readonly weather_code: number;
  readonly is_day: boolean;
  readonly wind_speed: number;
  readonly wind_direction: number;
  readonly wind_gusts: number;
  readonly cloud_cover: number;
  readonly pressure: number;
  readonly precipitation: number;
}

export interface HourlyForecast {
  readonly time: readonly string[];
  readonly temperature_2m: readonly number[];
  readonly apparent_temperature: readonly number[];
  readonly precipitation_probability: readonly number[];
  readonly precipitation: readonly number[];
  readonly weather_code: readonly number[];
  readonly wind_speed_10m: readonly number[];
  readonly is_day: readonly number[];
  readonly relative_humidity_2m: readonly number[];
}

export interface DailyForecast {
  readonly time: readonly string[];
  readonly weather_code: readonly number[];
  readonly temperature_2m_max: readonly number[];
  readonly temperature_2m_min: readonly number[];
  readonly apparent_temperature_max: readonly number[];
  readonly apparent_temperature_min: readonly number[];
  readonly sunrise: readonly string[];
  readonly sunset: readonly string[];
  readonly uv_index_max: readonly number[];
  readonly precipitation_sum: readonly number[];
  readonly precipitation_probability_max: readonly number[];
  readonly wind_speed_10m_max: readonly number[];
}

export interface WeatherData {
  readonly current: CurrentWeather;
  readonly hourly: HourlyForecast;
  readonly daily: DailyForecast;
  readonly timezone: string;
}

// DB row types — intersection with Record<string, unknown> to satisfy query<T> constraint
export type SavedLocation = Record<string, unknown> & {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country: string | null;
  country_code: string | null;
  admin1: string | null;
  sort_order: number;
  created_at: string;
};

export type UserPreferences = Record<string, unknown> & {
  temperature_unit: "celsius" | "fahrenheit";
  wind_speed_unit: "kmh" | "mph" | "ms" | "knots";
  precipitation_unit: "mm" | "inch";
  default_location_id: string | null;
};
