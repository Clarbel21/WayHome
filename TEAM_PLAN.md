# WayHome team plan v5

**Updated:** 21 Nov 2026 · **Decides:** Clarine (`clarbel21`) · **Reviews logic:** Ilyas (`itsme-lahlou`)
**Builders:** Codex · ZCode · Claude · WorkBuddy · Supersedes v4.

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

## Next: finish the demo moments, one step at a time

Audit of every "Try a moment" button on 21 Nov. Do the steps **in order**; each step is
**one small PR** with before/after screenshots of both devices and the green bar.

| Step | Moment | Problem found | What "done" looks like | Owner |
|---|---|---|---|---|
| **D0** | — | The physical watch has never been tested with this build | Flash latest `main`, run the smoke test below, write the results into this file | Clarine (needs the board) |
| **D1** | Loses signal | The watch still shows the caregiver's check-in, but an offline watch cannot receive it | Watch: "Offline" screen with Home / Call / SOS that still work locally. Phone: "Watch offline · last seen near home", check-in waits until reconnect | Codex (store), Claude (copy) |
| **D2** | Takes it off | Phone says "Caregiver Assistance Requested", but nobody asked for help; the watch shows a call screen to nobody | Phone: "Watch taken off" + Find My. Watch: quiet "Put me on?" screen. No family request is created | Codex (store), WorkBuddy (phone) |
| **D3** | +8 min (outside the zone) | Phone escalates to Urgent; the watch stays on "Go home?" | Each ladder step shows on the watch too: buzz again → "Call family?" → caregiver alerted. Watch and phone always agree on the step | Codex (zone), ZCode (watch) |
| **D4** | Weak GPS | Caption promised "directions pause"; outside a walk it is just a check-in | During a walk: watch keeps the landmark photo, hides the arrow, says "Look for the bakery". Outside a walk: calm check-in (caption already fixed) | Codex, ZCode |
| **D5** | (new) Arrives home · Family calls back | The story has no happy ending to show | Two new moments: "Arrives home" (watch: Welcome home; phone: All calm + summary) and "Family calls back" (watch: "Jamie replied"; phone: done) | Claude (moments + copy), Codex (store) |
| **D6** | Wanders off route · SOS | Store sentences still too long for the watch ("It's okay. I'm here with you.", "Help request sent — simulation") | ≤ 5 words, first-person, identical on the ESP32 | Codex (store `messages`), Claude (firmware copy) |
| **D7** | All | — | Ilyas reviews D1–D4 logic; Clarine approves the full demo run-through | Ilyas, Clarine |

### Hardware smoke test (D0, repeat after D1–D6)

Pair from **Connect Sprout watch** → 4 home tiles (Home, Call, Talk, Game) → caregiver
check-in → "I see it" → "Not yet" → "I see it now" → SOS tap (nothing) → SOS hold 3 s (sends once).
Record ✅/❌ per step here.

## Lanes: who owns what

| Lane | Owns |
|---|---|
| **ZCode** (watch look) | `Wearable.tsx` layout, `watch-ui.css` |
| **WorkBuddy** (phone) | `CaregiverPhone.tsx`, `caregiver-phone-ui.css`, caregiver pages |
| **Codex** (logic) | `store.ts`, `zone/*`, `services/*` |
| **Claude** (words, firmware, QA) | `i18n.ts` copy, demo moments/captions, `firmware/*`, `tests/*`, docs |
| **Ilyas** (review) | Logic review before merge |
| **Clarine** (owner) | Approves every PR and the final demo |

If a task needs another lane's file, say so in the PR. When a lane is out of tokens, Claude
covers it and notes that in the PR.

## How we work

1. Branch `<lane>/<step>-<short-name>` from the latest `main`. No direct pushes to `main`.
2. One step per PR, with before/after screenshots of the watch **and** the phone.
3. **Green bar:** `npm test` (129), `npm run build`, full Playwright (92). A PR may not lower it.
4. Firmware PRs also compile:
   `arduino-cli compile --fqbn esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi,CDCOnBoot=cdc firmware/wayhome-watch`
5. Merge order: owner → Ilyas (logic PRs) → Clarine → squash-merge → Pages deploys.
6. **Facts stay factual.** Never imply real calling, GPS, monitoring or emergency dispatch.
