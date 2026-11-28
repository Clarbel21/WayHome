# WayHome team plan v5

**Updated:** 21 Nov 2026 · **Decides:** Clarine (`clarbel21`) · **Reviews logic:** Ilyas (`itsme-lahlou`)
**Builders:** anyone — take the next step below · Supersedes v4.

## Goal

- **Watch = for the elderly wearer.** As simple as possible: big pictures, few words, big buttons.
- **Phone = for the caregiver.** Complete and easy to use.

The watch does five things: **🏠 go home with familiar-landmark photos · 📞 call family ·
💬 talk to Sprout · 🎮 memory game · SOS (hold 3 s).**

## Done so far (merged: #10 #11 #6 #12 #13, plus the stage-v5 PR)

| Flow | Web watch | Phone | ESP32 |
|---|---|---|---|
| 🏠 Home → landmark photo → "I see it" → next stop → Welcome home | ✅ | ✅ map dot moves | ✅ I see it / Not yet / Back |
| "Not yet" → "I see it now" resumes the walk | ✅ | ✅ | ✅ (commands 0x08 / 0x09, screen 7) |
| Leave safe zone → buzz → "Go home?" → guidance | ✅ | ✅ | ✅ mirrors the route |
| 📞 Call → Sent / Seen / Replied | ✅ | ✅ | ✅ sends the family request |
| 💬 Talk → 4 topics | ✅ | ✅ | ✅ |
| 🎮 Game → Memory Garden | ✅ | ✅ | ✅ simple prompts |
| SOS: a tap does nothing, a 3-second hold sends once | ✅ | ✅ | ✅ |

- **Stage:** demo moments in a left column; the phone uses the full height, is rendered like a
  real screenshot (fixed design size, scaled), and Today shows home + the safe-zone radius.
- **Bluetooth:** the web connects one step at a time and finds the watch by service or by
  name ("Sprout Watch"); the greeting carries both names ("Hi Amy! I'm Momo.").
- **Tests:** 129/129 unit, 92/92 browser. Firmware compiles (39% flash). **Hardware not yet
  tested on the board.**

## Watch wording rules (every watch screen)

1. **One idea per screen.** One photo or icon, one line, up to 3 buttons, plus SOS.
2. **≤ 5 words per line, ≤ 3 words per button**, calm and first-person ("I know my way").
3. **Pictures before words.** During guidance the landmark photo is the largest thing.
4. **Don't rely on left/right alone.** Arrow *and* photo of the next place.
5. **No explanations on the watch.** Reasons and disclaimers go on the phone; the watch keeps
   one short honesty note ("Demo — no real call.").
6. **Minimum sizes:** text 15 px, buttons 44 px. Nothing scrolls; every screen can go back.
7. **Same words on both watches** (`src/i18n.ts` → `firmware/watch_ui.cpp`).
8. **The phone can say more**, but status first and details under Care tools.

## Next steps — take the next unchecked one

Anyone (person or AI) works on the **lowest unchecked step**. Before starting, write your
name next to it in a PR or issue so two people don't take the same step. When it merges,
tick the box here in the same PR. One step = one small PR with before/after screenshots of
the watch **and** the phone, and the green bar below.

- [x] **Step 1 — Physical watch works.** *(22 Nov, Clarine on the board.)* Touch works and
  the watch connects to the web app. Fixed on the way: a crash 1 s after start-up (missing
  weekday label), LVGL's 64 KB memory pool (now system heap/PSRAM via
  `firmware/lvgl-config/lv_conf.h`), touch read directly over I2C, Bluetooth logs in the
  Serial Monitor. Still to tick in the smoke test below: each tile, check-in, Not yet → I
  see it now, SOS hold.
- [x] **Step 2 — Landmark pictures on the ESP32.** Merged in #19. The watch uses
  compiled-in photos for the four built-in landmarks. Caregiver-uploaded photos
  are a follow-up. Landmark update latency is tracked separately in #20.
- [x] **Step 3 — "Loses signal".** *(22 Nov, Clarine.)* Today the offline watch still shows the caregiver's
  check-in, which it could not have received. Done when: the watch shows an "Offline" screen
  whose Home / Call / SOS still work, and the phone shows "Watch offline · last seen near home"
  with the check-in waiting until the watch reconnects.
- [ ] **Step 4 — "Takes it off".** *(Codex, step-4-watch-taken-off.)* Today the phone says "Caregiver Assistance Requested",
  but nobody asked for help, and the watch shows a call screen to nobody. Done when: the
  phone says "Watch taken off" and offers Find My, the watch shows a quiet "Put me on?"
  screen, and no family request is created.
- [ ] **Step 5 — "+8 min" escalation.** Today the phone escalates to Urgent while the watch
  stays on "Go home?". Done when: every ladder step also shows on the watch (buzz again →
  "Call family?" → caregiver alerted) and both devices always show the same step.
- [ ] **Step 6 — "Weak GPS" during a walk.** Done when: during a walk the watch keeps the
  landmark photo, hides the arrow and says "Look for the bakery"; outside a walk it stays a
  calm check-in.
- [ ] **Step 7 — Happy endings.** Add two moments: "Arrives home" (watch: Welcome home;
  phone: All calm + a short summary) and "Family calls back" (watch: "Jamie replied";
  phone: request done).
- [ ] **Step 8 — Last long sentences.** Shorten the store messages still shown on the
  watch ("It's okay. I'm here with you.", "Help request sent — simulation") to ≤ 5 words,
  first-person, and copy them to the ESP32 firmware.
- [ ] **Step 9 — Final check.** A logic review of steps 3–6 (Ilyas), then Clarine runs the
  whole demo on the web and the physical watch and approves.

### Hardware smoke test (step 1; repeat after any firmware change)

✅ touch, ✅ connects. Still to check: pair from **Connect Sprout watch** → 4 home tiles (Home, Call, Talk, Game) → caregiver
check-in → "I see it" → "Not yet" → "I see it now" → SOS tap (nothing) → SOS hold 3 s (sends once).

## Files by area (so changes stay small)

| Area | Files |
|---|---|
| Watch look | `src/components/Wearable.tsx`, `src/watch-ui.css` |
| Phone | `src/components/CaregiverPhone.tsx`, `src/caregiver-phone-ui.css` |
| Logic | `src/store.ts`, `src/zone/*`, `src/services/*` |
| Words | `src/i18n.ts`, `src/components/DemoStage.tsx` (moments + captions) |
| Physical watch | `firmware/wayhome-watch/*` |
| Tests | `tests/*` |

Clarine approves every PR. Logic changes (`store`, `zone`, `services`) also get a review from Ilyas.

## How we work

1. Branch `step-<n>-<short-name>` from the latest `main`. No direct pushes to `main`.
2. One step per PR, with before/after screenshots of the watch **and** the phone.
3. **Green bar:** `npm test` (129), `npm run build`, full Playwright (92). A PR may not lower it.
4. Firmware PRs also compile:
   `arduino-cli compile --fqbn esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi,CDCOnBoot=cdc firmware/wayhome-watch`
5. Merge order: PR → Ilyas (logic PRs) → Clarine → squash-merge → Pages deploys.
6. **Facts stay factual.** Never imply real calling, GPS, monitoring or emergency dispatch.
