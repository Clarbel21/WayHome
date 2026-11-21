# WayHome team plan v3 — elderly-first devices and ESP32 parity

**Updated:** 21 November 2026

**Team:** Clarine (`clarbel21`), Ilyas (`itsme-lahlou`), Codex, WorkBuddy and ZCode

**Shared starting point:** `main` at `f8ba2d9`

This plan supersedes the sequencing in v2. It does not reverse the product decisions
already made there: WayHome keeps the restored classic presentation, the caregiver
phone stays on the left, the watch stays on the right, and the presentation must fit
within one browser frame. The archived redesign remains on `esp32-watch-ble`; nothing
is deleted.

The current web page structure is accepted. This phase concentrates on the two device
interfaces: a calmer caregiver phone and a much simpler watch for older people. Work
must follow the safety requirements in `REDESIGN_HANDOFF.md`.

## Current baseline

- Phase W1 is complete: the web watch and ESP32-S3 both have a 2×2 emoji home
  (🏠 Home / 📞 Call / 💬 Talk / 🎮 Game) and a separate SOS bar.
- Phase A1 is complete: `main` now serves the classic presentation.
- Every existing watch screen can return home, and watch content is locked to one
  screen without scrolling.
- The current automated baseline is 127 passing unit tests. The latest recorded e2e
  run has 59 passing tests and 19 failures that also exist on the classic baseline.
- BLE already connects the web app to the Waveshare ESP32-S3-Touch-AMOLED-2.06.
  The board has no GNSS and no cellular modem: location progress, calling and
  emergency dispatch remain honest demonstration flows, not claimed hardware
  capabilities.

## Product rules

1. **One watch interface, two displays.** The web watch and physical ESP32 watch
   show the same meaningful state. Use the existing `watch_state` (`-4a08`) and
   companion command (`-4a07`) characteristics; extend the shared contract instead
   of creating a second one.
2. **Every visible control works.** There are no dead buttons, circular dead ends or
   screens without a way home.
3. **The watch is elderly-first.** The home screen contains four large, high-contrast
   emoji actions—🏠 Home, 📞 Call, 💬 Talk and 🎮 Game—with short labels. A separate
   full-width SOS control requires a three-second hold. No watch screen scrolls.
4. **Guidance is landmark-led.** Home guidance prioritizes approved familiar
   landmarks and photos. It must not depend on a wearer understanding left and right.
   Missing landmarks, GPS uncertainty, route divergence and cancellation must each
   have an honest state.
5. **The caregiver remains informed.** Caregiver actions reach the watch; wearer
   actions reach the caregiver phone. The caregiver chooses the default watch mode.
   If the wearer changes mode, the caregiver receives a notification.
6. **Safety wins over activities.** Check-ins, SOS and other safety interruptions can
   pause Talk or Game without losing progress. The single safety policy and factual
   explanations in `REDESIGN_HANDOFF.md` remain authoritative.
7. **Facts stay factual.** Do not imply real calling, GPS, diagnosis, monitoring or
   emergency dispatch where the prototype only simulates it.

## Ownership — no overlapping implementation

All work branches start from `f8ba2d9`. Nobody pushes feature work directly to
`main`. If a task requires a file owned by another lane, document the requested
change in the PR instead of editing that file.

| Lane | Branch | Owns | Must not edit |
| --- | --- | --- | --- |
| **ZCode — web watch visuals** | `zcode/watch-elderly-ui` | `src/components/Wearable.tsx`, new `src/watch-ui.css`, optional new watch-only visual spec | caregiver phone, stores, services, BLE, firmware, shared shell/CSS |
| **WorkBuddy — caregiver phone visuals** | `workbuddy/caregiver-phone-ui` | `src/components/CaregiverPhone.tsx`, new `src/caregiver-phone-ui.css`, optional new phone-only visual spec | web watch, stores, services, BLE, firmware, shared shell/CSS |
| **Codex — behavior and integration** | `codex/esp32-integration` | store/service changes, BLE contract, firmware, shared side-by-side sizing, integration tests, documentation reconciliation | unnecessary visual redesign inside either isolated UI lane |
| **Ilyas — logic audit and review** | review first; a separate `ilyas/...` branch only for agreed fixes | store reachability, state transitions, safety-policy review, PR review | silently redesigning either device or mixing unrelated fixes into UI PRs |

Clarine is the product decision-maker and approves the watch, phone and final combined
experience before deployment.

## U1 — ZCode: simplified web watch presentation

Polish the existing watch rather than rebuilding it.

- Keep the accepted cream, sage and dark-green WayHome identity.
- Keep one 2×2 home grid with four equally prominent actions:
  - 🏠 **Home** — start familiar-landmark guidance.
  - 📞 **Call** — request a trusted family contact; do not claim cellular calling.
  - 💬 **Talk** — open dialogue with the named companion.
  - 🎮 **Game** — open Memory Garden.
