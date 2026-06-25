interface WeatherCondition {
  readonly description: string;
  readonly icon: string;        // Lucide icon name
  readonly iconNight: string;   // Lucide icon name for night
  readonly category: string;
}

export const WMO_CODES: Record<number, WeatherCondition> = {
  0:  { description: "Clear sky",                      icon: "Sun",            iconNight: "Moon",            category: "clear" },
  1:  { description: "Mainly clear",                   icon: "Sun",            iconNight: "Moon",            category: "clear" },
  2:  { description: "Partly cloudy",                  icon: "CloudSun",       iconNight: "CloudMoon",       category: "cloudy" },
  3:  { description: "Overcast",                       icon: "Cloud",          iconNight: "Cloud",           category: "cloudy" },
  45: { description: "Foggy",                          icon: "CloudFog",       iconNight: "CloudFog",        category: "fog" },
  48: { description: "Depositing rime fog",            icon: "CloudFog",       iconNight: "CloudFog",        category: "fog" },
  51: { description: "Light drizzle",                  icon: "CloudDrizzle",   iconNight: "CloudDrizzle",    category: "drizzle" },
  53: { description: "Moderate drizzle",               icon: "CloudDrizzle",   iconNight: "CloudDrizzle",    category: "drizzle" },
  55: { description: "Dense drizzle",                  icon: "CloudDrizzle",   iconNight: "CloudDrizzle",    category: "drizzle" },
  56: { description: "Freezing drizzle",               icon: "CloudSnow",      iconNight: "CloudSnow",       category: "drizzle" },
  57: { description: "Dense freezing drizzle",         icon: "CloudSnow",      iconNight: "CloudSnow",       category: "drizzle" },
  61: { description: "Slight rain",                    icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  63: { description: "Moderate rain",                  icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  65: { description: "Heavy rain",                     icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  66: { description: "Freezing rain",                  icon: "CloudSnow",      iconNight: "CloudSnow",       category: "rain" },
  67: { description: "Heavy freezing rain",            icon: "CloudSnow",      iconNight: "CloudSnow",       category: "rain" },
  71: { description: "Slight snow",                    icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  73: { description: "Moderate snow",                  icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  75: { description: "Heavy snow",                     icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  77: { description: "Snow grains",                    icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  80: { description: "Slight rain showers",            icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  81: { description: "Moderate rain showers",          icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  82: { description: "Violent rain showers",           icon: "CloudRain",      iconNight: "CloudRain",       category: "rain" },
  85: { description: "Slight snow showers",            icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  86: { description: "Heavy snow showers",             icon: "Snowflake",      iconNight: "Snowflake",       category: "snow" },
  95: { description: "Thunderstorm",                   icon: "CloudLightning", iconNight: "CloudLightning",  category: "thunderstorm" },
  96: { description: "Thunderstorm with slight hail",  icon: "CloudLightning", iconNight: "CloudLightning",  category: "thunderstorm" },
  99: { description: "Thunderstorm with heavy hail",   icon: "CloudLightning", iconNight: "CloudLightning",  category: "thunderstorm" },
};

export function getWeatherCondition(code: number, isDay: boolean): { description: string; icon: string } {
  const condition = WMO_CODES[code] ?? WMO_CODES[0]!;
  return {
    description: condition.description,
    icon: isDay ? condition.icon : condition.iconNight,
  };
}
