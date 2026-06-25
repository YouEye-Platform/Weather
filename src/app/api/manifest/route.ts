import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export async function GET() {
  return NextResponse.json({
    id: "ye-weather",
    name: "Weather",
    version: packageJson.version,
    description: "Weather forecasts and conditions for your saved locations",
    icon: "CloudSun",
    permissions: ["timeline:write", "widgets:register"],
  surfaceSchemaVersion: 1,
    surfaces: [
    {
      id: "app-settings",
      kind: "settings-panel",
      placement: "app-settings",
      name: "App Settings",
      description: "App-owned settings panel",
      embedPath: "/embed/settings",
      permissions: [],
    },
      {
        id: "weather-current",
        kind: "widget",
        placement: "dashboard",
        name: "Current Weather",
        description: "Current conditions for your default location",
        embedPath: "/embed/widget/weather-current",
        permissions: [],
        defaultSize: { width: 22, height: 28 },
        minSize: { width: 15, height: 20 },
        maxSize: { width: 35, height: 40 },
        refreshInterval: 600,
      },
      {
        id: "weather-forecast",
        kind: "widget",
        placement: "dashboard",
        name: "Weather Forecast",
        description: "5-day forecast for your default location",
        embedPath: "/embed/widget/weather-forecast",
        permissions: [],
        defaultSize: { width: 35, height: 25 },
        minSize: { width: 25, height: 18 },
        maxSize: { width: 50, height: 40 },
        refreshInterval: 1800,
      },
      {
        id: "weather-summary",
        kind: "info-card",
        placement: "timeline",
        name: "Weather summary",
        description: "Current weather conditions for a location",
        embedPath: "/embed/card/weather",
        permissions: [],
      },
      {
        id: "weather-check",
        kind: "timeline-card",
        placement: "timeline",
        name: "Weather checked",
        description: "Weather checked for a location",
        embedPath: "/embed/timeline/weather",
        permissions: ["timeline:write"],
        triggers: ["weather-check"],
      },
      {
        id: "weather-location-added",
        kind: "timeline-card",
        placement: "timeline",
        name: "Weather location added",
        description: "Weather location added",
        embedPath: "/embed/timeline/weather",
        permissions: ["timeline:write"],
        triggers: ["weather-location-added"],
      },
    ],
    internet: {
      proxy: [
        { host: "geocoding-api.open-meteo.com", paths: ["/v1/search*"], methods: ["GET"], scope: "user" },
        { host: "api.open-meteo.com", paths: ["/v1/forecast*"], methods: ["GET"], scope: "user" },
      ],
    },
    inter_app: {
      provides: [
        { type: "weather-summary", description: "Current weather for a location" },
        { type: "search", description: "Search saved weather locations" },
      ],
    },
    settings: {
      schema: [
        {
          key: "temperature_unit",
          type: "select",
          label: "Temperature Unit",
          default: "celsius",
          options: [
            { label: "Celsius (°C)", value: "celsius" },
            { label: "Fahrenheit (°F)", value: "fahrenheit" },
          ],
        },
        {
          key: "wind_speed_unit",
          type: "select",
          label: "Wind Speed",
          default: "kmh",
          options: [
            { label: "km/h", value: "kmh" },
            { label: "mph", value: "mph" },
            { label: "m/s", value: "ms" },
          ],
        },
      ],
    },
  });
}
