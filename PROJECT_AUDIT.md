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
- Cognitive engagement suite: familiar photo game, memory garden, routine sequencing, music reminiscence. These remain missing after this focused update; no games are claimed as implemented.
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

These are local code/test findings, not clinical or accessibility certification. Last-write-wins cross-tab persistence and the missing cognitive activities remain explicit limitations.
