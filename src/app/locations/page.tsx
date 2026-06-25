"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Star, Trash2 } from "lucide-react";
import { WeatherIcon } from "@/components/weather/weather-icon";
import type { SavedLocation, GeocodingResult, UserPreferences } from "@/lib/weather/types";
import { formatTemperature } from "@/lib/weather/units";
import { getWeatherCondition } from "@/lib/weather/codes";

export default function LocationsPage() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [locationTemps, setLocationTemps] = useState<Record<string, { temp: string; icon: string }>>({});

  const loadData = useCallback(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d.data ?? []));
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => setPrefs(d.data ?? null));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Lazy load current temps for each location
  useEffect(() => {
    for (const loc of locations) {
      if (locationTemps[loc.id]) continue;
      fetch(`/api/weather/current?lat=${loc.latitude}&lon=${loc.longitude}&tz=${encodeURIComponent(loc.timezone)}&location_id=${loc.id}&location_name=${encodeURIComponent(loc.name)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data) {
            setLocationTemps((prev) => ({
              ...prev,
              [loc.id]: { temp: d.data.temperature, icon: d.data.icon },
            }));
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  // Debounced geocode search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/weather/geocode?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(d.results ?? []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addLocation = async (geo: GeocodingResult) => {
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: geo.name,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezone,
        country: geo.country,
        country_code: geo.country_code,
        admin1: geo.admin1,
      }),
    });
    if (res.ok) {
      setSearchQuery("");
      setSearchResults([]);
      loadData();
    }
  };

  const setDefault = async (id: string) => {
    setSettingDefault(id);
    await fetch(`/api/locations/${id}/default`, { method: "PUT" });
    setSettingDefault(null);
    loadData();
  };

  const deleteLocation = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    setDeleting(id);
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/30 via-background to-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
          <h1 className="text-2xl font-bold">Manage Locations</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cities..."
            className="w-full rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-pulse">
              <Search size={18} />
            </span>
          )}

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border/40 bg-popover shadow-lg overflow-hidden">
              {searchResults.map((geo) => (
                <button
                  key={geo.id}
                  onClick={() => addLocation(geo)}
                  className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/10 last:border-b-0"
                >
                  <p className="font-medium text-foreground">{geo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[geo.admin1, geo.country].filter(Boolean).join(", ")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved locations */}
        {locations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="mb-4 flex justify-center"><WeatherIcon name="Sun" size={48} /></div>
            <p>No saved locations. Search above to add one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => {
              const weatherData = locationTemps[loc.id];
              const isDefault = prefs?.default_location_id === loc.id;
              return (
                <div key={loc.id} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 flex items-center gap-3">
                  {/* Weather icon */}
                  <div className="w-8 flex justify-center">
                    {weatherData ? (
                      <WeatherIcon name={weatherData.icon} size={24} />
                    ) : (
                      <WeatherIcon name="Sun" size={24} className="animate-pulse opacity-30" />
                    )}
                  </div>

                  {/* Location info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{loc.name}</p>
                      {isDefault && (
                        <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[loc.admin1, loc.country].filter(Boolean).join(", ")}
                    </p>
                  </div>

                  {/* Temp */}
                  {weatherData && (
                    <span className="text-sm font-semibold text-foreground">{weatherData.temp}</span>
                  )}

                  {/* Star / default button */}
                  <button
                    onClick={() => setDefault(loc.id)}
                    disabled={settingDefault === loc.id || isDefault}
                    className={`p-2 rounded-lg transition-colors ${
                      isDefault
                        ? "text-yellow-500"
                        : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                    }`}
                    title={isDefault ? "Default location" : "Set as default"}
                  >
                    <Star size={18} fill={isDefault ? "currentColor" : "none"} />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => deleteLocation(loc.id)}
                    disabled={deleting === loc.id}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete location"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
