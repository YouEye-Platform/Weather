"use client";

import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog,
  CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning,
  type LucideProps,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog,
  CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning,
};

const ICON_COLORS: Record<string, string> = {
  Sun: "text-amber-500",
  Moon: "text-indigo-300",
  CloudSun: "text-amber-400",
  CloudMoon: "text-indigo-300",
  Cloud: "text-slate-400 dark:text-slate-500",
  CloudFog: "text-slate-400 dark:text-slate-500",
  CloudDrizzle: "text-blue-400",
  CloudRain: "text-blue-500",
  CloudSnow: "text-sky-400",
  Snowflake: "text-sky-300",
  CloudLightning: "text-yellow-500",
};

export function WeatherIcon({
  name,
  size = 24,
  className = "",
  colored = true,
}: {
  name: string;
  size?: number;
  className?: string;
  colored?: boolean;
}) {
  const Icon = ICON_MAP[name] ?? Sun;
  const colorClass = colored ? (ICON_COLORS[name] ?? "text-amber-500") : "";
  return <Icon size={size} className={`${colorClass} ${className}`.trim()} />;
}
