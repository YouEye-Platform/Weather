/**
 * Weather Timeline Embed — Weather Card
 *
 * Compact card rendered as iframe inside YE-UI timeline entries.
 * All data comes from URL params (stateless).
 *
 * Query params:
 *   ?lat=51.5&lon=-0.12   — Coordinates
 *   &loc=London            — Location name
 *   &temp=18°C             — Temperature (for check events)
 *   &cond=Partly cloudy    — Condition (for check events)
 *   &action=added          — "added" for location-added events
 */

import { CloudSun, MapPin } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    lat?: string;
    lon?: string;
    loc?: string;
    temp?: string;
    cond?: string;
    action?: string;
  }>;
}

export default async function TimelineWeatherPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { loc = "Unknown", temp, cond, action } = params;

  const isAdded = action === "added";

  return (
    <div className="p-2.5">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded bg-sky-500/10 flex items-center justify-center shrink-0">
          {isAdded ? (
            <MapPin className="h-5 w-5 text-sky-500" />
          ) : (
            <CloudSun className="h-5 w-5 text-sky-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <CloudSun className="h-3.5 w-3.5 text-sky-500" />
            <span className="text-[11px] font-medium text-sky-500">
              {isAdded ? "Location Added" : "Weather Check"}
            </span>
          </div>

          <p className="text-sm font-semibold text-foreground line-clamp-1">
            {loc}
          </p>

          {!isAdded && temp && cond && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {temp}, {cond}
            </p>
          )}

          {isAdded && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Added to saved locations
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
