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
6b. **SOS on every screen** (web and ESP32), always at the bottom.
6c. **No typing, ever.** Older wearers talk or tap big buttons; no text fields on the watch.
6d. **English only for now.** New steps don't need Indonesian (`id`) strings; existing ones stay.
6e. **4 buttons only on the watch home** (Home, Call, Talk, Game) + SOS. No mode button — the
    caregiver picks Normal / Focus / Dialogue on the phone.
7. **Same words on both watches** (`src/i18n.ts` → `firmware/watch_ui.cpp`).
8. **The phone can say more**, but status first and details under Care tools.

## Main task now — the 4 buttons work for real

The watch has **4 main buttons: Home, Call, Talk, Game.** Each button is a **lane**; one
person or AI per lane, so lanes run in parallel. Inside a lane, take the lowest unchecked
step. Each step is done on the **web watch first**, then copied to the **ESP32** (the
firmware lane does that). Facts stay factual: no real calls, GPS or dispatch — say
"Demo" where it matters.

**Home — guide me home**
- [x] **H1 — Landmarks + turn arrow.** Photo, place name, Turn left / right / Go straight,
  I see it, Not yet → I see it now, I know my way. Web + ESP32. *(#19, #23, #26)*
- [ ] **H2 — Don't know the way → nearby police station.** After "Not yet" / "I don't see
  it", Momo tells the caregiver the nearest police station (simulated list, no real GPS)
  and asks "Call the police station?". Phone: name, distance, Call button (demo, no real
  call). Watch: one calm line, "Your family is helping."
- [x] **H3 — Voice guidance.** Momo speaks each step ("Do you see the community garden?
  Go straight." / "Turn left at the bakery."), stops when the walk ends; the Care tools
  voice setting mutes her. Web only. *(Codex #43)*

**Call — call a family member**
- [x] **C1 — Choose who to call.** Tap Call → 3 big faces (Jamie, Sam, Mei) → tap one;
  the phone shows "Alex wants to call Sam". Web + ESP32 (BLE 0x0B). Editing the family
  list on the phone and real photos come with G2 (faces).
- [x] **C2 — Calling screen.** Ringing (ring tone on the web and the ESP32 speaker) →
  phone **Answer** / **Decline** → "Sam replied." or "No answer." → **Try Mei**. Rings out
  after 25 s. Mirror codes 17–19. Demo, no real call.
- [ ] **C3 — Recorded call messages.** Record a short message per person; the web plays
  `public/audio/call-<id>.mp3`, the ESP32 plays `/call-<n>.wav` from flash (hooks are in;
  add the files + a FAT upload tool). The board has no vibration motor — add a small coin
  motor on a free pin if we want buzzing.

**Talk — talk with Momo**
- [x] **T1 — Momo's character + chat.** Talk is like a call with Momo. She opens with one
  question: outside the safe zone "Hello! Shall I guide you home?" (Guide me home / Just
  chat), otherwise "Hi! Want to chat with me?" (Let's chat / Not now) — answer by voice or
  one big tap. Then free chat, hands-free, no typing. Quiet 7 s → "Are you still there?"
  once; quiet again → home. ESP32: same question and buttons (byte0 bit 7 = outside the
  zone); on-chip speech recognition is a later step. *(ZCode #38, Claude)*
- [x] **T2 — Guide me home by voice.** Saying "take me home" starts H1. *(22 Nov, ZCode — step-t2-home-by-voice. Also "go home", "I want to go home" and Indonesian "pulang" / "antar saya pulang"; Momo answers “Okay, let’s go home.” and the walk starts after she says it.)*
- [ ] **T3 — Call by voice + a few more answers.** "Call Jamie" / "call my daughter" →
  Call lane (C2 ringing). Momo also answers "what time is it?", "what day is it?",
  "where am I?" (simulated, near home) in ≤ 8 words. Still hands-free, 7 s timeout.

**Game — memory game**
- [x] **G1 — Familiar landmarks.** Show a photo, pick its name from 2 big choices.
  *(WorkBuddy #35; ESP32 copy by Claude with the built-in photos.)*
- [x] **G2 — Familiar faces.** Show a family photo, pick the name. *(WorkBuddy #40; ESP32
  copy by Claude: "Which game?" Places / Faces with the same drawings.)*
- [x] **G3 — My happy places.** Places with memories, with a short line from the family.
  *(WorkBuddy #46.)* Every Game card now shows a short memory under the answer
  ("Your favourite bakery. You love their muffins."). Web + ESP32.
- [ ] **G4 — Caregiver edits the games and family on the phone.** Care tools → "Family &
  memories": edit each person's name, relation and memory line (Call + Faces), and each
  place's memory line (Places, Happy places); upload a photo per card (stored in the
  browser like the Memory library). The web watch uses them right away. ESP32 keeps the
  built-in set for now.
- **ESP32 flash is at 83 %.** Fine for now. Only if a new step no longer fits (G3, real
  family photos, call recordings), add SD-card support: the board has a micro-SD slot,
  so pictures/sounds load from `wayhome/` on the card with the built-in ones as fallback.

**SOS — hold 3 seconds** (stays on every screen)
- [x] **S1 — SOS asks the caregiver "Call the police?"** *(Codex #36; ESP32 shows "Help is
  coming. · Demo".)* After an SOS hold, the phone's
  Today card shows the nearest police station (same simulated list as H2: name, distance)
  with **Call police** and **Not now**. Call → "Calling … (demo, no real call)" and the
  alert log records it. The watch stays on "Help is coming." Reuse the existing simulated
  police notification in `EmergencyAssistance.tsx`; never imply real dispatch. Do after H2.

**ESP32 parity (firmware lane)** — after each web step merges, copy it to the physical
watch and add its Bluetooth command/screen code to `src/services/ble.ts` and
`firmware/wayhome-watch/README.md`.

## Demo moments — paused

Paused while we build the 4 buttons. Steps 1–5, 7 and 2b are done; 6, 8, 10, 11 and 9
wait. Step 12 moved into the Home button below (H2).

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
- [x] **Step 4 — "Takes it off".** *(Merged #22. ESP32 code 8.)* Today the phone says "Caregiver Assistance Requested",
  but nobody asked for help, and the watch shows a call screen to nobody. Done when: the
  phone says "Watch taken off" and offers Find My, the watch shows a quiet "Put me on?"
  screen, and no family request is created.
- [x] **Step 5 — "+8 min" escalation.** *(Merged #28, web + phone; ESP32 → Step 10.)* Today the phone escalates to Urgent while the watch
  stays on "Go home?". Done when: every ladder step also shows on the watch (buzz again →
  "Call family?" → caregiver alerted) and both devices always show the same step.
- [ ] **Step 6 — "Weak GPS" during a walk.** Done when: during a walk the watch keeps the
  landmark photo, hides the arrow and says "Look for the bakery"; outside a walk it stays a
  calm check-in.
- [x] **Step 7 — Happy endings.** *(Merged #25, web + phone; ESP32 → Step 11.)* Add two moments: "Arrives home" (watch: Welcome home;
  phone: All calm + a short summary) and "Family calls back" (watch: "Jamie replied";
  phone: request done).
- [ ] **Step 8 — Last long sentences.** Shorten the store messages still shown on the
  watch ("It's okay. I'm here with you.", "Help request sent — simulation") to ≤ 5 words,
  first-person, and copy them to the ESP32 firmware.
- [x] **Step 2b — Guide home on the ESP32.** *(Merged #23, #26.)* Turn arrow + photo +
  place name, Not yet works, I see it works on every walk, I know my way (0x0A), less lag.
- [ ] **Step 10 — Safe-zone ladder on the ESP32.** Today "Walk out of safe zone" shows
  "One moment, please" on the physical watch. Done when: each ladder step (Go home? → still
  out → Call family? → caregiver alerted) shows on the ESP32 like the web watch, its buttons
  work, and both always show the same step. Reserved mirror codes **9–12** (steps 1–4).
- [ ] **Step 11 — Happy endings + handover on the ESP32.** Done when: "Welcome home",
  "Jamie replied", the family-request screen and the calm "It's okay" screen all show on
  the ESP32 instead of "One moment, please". Reserved mirror codes **13–16**. ("Welcome
  home" is local state in `Wearable.tsx` today; move it into the store so Bluetooth sees it.)
- [ ] **Step 9 — Final check.** A logic review of steps 3–6 and 10–12 (Ilyas), then Clarine
  runs the whole demo on the web and the physical watch and approves.

### Hardware smoke test (step 1; repeat after any firmware change)

✅ touch, ✅ connects, ✅ guide home (I see it, Not yet → I see it now, two walks in a row). Still to check: pair from **Connect Sprout watch** → 4 home tiles (Home, Call, Talk, Game) → caregiver
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
3. **Green bar:** `npm test` (139), `npm run build`, full Playwright (104). A PR may not lower it.
4. Firmware PRs also compile:
   `arduino-cli compile --fqbn esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi,CDCOnBoot=cdc firmware/wayhome-watch`
5. Merge order: PR → Ilyas (logic PRs) → Clarine → squash-merge → Pages deploys.
6. **Facts stay factual.** Never imply real calling, GPS, monitoring or emergency dispatch.
