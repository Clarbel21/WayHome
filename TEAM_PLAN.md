# WayHome team plan v2 — classic base, emoji watch, full parity

**Agreed:** 11 November 2026, between clarbel21, itsme-lahlou (Ilyas) and the coding
assistant. Supersedes plan v1's redesign sequencing. The product decision: **the app
returns to the previous (classic) design** — https://wayhome-classic-cb0y.zai.site
(build `63c2a46`) — and the presentation redesign moves to an archive branch
(`esp32-watch-ble`, nothing deleted). Everything in `REDESIGN_HANDOFF.md` about
safety behavior still applies; the presentation direction changes.

**Already done on branch `classic-return` (commit `4f4b45e`, phase W1):** the
classic shell with the simplified emoji watch home on both the web watch and the
ESP32-S3 firmware — 2×2 tiles (🏠 Home / 📞 Call / 💬 Talk / 🎮 Game) plus a
3-second-hold SOS bar; the BLE mirror now also carries the wearer's first name.
124 unit tests pass; the e2e suite is 12 tests better than the classic baseline
(all remaining e2e failures also fail on pristine `63c2a46` — that is phase A2's
logic audit list).

## The five rules for everything we build

1. **One watch interface, two screens.** Whatever the web watch shows during a demo,
   the ESP32-S3 shows (same screen, same state). The BLE mirror
   (`watch_state` characteristic `-4a08`) and companion commands (`-4a07`) stay the
   contract; extend them, never fork them.
2. **Every button works.** No dead tiles: each watch button drives the real store
   flow on the web and notifies the ESP32 (and vice versa).
3. **Phone ↔ ESP32 interaction.** Caregiver actions (check-in, Move one step,
   attachment, review flows) reach the physical watch; wearer actions (SOS, Home,
   Call, answers) reach the phone.
4. **Simplified watch home.** Emoji tiles only: 🏠 Home (guided way home with
   landmarks), 📞 Call (family), 💬 Talk (dialogue), 🎮 Game (Memory Garden cognition
   test), plus the SOS bar — **hold 3 seconds** to send, on both screens.
5. **Facts stay factual.** All of REDESIGN_HANDOFF's "Behavior that must remain true"
   section applies unchanged.

## Phase W1 — simplified emoji watch home (DONE, both sides together)

- Web watch home: 2×2 emoji tiles (🏠 Home / 📞 Call / 💬 Talk / 🎮 Game) + the
  3-second SOS bar at the bottom. Accessible names keep the established wording
  ("Help me home", "Call someone I trust", …) so tests and screen readers stay stable.
- Firmware home: the same 2×2 tile layout with matching icons and labels + the same
  SOS bar (compiles at 39% flash; re-flash the board after pulling this branch).
- Talk opens the dialogue topics; Game opens Memory Garden; Call starts the family
  request; Home starts guided return (watch requests it over BLE; the web applies its
  safety gates and shows landmarks; the mirror keeps the ESP32 on the same screen).

## Phase W2 — button-by-button parity pass (clarbel21 + assistant)

For each watch action, walk the full loop and fix gaps:
- **Home**: watch tile → web GUIDED_RETURN → landmarks advance from BOTH the web
  ("I see it") and the watch steps → caregiver map moves → arrival restores home.
- **Call**: watch tile → family request on the caregiver phone → respond flow.
- **Talk**: watch tile → dialogue topics on the watch; caregiver sees the activity.
- **Game**: watch tile → Memory Garden; safety interrupts pause it on both ends.
- **Check-in / SOS / attachment / battery / wear**: already two-way; re-verify each.

## Phase A1 — merge `classic-return` into main (itsme-lahlou reviews, then merge)

- `classic-return` IS the classic design (branched from `63c2a46`) with the BLE
  stack and the emoji watch carried forward — the shell revert is already done.
- Review the diff against `63c2a46` (only the watch home, SOS timing, mirror name
  bytes and test updates changed) and fast-forward `main`.
- The redesign work stays archived on `esp32-watch-ble` for reference.

## Phase A2 — logic audit (itsme-lahlou, his store expertise)

- Every store action reachable from the UI; no orphan screens; every demo moment in
  the toolbar reflected on the watch (and mirrored to the ESP32 where a screen exists;
  mirror code 6 "check the app" for the rest).
- The e2e failures that pre-exist on the classic build (list in the branch commit
  message and the failing specs) are the starting checklist.
- Keep the mirror contract: codes 0–6 today; a new watch screen = a new mirror code in
  the same PR on both sides.

## Verification bar (unchanged)

`npm test`, `npm run build -- --base /WayHome/`, Playwright flows, firmware compile
(`arduino-cli compile --fqbn esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi,CDCOnBoot=cdc firmware/wayhome-watch`),
then the 2-minute hardware smoke test: pair → each home tile → check-in → SOS hold 3 s.
Record actual results in PRs and update this file when a decision changes.
