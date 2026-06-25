"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import type { UserPreferences } from "@/lib/weather/types";

type TempUnit = "celsius" | "fahrenheit";
type WindUnit = "kmh" | "mph" | "ms" | "knots";
type PrecipUnit = "mm" | "inch";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 flex items-center justify-center"><div className="text-muted-foreground animate-pulse">Loading settings...</div></div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  return <WeatherSettingsPanel />;
}

export function WeatherSettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const [prefs, setPrefs] = useState<UserPreferences>({
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    default_location_id: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => { if (d.data) setPrefs(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature_unit: prefs.temperature_unit,
          wind_speed_unit: prefs.wind_speed_unit,
          precipitation_unit: prefs.precipitation_unit,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className={embedded ? "p-4" : "min-h-screen bg-gradient-to-br from-blue-950/30 via-background to-background p-4 md:p-8"}>
      <div className="mx-auto max-w-xl space-y-6">
        {!embedded && (
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
        )}

        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 space-y-6">

          {/* Temperature unit */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Temperature Unit</label>
            <p className="text-xs text-muted-foreground mb-3">Choose your preferred temperature display</p>
            <div className="flex gap-2">
              {(["celsius", "fahrenheit"] as TempUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setPrefs((p) => ({ ...p, temperature_unit: u }))}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    prefs.temperature_unit === u
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/40 text-foreground hover:bg-card"
                  }`}
                >
                  {u === "celsius" ? "Celsius (°C)" : "Fahrenheit (°F)"}
                </button>
              ))}
            </div>
          </div>

          {/* Wind speed unit */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Wind Speed</label>
            <p className="text-xs text-muted-foreground mb-3">How wind speed is displayed</p>
            <div className="flex gap-2 flex-wrap">
              {(["kmh", "mph", "ms", "knots"] as WindUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setPrefs((p) => ({ ...p, wind_speed_unit: u }))}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    prefs.wind_speed_unit === u
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/40 text-foreground hover:bg-card"
                  }`}
                >
                  {u === "kmh" ? "km/h" : u === "mph" ? "mph" : u === "ms" ? "m/s" : "knots"}
                </button>
              ))}
            </div>
          </div>

          {/* Precipitation unit */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Precipitation</label>
            <p className="text-xs text-muted-foreground mb-3">Millimeters or inches</p>
            <div className="flex gap-2">
              {(["mm", "inch"] as PrecipUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setPrefs((p) => ({ ...p, precipitation_unit: u }))}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    prefs.precipitation_unit === u
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/40 text-foreground hover:bg-card"
                  }`}
                >
                  {u === "mm" ? "Millimeters (mm)" : "Inches (in)"}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {saved && <span className="text-sm text-green-500">✓ Saved</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
