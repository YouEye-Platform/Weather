/**
 * next-intl request configuration for YE-App-Weather
 *
 * Fetches the platform locale from the UI app gateway. Native apps never call
 * the Control Panel directly.
 */

import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["en", "ru", "es", "de", "fr"];
const DEFAULT_LOCALE = "en";

let langCache: { locale: string; expiresAt: number } | null = null;
const CACHE_TTL = 60_000;

function gatewayUrl(): string | null {
  if (process.env.YOUEYE_GATEWAY) return process.env.YOUEYE_GATEWAY.replace(/\/$/, "");
  if (process.env.YOUEYE_API_URL) {
    return `${process.env.YOUEYE_API_URL.replace(/\/api\/v\d+$/, "")}/api/apps/v1`;
  }
  return null;
}

async function getLanguageFromPlatform(): Promise<string> {
  const now = Date.now();
  if (langCache && now < langCache.expiresAt) return langCache.locale;

  try {
    const token = process.env.YOUEYE_APP_TOKEN;
    const base = gatewayUrl();
    if (!token || !base) return DEFAULT_LOCALE;

    const res = await fetch(`${base}/platform`, {
      headers: {
        "X-YouEye-App": process.env.YOUEYE_APP_ID || "weather",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json() as { locale?: string };
      const locale = SUPPORTED_LOCALES.includes(data.locale ?? "")
        ? (data.locale as string)
        : DEFAULT_LOCALE;
      langCache = { locale, expiresAt: now + CACHE_TTL };
      return locale;
    }
  } catch {
    // Platform API unavailable — fall back gracefully
  }

  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await getLanguageFromPlatform();

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import("../../messages/en.json")).default;
  }

  return { locale, messages };
});
