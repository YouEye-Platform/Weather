"use client";

import { Suspense } from "react";
import { WeatherSettingsPanel } from "@/app/settings/settings-panel";

export default function SettingsEmbedPage() {
  return (
    <Suspense fallback={<div className="flex h-48 items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading settings...</div></div>}>
      <WeatherSettingsPanel embedded />
    </Suspense>
  );
}
