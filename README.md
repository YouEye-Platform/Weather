# YouEye Weather

Multi-location weather app for the [YouEye](https://github.com/YouEye-Platform/YouEye) platform.

Weather runs as a native YouEye app. It provides current conditions, forecasts, dashboard widgets, and timeline cards with account and settings integration supplied by YouEye.

Current public release line: `v0.5.0`

## Features

- Current conditions with temperature, humidity, wind, and UV index
- Hourly and multi-day forecasts
- Multiple saved locations
- Location search with geocoding
- Current weather and forecast dashboard widgets
- Timeline info-card surface for weather summaries
- App-owned settings panel for YouEye Settings
- Theme, language, and account menu integration
- PWA-ready build with service worker assets

## YouEye Surfaces

| Surface | Purpose |
|---|---|
| `/` | Main Weather app |
| `/embed/widget/weather-current` | Dashboard current weather widget |
| `/embed/widget/weather-forecast` | Dashboard forecast widget |
| `/embed/card/weather` | Timeline/info-card surface |
| `/embed/settings` | App settings panel shown inside YouEye Settings |
| `/api/manifest` | Native app manifest consumed by Market and UI |
| `/api/health` | Container health and version endpoint |

## Development

```bash
pnpm install
pnpm dev
```

The app uses Next.js 15, TypeScript, Tailwind CSS, Open-Meteo data, and YouEye's native app surface contract.

## Release Artifact

The Control Panel updater expects each native app release to upload an uncompressed `standalone.tar` asset.

```bash
pnpm build
cd .next/standalone
tar -cf standalone.tar .
```

The release tag for this standalone repo is `v0.5.0` with no component prefix.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.
