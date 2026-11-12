# YouEye Weather

Multi-location weather app for the [YouEye](https://github.com/YouEye-Platform/YouEye) platform.

Weather runs as a native YouEye app. It provides current conditions, forecasts, dashboard widgets, and timeline cards with account and settings integration supplied by YouEye.

`VERSION` holds the release line; each build is `X.Y.Z-dev.N` (see [CONTRIBUTING.md](CONTRIBUTING.md)).

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

Current conditions load independently of the optional forecast. If a forecast
request fails, current conditions remain visible alongside a translated retry
notice. Changing locations cancels the previous request and ignores its late
responses.

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

The app uses Next.js 16, TypeScript, Tailwind CSS, Open-Meteo data, and YouEye's native app surface contract.

## Build and release checks

```bash
pnpm test
pnpm build
```

The source-owned `.youeye/build/app` entrypoint produces an unsigned
`standalone.tar` and the release copy of `youeye-app.yaml`; releases are checked
by SHA-256 digest. It requires the build environment described in
`.youeye/build/manifest.json` and `YOUEYE_VERSION` (`X.Y.Z-dev.N` on the line in
`VERSION`). Release tags are `v<version>` on every channel.
See [PUBLIC_RELEASE_POLICY.md](PUBLIC_RELEASE_POLICY.md) for publication rules.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

## Acting user and household admission

Private routes derive the acting identity from `getSession(appId)`, which checks
the native cookie and current identity session through the configured client.
Never use a browser-supplied `X-YouEye-User`, `userId` or `user_id` to select
private rows or nominate the user of a platform service call. Household admission
and per-user service consent are separate checks; administrative status does not
grant access to every app.

Widget, card and inter-app routes require a native session. Inter-app factories
receive an explicit app ID and pass `{ userId }` as the second handler argument;
user fields are removed from request data. A server-to-server caller without a
validated native session is denied. Header/body identity nomination is not a
supported delegation protocol. Existing explicitly public shares and public
content remain distinct from private routes, and external public exposure must
be chosen by the appliance administrator.

## App service credentials

Platform calls run on the server with the protected `YOUEYE_APP_ID`,
`YOUEYE_APP_TOKEN` and `YOUEYE_GATEWAY` values injected by the installer.
The app ID is the exact installed ID; helpers do not invent prefix aliases.
A missing credential fails with an integration-not-ready error. Use Market's
administrator credential reconciliation action to repair delivery.

Pass the acting user from a validated server session. Caller-supplied headers
cannot replace machine identity, select another user, or attach a browser/bridge
credential. Keep platform helpers in server code and keep runtime credentials
out of source, browser bundles and logs. Public health/manifests do not need a
service credential. Rotation and restore reinject a credential and prove it
before marking integration ready.

## Web build baseline

Use Node 24.22.0 and pnpm 10.6.2 with the committed frozen lockfile.
Next.js 16.4.2 builds explicitly use webpack for Serwist 9.5.13; run `pnpm lint`
and `pnpm typecheck` separately. Static-only offline caching excludes private
API, HTML and RSC responses.

The standalone payload carries the exact Node runtime and upstream licence
in `.youeye-runtime`. The existing `server.js` entrypoint forwards to this runtime,
so native update/recovery switches application and runtime together.

The remaining `braces` advisory is confined to build-time lint glob patterns;
there is no upstream fix. Alex reviews this and the ESLint 9 compatibility hold
on the next Web patch or by 2026-11-19. Do not introduce untrusted glob patterns.

### Platform locale

The authenticated platform header supplies the resolved personal or instance
locale. The app uses it for the document language and, where present, its
next-intl provider and message request. Missing or unsupported values fall back
to English. Locale propagation does not supply new translated strings. Keep
header responses out of browser caches and test user changes independently.
