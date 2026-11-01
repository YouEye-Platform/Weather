import { getActivityTranslator } from "@/i18n/activity";
/**
 * Weather Timeline Event Emitters
 *
 * Posts timeline entries to YE-UI for weather checks and location additions.
 * Each entry includes:
 *   - embed_path: lean URL for rich iframe card in timeline
 *   - data: structured content for fallback/API access
 *   - tags: machine-readable metadata for filtering
 *
 * Debounced per userId+key to prevent duplicate entries.
 */

import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-weather");
const postTimelineEntry = api.postTimelineEntry.bind(api);

const debounceCache = new Map<string, number>();
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

async function emitIfNotDebounced(
  userId: string,
  key: string,
  collection: string,
  entry: Record<string, unknown>
): Promise<void> {
  const debounceKey = `${userId}:${key}`;
  const last = debounceCache.get(debounceKey) ?? 0;
  if (Date.now() - last < DEBOUNCE_MS) return;
  debounceCache.set(debounceKey, Date.now());

  if (debounceCache.size > 1000) {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, v] of debounceCache.entries()) {
      if (v < cutoff) debounceCache.delete(k);
    }
  }

  try {
    await postTimelineEntry(userId, collection, entry);
  } catch {
    // Timeline is best-effort
  }
}

// ─── Weather Check ──────────────────────────────────────────────

export async function emitWeatherCheckEvent(
  userId: string,
  locationName: string,
  locationId: string,
  temperature: string,
  condition: string,
  domain: string,
  lat: number,
  lon: number,
  timestamp = new Date().toISOString()
): Promise<void> {
  const { t } = await getActivityTranslator(userId);
  await emitIfNotDebounced(userId, `weather-check:${locationId}`, "history", {
    timestamp,
    app_id: "weather",
    entry_type: "weather-check",
    title: t("m86fa20eae879", {location: locationName, temperature, condition}),
    embed_path: `/embed/timeline/weather?lat=${lat}&lon=${lon}&loc=${encodeURIComponent(locationName)}&temp=${encodeURIComponent(temperature)}&cond=${encodeURIComponent(condition)}`,
    tags: { location: locationName },
    data: {
      description: t("m3467250f5832", {location: locationName, temperature, condition}),
      temperature,
      condition,
      location_name: locationName,
      location_id: locationId,
      lat,
      lon,
      url: `https://weather.${domain}/?location=${locationId}`,
    },
  });
}

// ─── Location Added ─────────────────────────────────────────────

export async function emitLocationAddedEvent(
  userId: string,
  locationName: string,
  locationId: string,
  domain: string,
  lat: number,
  lon: number,
  timestamp = new Date().toISOString()
): Promise<void> {
  const { t } = await getActivityTranslator(userId);
  await emitIfNotDebounced(userId, `location-added:${locationId}`, "history", {
    timestamp,
    app_id: "weather",
    entry_type: "weather-location-added",
    title: t("ma3498e7aa120", {location: locationName}),
    embed_path: `/embed/timeline/weather?lat=${lat}&lon=${lon}&loc=${encodeURIComponent(locationName)}&action=added`,
    tags: { location: locationName },
    data: {
      description: t("m9be542436da1", {location: locationName}),
      location_name: locationName,
      location_id: locationId,
      lat,
      lon,
      url: `https://weather.${domain}/locations`,
    },
  });
}
