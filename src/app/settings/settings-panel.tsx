"use client";


import { useTranslations as useInterfaceTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { UserPreferences } from "@/lib/weather/types";

type TempUnit = "celsius" | "fahrenheit";
type WindUnit = "kmh" | "mph" | "ms" | "knots";
type PrecipUnit = "mm" | "inch";

export function WeatherSettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const translateInterface = useInterfaceTranslations("interface");

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
        <div className="text-muted-foreground animate-pulse">{translateInterface("m157fd50d1133")}</div>
      </div>
    );
  }

  return (
    <div className={embedded ? "p-4" : "min-h-screen bg-gradient-to-br from-blue-950/30 via-background to-background p-4 md:p-8"}>
      <div className="mx-auto max-w-xl space-y-6">
        {!embedded && (
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">{translateInterface("maceb696a04c1")}</Link>
            <h1 className="text-2xl font-bold">{translateInterface("m74a883a037bc")}</h1>
          </div>
        )}

        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 space-y-6">

          {/* Temperature unit */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{translateInterface("m47043d68c8b6")}</label>
            <p className="text-xs text-muted-foreground mb-3">{translateInterface("m99155ffdb89a")}</p>
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
                  {u === "celsius" ? translateInterface("m400b949d3863") : translateInterface("m9c9497df3469")}
                </button>
              ))}
            </div>
          </div>

          {/* Wind speed unit */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{translateInterface("m5d021bf0f777")}</label>
            <p className="text-xs text-muted-foreground mb-3">{translateInterface("m6ba048c03214")}</p>
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
                  {u === "kmh" ? translateInterface("m3c9db5a7f5e1") : u === "mph" ? translateInterface("mefcc859903e7") : u === "ms" ? "m/s" : translateInterface("me1404219ff5e")}
                </button>
              ))}
            </div>
          </div>

          {/* Precipitation unit */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{translateInterface("m123c1648c304")}</label>
            <p className="text-xs text-muted-foreground mb-3">{translateInterface("md4276625e2c1")}</p>
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
                  {u === "mm" ? translateInterface("mfed19d3a21f4") : translateInterface("mf831c59e0926")}
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
              {saving ? translateInterface("mdc85af8f2b1d") : translateInterface("mec92e1dc9bb3")}
            </button>
            {saved && <span className="text-sm text-green-500">{translateInterface("m45edcc201b73")}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
