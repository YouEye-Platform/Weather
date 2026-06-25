import { createApiClient } from "@/lib/api";
import { query } from "@/lib/db/client";
import { ensureSchema } from "@/lib/db/migrate";

interface HeaderUser {
  app_data_user_id?: string | null;
  identity_id?: string | null;
}

async function hasPreferences(userId: string): Promise<boolean> {
  const result = await query<{ user_id: string }>(
    `SELECT user_id FROM user_preferences WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}

async function getFallbackDataUserId(sessionUserId: string): Promise<string | null> {
  const api = createApiClient("ye-weather");
  const headerConfig = await api.fetchHeaderConfig(sessionUserId);
  const user = headerConfig?.user as HeaderUser | undefined;
  return user?.app_data_user_id ?? user?.identity_id ?? null;
}

export async function resolveWeatherDataUserId(sessionUserId: string): Promise<string> {
  await ensureSchema();

  if (await hasPreferences(sessionUserId)) return sessionUserId;

  const fallbackUserId = await getFallbackDataUserId(sessionUserId).catch(() => null);
  if (!fallbackUserId || fallbackUserId === sessionUserId) return sessionUserId;

  if (await hasPreferences(fallbackUserId)) return fallbackUserId;
  return sessionUserId;
}
