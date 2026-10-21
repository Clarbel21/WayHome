# WayHome project audit

Audit baseline: `17a2cd4`. This document separates the inspected baseline from changes made in this task. Evidence is source inspection and the tests identified below; it does not certify medical safety, live GitHub Pages deployment, or accessibility conformance.

## Implemented at baseline

| Requirement                              | Evidence and limits                                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wearer companion and accessible controls | `Wearable.tsx`: okay, guidance, help, pointer/keyboard two-second SOS. Browser tests cover recognition, SOS hold and cancellation.                                                             |
| Animated avatar                          | `Sprout.tsx` and CSS: bobbing, blink, smiling/concerned expressions, reduced motion. No appearance customization exists.                                                                       |
| Caregiver dashboard and digital twin     | `App.tsx`: overview, location, alerts, twin, landmarks, settings, simulation and guided story. Shared Zustand store; browser test verifies same-origin cross-tab SOS. No cross-device backend. |
| Simulated location                       | `RouteMap.tsx`: discrete fictional route, movement controls, home/approved landmarks, Leaflet plus offline route. Not real GPS.                                                                |
| Approved landmark navigation             | Store filters approvals; wearable shows one approved landmark at a time. CRUD, refresh persistence, recognition and empty-approval fallback have browser coverage.                             |
| S0–S5                                    | `store.ts`: NORMAL, CHECK_IN, GUIDED_RETURN, REORIENTATION, CAREGIVER_HANDOVER, EMERGENCY_SIMULATED. Deterministic event mapping.                                                              |
| SOS and caregiver handover               | SOS immediately appends an urgent alert; handover simulates contact. No real communications.                                                                                                   |
| Removal and disconnection                | Demo events update wear/connection flags and add alerts. Movement UI disabled when offline/removed.                                                                                            |
| Alert timestamps and editable profiles   | Persisted timestamped read/unread history and wearer/caregiver/emergency contact names.                                                                                                        |
| Simulation labels                        | Wearable, dashboard, demo, map and README label simulated behavior.                                                                                                                            |

## Partially implemented

- Accessibility: visible focus, keyboard SOS, labels, reduced motion, larger text, responsive CSS and mobile tests exist. No formal WCAG audit or assistive-technology evaluation; some secondary dashboard text is small.
- Familiar photo recognition: approved landmark images and a recognition button support navigation. This is not a separate cognitive engagement activity or a family photo game.
- Device integration: typed simulated adapter exists, but most UI events directly call the store. BLE and hardware are future work.
- Persistence: browser localStorage, not accounts or server storage. Simultaneous edits across tabs use last-write-wins; no guaranteed concurrent multi-device delivery.

## Missing at baseline

- Emergency Assistance section, police-notification confirmation, structured event snapshots, caregiver acknowledgment and history-preserving emergency reset.
- Companion naming and legacy-settings migration.
- Cognitive engagement suite: familiar photo game, memory garden, routine sequencing, music reminiscence. These were still missing after the emergency/personalization update; the subsequent Memory Garden implementation is recorded below.
- Optional real `tel:` action (not required, intentionally omitted; no country-specific emergency number is assumed).

## Bugs / broken interactions found

1. After SOS, CHECK/LOST/GUIDE/OKAY/HELP/REMOVE/WALK could overwrite S5 immediately. Fixed by latching S5 until an explicit emergency reset or full demo reset; SOS still appends immediately from every state.
2. `nextLandmark` could finish navigation even with no approved landmarks when called programmatically; movement guards only existed in the UI. Fixed with store guards, also preventing guidance movement during S5/offline/removal.
3. Adding nested settings without merging old localStorage would omit the new name for existing users. Fixed by merging persisted settings with defaults and validating restored companion names.
4. Landmark editor had an ad hoc focus trap without focus restoration. Existing editor is retained; new emergency confirmation uses a native modal dialog with Escape, focus containment and restoration, verified by browser tests.

## Changes in this update

- `EmergencyAssistance.tsx`: confirmation with reason, explicit no-police-contact labels, latest emergency snapshot, acknowledgment, reset, shared live twin. Also linked from overview and caregiver navigation.
- `store.ts`: typed emergency snapshots (wearer, fictional coordinates/route progress, timestamp, status, reason, notification kind), acknowledgments, history-preserving reset, priority/latching S5, guarded movement, name validation/default merging.
- `CompanionPersonalization.tsx`: explicit Save and Reset to Default, trimmed Unicode names limited to 24 characters, persistence and status feedback.
- Wearable, avatar aria labels, dashboard, demo and story text use the saved name. Existing branding/colors/routes/assets and Pages workflow preserved.

## Recommended priorities

