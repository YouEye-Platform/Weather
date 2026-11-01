"use client";

import { useTranslations as useInterfaceTranslations } from "next-intl";
import { Suspense } from "react";
import { WeatherSettingsPanel } from "./settings-panel";

export default function SettingsPage() {
  const translateInterface = useInterfaceTranslations("interface");

  return (
    <Suspense fallback={<div className="min-h-screen p-8 flex items-center justify-center"><div className="text-muted-foreground animate-pulse">{translateInterface("m157fd50d1133")}</div></div>}>
      <WeatherSettingsPanel />
    </Suspense>
  );
}
