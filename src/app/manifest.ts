import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.APP_NAME || "Weather";
  const platformName = process.env.PLATFORM_NAME || "YouEye";

  return {
    name: `${appName} — ${platformName}`,
    short_name: appName,
    description: "Weather forecasts and current conditions",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#06b6d4",
    orientation: "any",
    icons: [
      { src: "/api/pwa/icon?size=192", sizes: "192x192", type: "image/svg+xml" },
      { src: "/api/pwa/icon?size=512", sizes: "512x512", type: "image/svg+xml" },
      { src: "/api/pwa/icon?size=512&maskable=1", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
