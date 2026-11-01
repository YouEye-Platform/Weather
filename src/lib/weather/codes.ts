interface WeatherCondition {
  readonly description: string;
  readonly message: string;
  readonly icon: string;        // Lucide icon name
  readonly iconNight: string;   // Lucide icon name for night
  readonly category: string;
}

export const WMO_CODES: Record<number, WeatherCondition> = {
  0:  { description: "Clear sky", message: "clear_sky",                      icon: "Sun",            iconNight: "Moon",            category: "clear" },
  1:  { description: "Mainly clear", message: "mainly_clear",                   icon: "Sun",            iconNight: "Moon",            category: "clear" },
  2:  { description: "Partly cloudy", message: "partly_cloudy",                  icon: "CloudSun",       iconNight: "CloudMoon",       category: "cloudy" },
  3:  { description: "Overcast", message: "overcast",                       icon: "Cloud",          iconNight: "Cloud",           category: "cloudy" },
  45: { description: "Foggy", message: "foggy",                          icon: "CloudFog",       iconNight: "CloudFog",        category: "fog" },
  48: { description: "Depositing rime fog", message: "depositing_rime_fog",            icon: "CloudFog",       iconNight: "CloudFog",        category: "fog" },
  51: { description: "Light drizzle", message: "light_drizzle",                  icon: "CloudDrizzle",   iconNight: "CloudDrizzle",    category: "drizzle" },
  53: { description: "Moderate drizzle", message: "moderate_drizzle",               icon: "CloudDrizzle",   iconNight: "CloudDrizzle",    category: "drizzle" },
  55: { description: "Dense drizzle", message: "dense_drizzle",                  icon: "CloudDrizzle",   iconNight: "CloudDrizzle",    category: "drizzle" },
  56: { description: "Freezing drizzle", message: "freezing_drizzle",               icon: "CloudSnow",      iconNight: "CloudSnow",       category: "drizzle" },
  57: { description: "Dense freezing drizzle", message: "dense_freezing_drizzle",         icon: "CloudSnow",      iconNight: "CloudSnow",       category: "drizzle" },
  61: { description: "Slight rain", message: "slight_rain",                    icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  63: { description: "Moderate rain", message: "moderate_rain",                  icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  65: { description: "Heavy rain", message: "heavy_rain",                     icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  66: { description: "Freezing rain", message: "freezing_rain",                  icon: "CloudSnow",      iconNight: "CloudSnow",       category: "rain" },
  67: { description: "Heavy freezing rain", message: "heavy_freezing_rain",            icon: "CloudSnow",      iconNight: "CloudSnow",       category: "rain" },
  71: { description: "Slight snow", message: "slight_snow",                    icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  73: { description: "Moderate snow", message: "moderate_snow",                  icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  75: { description: "Heavy snow", message: "heavy_snow",                     icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  77: { description: "Snow grains", message: "snow_grains",                    icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  80: { description: "Slight rain showers", message: "slight_rain_showers",            icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  81: { description: "Moderate rain showers", message: "moderate_rain_showers",          icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  82: { description: "Violent rain showers", message: "violent_rain_showers",           icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  85: { description: "Slight snow showers", message: "slight_snow_showers",            icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  86: { description: "Heavy snow showers", message: "heavy_snow_showers",             icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  95: { description: "Thunderstorm", message: "thunderstorm",                   icon: "CloudLightning", iconNight: "CloudLightning",  category: "thunderstorm" },
  96: { description: "Thunderstorm with slight hail", message: "thunderstorm_slight_hail",  icon: "CloudLightning", iconNight: "CloudLightning",  category: "thunderstorm" },
  99: { description: "Thunderstorm with heavy hail", message: "thunderstorm_heavy_hail",   icon: "CloudLightning", iconNight: "CloudLightning",  category: "thunderstorm" },
};

export function getWeatherCondition(code: number, isDay: boolean, translate?: (key: string) => string): { description: string; icon: string } {
  const condition = WMO_CODES[code] ?? WMO_CODES[0]!;
  return {
    description: translate ? translate(condition.message) : condition.description,
    icon: isDay ? condition.icon : condition.iconNight,
  };
}
