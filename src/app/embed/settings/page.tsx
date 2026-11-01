"use client";

import { useTranslations as useInterfaceTranslations } from "next-intl";
import { Suspense } from "react";
import { WeatherSettingsPanel } from "@/app/settings/settings-panel";

export default function SettingsEmbedPage() {
  const translateInterface = useInterfaceTranslations("interface");

  return (
    <Suspense fallback={<div className="flex h-48 items-center justify-center"><div className="animate-pulse text-muted-foreground">{translateInterface("m157fd50d1133")}</div></div>}>
      <WeatherSettingsPanel embedded />
    </Suspense>
  );
}
