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

Static hosting works without rewrite rules: the app uses hash routes (for example `/#/companion`) and relative asset paths.

## Demonstrate in 2–3 minutes

1. Choose **Start Guided Demo** on the landing page. Click **Begin story**.
2. Use **Next** and **Back** to explore the eight narrated steps. Spend 15–20 seconds on each.
3. Try the wearable controls, including **I need help**, approved landmark recognition, **I'm confused**, and caregiver help.
4. The final step demonstrates an alternate **simulated SOS**. No real emergency services are contacted.
5. Open **Alerts** to see timestamps and mark requests read. **Reset presentation** starts the scenario again.

For a side-by-side pitch, open `/#/companion` and `/#/caregiver` in **two tabs of the same browser, on the same origin**. Hold SOS on the wearable for two seconds (pointer or hold Space/Enter with focus on the button). The caregiver alert and digital twin synchronize via localStorage events. Separate browsers/devices are not connected; there is no backend. Simulated contact requests are recorded in the app only.

The **Demo Control Center** offers all nine scenario events plus reset. Full demo reset recreates fictional starting observations and is blocked during an unresolved S5; it preserves edited profiles and landmarks. Starting a normal walk changes the walking scenario only; it never reconnects the device or confirms wear. Device disconnection retains last known location and blocks simulated movement. Route progress is discrete demo movement, not real directions.

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

## GitHub Pages deployment

The Pages workflow builds and deploys on pushes to `main`, or manually through Actions → Deploy WayHome to GitHub Pages → Run workflow. In repository Settings → Pages, select **GitHub Actions** as the source. After a successful deployment, visit https://clarbel21.github.io/WayHome/. Routing, lazy-loaded maps, and bundled landmark images support this repository subpath.

## Companion personalization and emergency assistance

Under **Caregiver → Settings → Companion Personalization**, enter a name (1–24 Unicode characters), then choose **Save companion name**. The greeting, digital twin, dashboard, guided script and avatar labels update immediately. **Reset to Default** restores Sprout. Existing saved profiles receive the default name without losing other settings.

Under **Caregiver → Emergency Assistance**, choose **Simulate Police Notification**, review the confirmation, and supply an alert reason. Confirming creates a local emergency event with the wearer, fictional route coordinates, time, safety status and reason; no police, SMS, calls or emergency API are contacted. Cancel or Escape leaves the simulation unchanged. SOS still logs immediately from every state, including when notification indicators are disabled.

S5 remains active through acknowledgment and **Request incident resolution**. Acknowledgment is receipt only, not a safety claim. The request moves the incident to **awaiting verification** without changing device inputs. An independent caregiver confirmation plus adequate simulated connection, wear and scenario observations is required before **Verify resolution and close incident** succeeds. Neither step changes connection/wear observations or fabricates a wearer check-in. Full **Reset Demo** is unavailable during unresolved S5 and cannot bypass verification.

See `PROJECT_AUDIT.md` for verified coverage and remaining gaps. Memory Garden now provides the separate reminiscence activities described below. Safety landmark recognition remains separate from these activities.

## Memory Garden

From **Companion Mode**, choose **Explore Memories**, then **Let's begin**. Explore Familiar Faces, My Happy Places, Music Memories, Everyday Moments, and the growing Memory Garden. The activity menu shows at most three activity choices at once; **More activities** reveals the others. Names and family stories stay hidden until a gentle response/reveal. Approved content rotates on repeated visits. There are no tests of correctness, countdowns, scores, streaks, penalties or predictions. Every completed interaction adds a garden keepsake, once per activity visit. Skipping or exiting never removes progress. Everyday Moments accepts the wearer’s chosen order, not a graded “correct” answer.

Use **Caregiver → Memory Library** to add/edit/delete people, places, songs and three-step routines, manage approval, preview content and see timestamped selected/completed/skipped/exited/paused history (latest 300 retained; 30 displayed). New personal entries start unapproved. Only approved content can be selected or revealed in Companion Mode; revoking approval or deleting an active entry immediately hides it. Caregiver previews can show unapproved content, clearly labeled, without affecting progress. Built-in family/place content is fictional, original SVG illustration—not an actual family photograph. Upload authorized photographs for a personal presentation.

**Photos and audio:** files stay as blobs in IndexedDB (`wayhome-memory-media`), never large base64 strings in localStorage. Photos support PNG/JPEG/WebP/GIF up to 5 MB. Audio supports MP3/WAV/Ogg/M4A/WebM/FLAC up to 20 MB; codec availability depends on the browser. Only use your own or properly authorized recordings. No music is streamed, scraped or provided as copyrighted sample audio. Without a recording, the app explicitly says nothing is playing. Sound is off by default; enabling it still requires an explicit Play. Playback stops when the activity closes or safety interrupts it.

**Preferences:** preferred activities filter the menu (none selected means all remain available). Duration, reminder frequency and music notes are saved caregiver preferences; they do not create timers, scheduled notifications, popups or adaptive difficulty. Optional music sound is separate from the existing companion voice setting. The saved avatar name is used throughout the activities.

**Storage and backup:** memory metadata, engagement and garden progress use a separate localStorage key (`wayhome-memory-v1`); the existing safety store remains separate. Data is specific to this browser profile/origin. Same-origin tabs share data, but browsers/devices do not sync. IndexedDB and localStorage can be cleared/evicted, so keep a private downloadable backup of important media. **Export metadata JSON** exports library entries only. **Back up with media** embeds uploaded files in a downloadable JSON, not localStorage. **Import backup** validates and adds new copies without overwriting existing entries; review approvals after importing. Metadata-only files cannot restore missing uploaded media. Library backups do not include garden progress, history, or preferences. Clearing browser data removes those; full demo/safety resets do not remove the garden. Private browsing or disabled browser storage can prevent saving, and missing media gets a friendly fallback.

