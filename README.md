# WayHome

**Helping people find their way home.** A working, local-first Moonshot 101 prototype for a dementia-support companion and caregiver dashboard. Educational simulation, not a medical device. No real location tracking, calls, messages, emergency dispatch, authentication, paid APIs, or hardware.

## Run on your laptop

Use Node.js 22.12+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Start with the landing page, then enter Companion Mode or Caregiver Dashboard. No environment variables or secrets are needed. Internet access is only used for optional OpenStreetMap tiles or custom photo URLs; built-in landmark illustrations work offline. If tiles fail, the app shows an offline route diagram.

```sh
npm run build       # TypeScript check + production bundle in dist/
npm run preview     # Serve the production build
npm test            # State machine and core store tests
npx playwright install chromium
npm run test:e2e    # Browser interaction, persistence, cross-tab SOS, mobile tests
```

Static hosting must rewrite unknown paths to index.html because the app uses browser routes.

## Demonstrate in 2–3 minutes

1. Choose **Start Guided Demo** on the landing page. Click **Begin story**.
2. Use **Next** and **Back** to explore the eight narrated steps. Spend 15–20 seconds on each.
3. Try the wearable controls, including **I need help**, approved landmark recognition, **I'm confused**, and caregiver help.
4. The final step demonstrates an alternate **simulated SOS**. No real emergency services are contacted.
5. Open **Alerts** to see timestamps and mark requests read. **Reset presentation** starts the scenario again.

For a side-by-side pitch, open `/companion` and `/caregiver` in **two tabs of the same browser, on the same origin**. Hold SOS on the wearable for two seconds (pointer or hold Space/Enter with focus on the button). The caregiver alert and digital twin synchronize via localStorage events. Separate browsers/devices are not connected; there is no backend. Simulated contact requests are recorded in the app only.

The **Demo Control Center** offers all nine scenario events plus reset. Reset clears alerts, battery/movement state and connection/wear detection; it preserves edited profiles and landmarks. Starting a normal walk reconnects and re-wears the simulated device. Device disconnection retains last known location and blocks simulated movement. Route progress is discrete demo movement, not real directions.

## Features

- Sprout wearable with blinking, breathing, reassuring expressions and optional browser speech
- Six explicit companion states, deterministic simulation events, two-second SOS
- Caregiver overview, live sample map, offline route, alert center, synchronized digital twin
- Landmark create/edit/delete, built-in images/custom photo URLs, approval gates for guidance
- Persisted profiles, notification indicators, large text and reduced motion preferences
- Guided presentation with Next, Back, Reset and step selection
- Responsive layouts, keyboard focus states, form validation and image fallback

## Architecture

- `src/store.ts`: typed states, event transition function, Zustand persisted store, cross-tab synchronization
- `src/services/device.ts`: `DeviceService` and typed GPS/SOS/battery/wear/connection events; simulated adapter ready for a future ESP32-S3 BLE implementation. BLE is intentionally not implemented.
- `src/components/`: shared wearable, Sprout illustration, safe image fallback, Leaflet route
- `src/App.tsx`: routed caregiver, companion, landing and guided presentation views
- `src/styles.css`: warm ivory/sage visual system and responsive/accessibility styles with Tailwind integration
- `public/images/`: bundled original SVG landmark illustrations, no third-party image dependency
- `tests/`: deterministic store tests and Playwright browser flows

Data stays in this browser under `wayhome-v1`. This app is a presentation prototype; it has no clinical validation or real safety monitoring. Browser speech support and available voices vary. Optional map requests go to OpenStreetMap; route coordinates represent a fictional walk and must not be used for navigation.