- Keep a visually separate full-width **SOS HELP** bar at the bottom. A tap does
  nothing; holding for three seconds sends one SOS.
- Use large readable labels, clear focus states and comfortable touch targets. Remove
  tiny decorative copy that competes with the primary actions.
- Preserve every existing action, accessible name and safety behavior.
- Every secondary watch screen must have an obvious route to the four-button home.
- The watch remains physically smaller than the caregiver phone in Together view;
  Codex owns final shared sizing.

## U2 — WorkBuddy: calmer caregiver phone presentation

Improve visual hierarchy without changing behavior.

- Keep a realistic phone frame and the caregiver phone on the left.
- Make Today understandable at a glance: wearer and status, active alert (or calm
  status), Send a check-in, Find My, current watch mode, connection/battery/location,
  then bottom navigation.
- Keep Contacts, Safety policy, Familiar landmarks, Memory Library, activity history
  and settings under Care tools instead of crowding Today.
- Preserve caregiver pop-up notifications and all existing actions.
- The main Today view should fit cleanly; deeper management pages may scroll inside
  the phone.
- Do not change stores, safety logic, BLE behavior or firmware to solve a visual
  problem.

## I1 — Codex: ESP32 parity and final integration

Codex begins from the same baseline and integrates UI PRs only after they are ready.

- Verify the complete loop for Home, Call, Talk and Game from both the web watch and
  the physical watch.
- Verify caregiver check-in, Find My, mode selection, attachment, route progress and
  review actions reach the appropriate watch state.
- Verify wearer SOS, Home, Call, responses and mode-change requests reach the phone.
- Preserve BLE UUIDs. A new physical-watch screen requires a matching mirror code,
  firmware handling and tests in the same integration change.
- Reconcile the current SOS timing mismatch in documentation: the team decision is a
  three-second hold on the web and physical watch.
- Own the final composition: caregiver phone left, visibly larger; watch right,
  visibly smaller; both devices and the demonstration controls fit within one browser
  frame at the supported desktop viewports.
- Resolve integration conflicts rather than asking either UI lane to edit shared
  application files.

## A2 — Ilyas: logic audit and collaboration gate

After the isolated UI PRs and the integration PR are available, Ilyas reviews:

- every store action reachable from the UI;
- no orphan screens, circular flows or silent actions;
- mode changes and caregiver notifications;
- landmark-led guidance, route completion and cancellation;
- safety interruption and resume behavior for Talk and Game;
- the BLE mirror contract and any new screen/command codes;
- whether each remaining e2e failure is a known classic-baseline issue or a new
  regression.

Logic fixes discovered by this audit should be placed in a small, separately named
branch or assigned to the owning PR. Do not combine unrelated redesign work with an
audit fix.

## Merge and review order

1. ZCode opens the watch-only PR with screenshots and test results.
2. WorkBuddy opens the phone-only PR with screenshots and test results.
3. Clarine reviews both visual directions. Requested visual changes stay in their
   original PRs.
4. Codex integrates the approved PRs into `codex/esp32-integration`, resolves shared
   sizing, completes BLE/firmware parity and records full verification results.
5. Ilyas performs the A2 logic audit and reviews the integration diff.
6. Clarine approves the combined side-by-side demo.
7. Only then is the verified integration merged into `main` and deployed.

Do not merge both UI branches directly into `main` independently: the integration
branch is the place where shared composition and device parity are verified together.

## Definition of done

- The webpage itself does not scroll at the supported Together-view desktop sizes.
- The watch never scrolls and every watch screen can return home.
- The phone is on the left and larger than the watch; the watch is on the right.
- All four emoji actions work through the real application flows.
- Web watch and ESP32 display the same meaningful state.
- Caregiver and wearer actions are visible to the other side as specified above.
- SOS requires a three-second hold and sends exactly once.
- No new accessibility, unit, build or e2e regression is introduced.
- The physical hardware smoke test is recorded rather than inferred from automated
  browser tests.

## Verification bar

Each PR runs the checks relevant to its lane and records actual results:

1. `npm test`
2. `npm run build` using the repository's relative base
3. Relevant Playwright flows, including no-scroll/layout checks
4. For integration: full Playwright comparison against the recorded baseline
5. Firmware compile:

   `arduino-cli compile --fqbn esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi,CDCOnBoot=cdc firmware/wayhome-watch`

6. Two-minute physical hardware smoke test: pair → four home actions → caregiver
   check-in → route step → SOS tap does nothing → SOS hold three seconds sends once.

On Windows Git Bash, do not pass `--base /WayHome/` without
`MSYS_NO_PATHCONV=1`; otherwise MSYS can rewrite the path. Update this plan in the
same PR whenever the team changes a product decision, ownership boundary or BLE
contract.