1. Verify emergency flow and refreshed legacy profiles before presenting (covered by this task's regression tests).
2. Add the four cognitive activities as a focused follow-up with caregiver-approved content and gentle, non-scoring interactions.
3. Conduct user testing and a full accessibility review, especially text sizing and navigation on small wearables.
4. Before any real hardware or safety use, design authenticated transport, concurrent event delivery, contact consent and device reliability; this prototype does not provide those capabilities.

## Validation

- `npm test`: **8 passed**. Includes SOS from every state, S5 latch, immutable emergency snapshots, acknowledgment, reset preserving history, movement guards, Unicode naming and legacy-settings merge.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`: **8 passed**. Includes the five original flows plus Buddy persistence across tabs/modes, police confirmation/Escape/focus restoration, acknowledgment/reset, no external emergency requests, Unicode/default names, legacy profiles, and mobile keyboard use.
- `npm run build`: **passed**, including TypeScript. Vite emits third-party `use client` directive warnings; no build errors.
- Production bundle served under `/WayHome/`: passed name save/refresh, police confirmation, reset, companion navigation and bundled landmark image loading; no runtime exceptions or local asset errors observed. Desktop and mobile emergency layouts inspected.
- No new dependencies. Existing `.github/workflows/deploy-pages.yml` is unchanged. Pushing `main` triggers that workflow; the live GitHub Actions result and public deployment cannot be verified through the currently blocked GitHub API/site access.

These are local code/test findings, not clinical or accessibility certification. Last-write-wins cross-tab persistence remain explicit limitations; see the subsequent Memory Garden update for new activity coverage.

## Subsequent update — Memory Garden

The baseline above is retained as a historical audit. The four missing cognitive engagement categories now exist as optional reminiscence experiences, plus an interactive growing garden. They are not cognitive tests, diagnosis, or proven treatment.

### Implemented and verified

- `src/memory/store.ts`: separate persisted content, activity session, preferences, garden progress and timestamped engagement. Approval checks apply on selection and completion; revoked/deleted content is hidden during an active activity. Approved memories rotate across activity visits. One keepsake per completed visit; skipping, exiting or resetting the sample scenario never removes garden growth.
- `MemoryPlayer.tsx`: Familiar Faces with generic image alt text before reveal; happy places separate from navigation; explicit uploaded-audio Play/Pause or honest no-audio fallback; three-step tap-to-select routines with personal order and no grading; flower/tree/butterfly garden interactions. The existing customizable companion name appears throughout. Each question uses no more than three answer choices. All four music feelings remain available via the More feelings choice.
- `MemoryLibrary.tsx`: people/place/song/routine CRUD, approval, caregiver-only previews, preferences and engagement history. Personal entries start unapproved. Same-origin tabs share local metadata and media; there is no cross-device synchronization.
- `media.ts` and `backup.ts`: IndexedDB blobs, file type/size checks, missing-media feedback, metadata JSON export, complete library/media JSON backup, validated additive import with new IDs. No large base64 media is stored in localStorage. Tests round-trip actual image and audio uploads through IndexedDB and backup import.
- `SOSButton.tsx`: extracted the existing tested hold behavior for reuse, without changing safety transitions. The activity store only observes safety; the safety store was not modified. Any non-normal safety state or connection/wear issue pauses activities; explicit resume preserves routine order. Audio is paused on unmount/interruption. Existing caregiver alerts/digital twin still show S5 immediately.
- Companion entry, Memory Library navigation, caregiver overview activity history, digital-twin activity status and a ten-step interactive Memory Garden Demo are added to the existing layout. The presentation explicitly prepares fictional approved sample copies, preserves personal entries/progress, and never clears S5.
- All imagery is bundled original illustration or user upload; no external music service or sample copyrighted recording is included. Example family images are clearly fictional illustrations, not actual family photographs.

### Validation for this update

- `npm run build`: passed TypeScript and production build; existing third-party `use client` warnings remain non-fatal.
- `npm test`: **14 passed** (8 existing safety/name tests and 6 memory/backup tests).
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`: **12 passed** (8 existing regression flows plus 4 broad memory flows). The media test was additionally rerun with active-playback SOS interruption and verified that audio stops.
- Covered all five activities, non-punitive responses, caregiver approval and hidden unrevealed names, upload/edit/delete/preview, IndexedDB refresh persistence, metadata/full-media backup round-trip, preferences, rename propagation, skip/exit, preserved routine order across safety interruption, caregiver history, ten-step demo, mobile width, keyboard activity controls and in-game SOS.
- Production `/WayHome/` checks passed for routing, bundled sample images, memory reveal, garden refresh persistence and caregiver library. Desktop and mobile layouts inspected. No runtime exceptions or failed local asset requests observed.
- No dependencies added; existing GitHub Pages workflow unchanged. Live publication remains separate from these local tests.

### Remaining limits

Duration, reminder frequency and music notes are saved preferences, not automatic notifications, timers or adaptive recommendations. Engagement retains the newest 300 events (30 shown). Garden imagery displays the latest 24 keepsakes while retaining all growth. Backups cover the library and optional media, not preferences/history/garden progress. Browser storage can be cleared or evicted. Same-origin tabs use last-write-wins metadata, not guaranteed concurrent safety transport. Assistive-technology/user testing and clinical validation are still outside this prototype’s evidence.

## Subsequent update — incident verification and modular safety

This update supersedes the earlier reset behavior described above: requesting incident resolution never changes connection/wear inputs or fabricates a wearer check-in. S5 remains active until explicit person confirmation and device/scenario verification succeed. A new SOS invalidates pending verification. Full Reset Demo is blocked while S5 is unresolved, so it cannot bypass that lifecycle. Status wording uses “No active alerts,” not a guarantee of safety.

Four deterministic simulated conditions (deviation, inactivity, missed check-ins, low GPS confidence) now have visible rule reasons, support-state precedence and conservative GPS gating. Wristwatch/pendant/clothing clip configurations expose attachment-specific synthetic observations and likely worn / possibly removed / not worn / unknown inferences. Legacy binary wear migrates to unknown pending fresh observation. A changed attachment or restored connection requires new wear inputs.

Memory Garden now explains optional suggestions based on explicit preferences and interaction history; no automatic start, cognitive score or difficulty change is introduced. Approved memory-place photographs can become independent pending landmark proposals, with a separate instruction and explicit navigation approval. Browser coverage verifies that deleting the source memory does not delete the copied navigation photo.

See `IMPLEMENTATION_DECISIONS.md` for decisions made before editing and final evidence: **30 unit tests, 16 browser tests, production build and `/WayHome/` smoke checks passed**. See `DEMO_REFINEMENTS.md` for the five-part demonstration. The original Pages workflow/branding and existing activities, emergency simulation and demos are retained. Known browser-local/concurrency/hardware limitations remain explicit.
