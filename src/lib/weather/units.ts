export function formatTemperature(value: number, unit: "celsius" | "fahrenheit"): string {
  const rounded = Math.round(value);
  return unit === "celsius" ? `${rounded}°C` : `${rounded}°F`;
}

export function formatWindSpeed(value: number, unit: "kmh" | "mph" | "ms" | "knots"): string {
  const rounded = Math.round(value);
  const labels: Record<string, string> = { kmh: "km/h", mph: "mph", ms: "m/s", knots: "kn" };
  return `${rounded} ${labels[unit] ?? "km/h"}`;
}

export function windDirectionToCompass(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index]!;
}

export function formatPrecipitation(value: number, unit: "mm" | "inch"): string {
  return unit === "mm" ? `${value.toFixed(1)} mm` : `${value.toFixed(2)} in`;
}
