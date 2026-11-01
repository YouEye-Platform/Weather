export function formatTemperature(value: number, unit: "celsius" | "fahrenheit"): string {
  const rounded = Math.round(value);
  return unit === "celsius" ? `${rounded}°C` : `${rounded}°F`;
}

export function formatWindSpeed(value: number, unit: "kmh" | "mph" | "ms" | "knots", locale = "en"): string {
  const units = {kmh: "kilometer-per-hour", mph: "mile-per-hour", ms: "meter-per-second"};
  if (unit === "knots") {
    const label = locale.split("-")[0] === "ru" ? "уз" : "kn";
    return `${new Intl.NumberFormat(locale, {maximumFractionDigits: 0}).format(value)} ${label}`;
  }
  return new Intl.NumberFormat(locale, {style: "unit", unit: units[unit], unitDisplay: "short", maximumFractionDigits: 0}).format(value);
}

export function windDirectionToCompass(degrees: number, locale = "en"): string {
  const directions: Record<string, string[]> = {
    en: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
    ru: ["С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"],
    es: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
    fr: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
    de: ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  };
  const index = ((Math.round(degrees / 22.5) % 16) + 16) % 16;
  return (directions[locale.toLowerCase().split("-")[0]] ?? directions.en)[index]!;
}

export function formatPrecipitation(value: number, unit: "mm" | "inch"): string {
  return unit === "mm" ? `${value.toFixed(1)} mm` : `${value.toFixed(2)} in`;
}
