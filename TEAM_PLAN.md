# WayHome team plan — classic presentation + redesign handoff

**Agreed:** 10 November 2026, between clarbel21, itsme-lahlou (Ilyas) and the coding
assistant. This plan extends `REDESIGN_HANDOFF.md` — read that document first. It does
not replace any of the handoff's behavior rules; it sequences the work and restores the
classic presentation elements inside the new shell.

## Phase 0 — restore the classic presentation inside the new shell

Do this **before** handoff milestone 1, so both teammates work against the agreed layout.

1. **View switcher returns.** Together (side-by-side) / Watch / Caregiver tabs at the
   top of `#/together`, side-by-side as the desktop default. The handoff's explicit
   mobile tabs stay for narrow screens; switching tabs never silently switches the
   other viewer's panel.
2. **Phone left, watch right** on desktop: the caregiver phone is `01`, the watch is
   `02` (the classic order). Small screens keep the handoff's stacked tab layout.
3. **All presenter moments return.** The full `DemoStage` moments toolbar sits beneath
   the devices: Walk out of safe zone, Lost far from home, +8 min, Walk home, Wanders
   off route, Stops moving, Weak GPS, Takes it off, Loses signal, Low battery, SOS —
   each still calling real store actions so every safety guard (SOS precedence, blocked
   reset, wear inference) stays intact.
4. **Pairing placement.** A compact "Sprout watch connected / disconnected" indicator
   stays visible near the devices; the **Connect Sprout watch** button lives in the
   shell's **More** area, per the handoff ("away from the first action").
5. **Consolidation.** The repo keeps ONE canonical interface (the new shell with the
   restored elements above). The old pre-redesign build stays available as a read-only
   comparison snapshot at the classic URL shared in the team chat; it is not a route in
   this repo. `/guided` consolidation still follows handoff milestone 3.

## Phases 1–5 — the handoff's milestones, unchanged

Milestones 1–5 of `REDESIGN_HANDOFF.md` proceed in the given order after Phase 0.
Additions that protect the hardware link:

### BLE contract freeze

- Characteristic UUIDs `-4a01` … `-4a08`, companion-command codes `0x01`–`0x07`, and
  watch-state mirror codes `0`–`6` are frozen. Documented in
  `firmware/wayhome-watch/README.md` and mirrored in `src/services/ble.ts`.
- A new watch state (handoff milestone 1) that needs its own physical-watch screen
  adds a new mirror code **in the same PR**: web broadcast (`watchScreenCode`) +
  firmware screen + both READMEs updated together.
- Store actions the watch drives (`answerCheckIn`, `chooseAssistance`,
  `returnToCheckIn`, `chooseAssistance("home")` via `go_home`, `nextLandmark`, `move`,
  `position`, `observeWear`, `setAttachment`, `event`) may be renamed or removed only
  in a PR that also updates `src/services/ble.ts`, `src/services/device.ts` and the
  firmware.

### Hardware smoke test

After any PR that touches the store, `Wearable.tsx` or the demo shell: pair the ESP32
watch, send a check-in, run Help me home + a couple of walk steps, confirm the mirror
follows. Target: under two minutes.

## Who works on what

- **itsme-lahlou** leads handoff milestones 1–3 and 5 (watch states, caregiver views,
  landing/entry, rehearsal).
- **clarbel21 + assistant** lead the BLE/firmware side: mirror protocol, adapter
  contracts, Phase 0 pairing placement, and verification runs on every integration.

## Verification bar (per PR)

- `npm test` (unit), `npm run build -- --base /WayHome/`, relevant Playwright flows,
  Node 22.12+. Record actual results in the PR.
- Update `REDESIGN_HANDOFF.md` when a milestone or product decision lands (its own rule).

## Baseline as of this plan

- `origin/main` = redesign checkpoint (`e699bbd`), 128 unit tests green, production
  build green, BLE adapter verified against the deployed site bundle.
- Physical watch firmware: mirror protocol complete (check-ins, Help me home, walk
  steps, screen mirror, SOS, battery, wear, attachment). No firmware changes needed by
  Phase 0.