**Safety:** any non-normal safety state or disconnection/removal pauses Memory Garden. SOS immediately uses the existing S5 machine and caregiver alert history. The paused activity and garden remain saved. Request resolution and complete verification in Emergency Assistance, then explicitly **Resume activity**. Activities cannot clear S5, issue navigation instructions, or change safety rules.

**Presentation:** choose **Demo Control Center → Memory Garden Demo → Prepare sample demo**. This explicitly adds approved fictional sample copies without changing personal entries. Use Next/Back through the ten-step story: invitation, familiar face, reveal, growing flower, happy place, caregiver history, then simulated SOS interruption. **Reset sample scenario** preserves garden/history and does not clear an emergency. Reset S5 from Emergency Assistance before replaying. Use two tabs on the same origin to show caregiver updates alongside the wearer.

This is a reminiscence and connection prototype, not a diagnostic test or proven dementia treatment. GitHub Pages continues to deploy through the existing workflow on pushes to main, including all routes/assets under `/WayHome/`.

## Safety review, modular attachments and shared memory-place photos

See `IMPLEMENTATION_DECISIONS.md` for the design decisions and `DEMO_REFINEMENTS.md` for a short presentation script.

**Incident lifecycle:** active → awaiting verification → resolved, alongside the existing S0–S5 companion states. A new SOS always records an urgent event and returns the incident to active, invalidating pending verification. Read/acknowledged alerts do not mean anyone is safe. Before closing an incident, the caregiver independently checks on the wearer (explicit checkbox), restores the simulated connection if needed, records fresh attachment observations, and clears outstanding scenario readings after review. Disconnected/unknown/possibly removed/not worn inputs block verification; the app never repairs them as a side effect. “No active alerts” is not a guarantee of safety. Only a full fictional demo-fixture reset clears history, and that reset is blocked while S5 is unresolved.

**Deterministic scenario controls:** Demo Control Center and Emergency Assistance provide route deviation (≥100 m with GPS confidence ≥60%), prolonged inactivity (≥15 simulated minutes), missed check-ins (≥2), and low GPS confidence (<60%). Support priority is handover > reorientation > check-in; SOS always overrides all of them. Low-confidence GPS suppresses deviation inference and pauses guidance. Readings are manually simulated, not wall-clock or actual GPS monitoring. Nothing automatically dispatches police. Clear readings explicitly, then review the check-in; clearing readings alone does not clear S5 or certify safety.

**Wearable modules:** choose Wristwatch, Pendant, or Clothing clip in Settings, Demo Control Center, or Emergency Assistance. Wristwatch uses simulated strap + skin contact; pendant uses lanyard + near-body proximity; clip uses clip attachment + garment motion. Both positive readings infer likely worn; both negative infer not worn; conflicting readings infer possibly removed; missing readings or disconnection mean unknown. All four outputs are uncertain inferences. Stillness can be rest, so these are illustrative rules rather than validated wear detection. Switching attachment or reconnecting clears wear observations. The digital twin changes its case/attachment styling. Modular inspiration does not imply integration with Memoket Gem hardware.

**Optional memory suggestions:** Memory Garden uses approved content, explicit preferred types, music notes, brief/unhurried preference and selected/completed/skipped history. It explains each optional idea and offers variety after a skip while leaving the skipped activity available. Suggestions never launch an activity, score cognition, change difficulty, penalize skipping or create a streak.

**Memory-place proposals:** in Memory Library, an approved place with an image can be proposed for guidance. Add a separate simple navigation instruction; it is never copied from the reminiscence story. A pending independent landmark is created with navigation approval off. Go to Familiar landmarks, review its photo/place/instruction, and explicitly select **Separately approve for navigation**. Only then may it appear in guidance. Uploaded photographs are copied into independent IndexedDB blobs so deleting the memory does not delete the navigation photo. Changing reminiscence approval later does not change navigation approval; revoke each separately. Existing library backups do not include separate navigation copies or landmark metadata, and browser storage remains local to the origin.

**Limitations:** these thresholds, inputs and verification checks are demonstration assumptions, not a clinical/device safety system. Attachment uncertainty is deliberately conservative. History and incident records are browser-local; concurrent tab writes still use last-write-wins and are not a reliable emergency transport. Previously saved binary wear data migrates to unknown and needs fresh simulated observations. No medical, GPS, BLE or emergency service integrations were added.

### If Explore Memories seems unresponsive

Companion-to-Memory Garden navigation now returns to the top and focuses the destination heading; activity changes also reveal the new question instead of retaining the previous scroll position. A paused garden explicitly lists the active check-in/device/SOS reasons and offers **Open caregiver review (demo)**. Review the simulated observations there, complete incident verification if required, then choose **Return to Memory Garden**. Progress is preserved and safety checks are never automatically dismissed. After a Pages update, refresh the site to load the latest build.

### Ending a resolved SOS

The wearable and Emergency Assistance screen now include **Help received — resolve SOS** while an SOS is active. After a caregiver has checked on the wearer and help has arrived, choose the button and **Caregiver confirms — resolve SOS**. This uses the existing incident-resolution/verification checks, returns to the companion when those checks pass, and preserves the emergency history. **Keep SOS active** cancels the confirmation. Disconnected, removed/uncertain wear, or outstanding scenario readings still need review; the button does not fabricate healthy device readings. A newer SOS invalidates an older open confirmation.
