"use client";

import { Suspense } from "react";
import { WeatherSettingsPanel } from "./settings-panel";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 flex items-center justify-center"><div className="text-muted-foreground animate-pulse">Loading settings...</div></div>}>
      <WeatherSettingsPanel />
    </Suspense>
  );
}
