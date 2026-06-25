/**
 * Root Layout — Weather App
 *
 * Fetches theme from YE-UI, applies CSS variables and dark/light mode.
 * Renders the full platform header with app drawer, notifications, etc.
 * Wraps content in NextIntlClientProvider for i18n support.
 */

import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-weather");
import {
  getThemeCSSVariables,
  getThemeMode,
  generateThemeStyle,
  generateSystemThemeScript,
} from "@/lib/theme";
import { WeatherHeader } from "@/components/layout/weather-header";
import { LaunchRequirementsBanner } from "@/components/launch-requirements-banner";
import { InstallBanner } from "@/components/pwa/install-banner";

export async function generateMetadata(): Promise<Metadata> {
  const appName = process.env.APP_NAME || "Weather";
  return {
    title: appName,
    description: "Weather forecasts and current conditions",
    icons: { icon: "/api/pwa/icon?size=32" },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: appName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#06b6d4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Try to get session for theme — will be null on auth routes
  const session = await getSession("ye-weather").catch(() => null);

  let headerConfig = null;
  let launchRequirements = null;
  if (session) {
    [headerConfig, launchRequirements] = await Promise.all([
      api.fetchHeaderConfig(session.userId),
      api.getLaunchRequirements(session.userId),
    ]);
  }

  const cssVariables = getThemeCSSVariables(headerConfig);
  const themeStyle = generateThemeStyle(cssVariables);
  const themeMode = getThemeMode(headerConfig);

  const isSystemTheme = themeMode === "system";
  const htmlClass = isSystemTheme ? "" : themeMode;

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={htmlClass} suppressHydrationWarning>
      <head>
        {isSystemTheme && (
          <script dangerouslySetInnerHTML={{ __html: generateSystemThemeScript() }} />
        )}
        {themeStyle && (
          <style
            id="ye-theme"
            dangerouslySetInnerHTML={{ __html: themeStyle }}
          />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          {session && <WeatherHeader />}
          {session && <LaunchRequirementsBanner appName="Weather" requirements={launchRequirements} />}
          <main>{children}</main>
          <InstallBanner appName="Weather" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
