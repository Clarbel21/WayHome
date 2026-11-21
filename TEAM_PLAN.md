# WayHome team plan v4

**Updated:** 21 Nov 2026 · **Decides:** Clarine (`clarbel21`) · **Reviews logic:** Ilyas (`itsme-lahlou`)
**Builders:** Codex · ZCode · Claude · WorkBuddy · Supersedes v3 (PR #5) and v2.

## Goal

- **Watch = for the elderly wearer.** As simple as possible: big pictures, few words, big buttons.
- **Phone = for the caregiver.** Complete and easy to use.

The watch does five things: **🏠 go home with familiar-landmark photos · 📞 call family ·
💬 talk to Sprout · 🎮 memory game · SOS (hold 3 s).**

## Where we are (verified 21 Nov on `claude/watch-minimal-p0`)

| Flow | Web watch | Phone sees it | ESP32 |
|---|---|---|---|
| 🏠 Home → landmark photo → "I see it" → next stop → Welcome home | ✅ | ✅ map dot moves | ⚠️ not re-tested |
| "Not yet" → "I see it now" resumes the walk | ✅ | ✅ | ❌ no screen |
| Leave safe zone → buzz → "Go home?" → guidance | ✅ | ✅ | ⚠️ |
| 📞 Call → Sent / Seen / Replied → continue | ✅ | ✅ | ⚠️ |
| 💬 Talk → 4 topics → back | ✅ | ✅ activity log | ❌ "Coming soon" screen |
| 🎮 Game → Memory Garden → safety pauses it | ✅ | ✅ | ❌ "Coming soon" screen |
| SOS: a tap does nothing, a 3-second hold sends once | ✅ | ✅ | ✅ (3000 ms in firmware) |

Tests: **127/127 unit tests and 86/86 browser tests pass.** Main had 19 browser
failures before this pass; all were stale expectations, not bugs.

## Watch wording rules (apply to every watch screen)

1. **One idea per screen.** One photo or icon, one line, up to 3 buttons, plus SOS.
2. **≤ 5 words per line, ≤ 3 words per button.** Example: "See the bakery?", "I see it", "Not yet".
3. **Pictures before words.** During guidance, the landmark photo is the largest thing on screen and is never hidden.
4. **Don't rely on left/right alone.** Always show the arrow *and* the photo of the next place.
5. **No explanations on the watch.** Disclaimers, reasons and help text go on the phone or stage. The watch keeps only a short honesty note where needed, e.g. "Demo — no real call."
6. **Minimum sizes:** text 15 px, buttons 44 px tall (primary 50 px). Nothing scrolls, and every screen has a way back home.
7. **The same words on both watches.** The web watch and the ESP32 use the same strings (`src/i18n.ts` is the source; the firmware copies it).
8. **The phone can say more.** It is for caregivers, but stays scannable: status first, details under Care tools.

## Lanes: who owns what

Stay inside your files. If you need a change in someone else's file, ask in your PR.

| Lane | Owns | Current focus |
|---|---|---|
| **ZCode** (watch look) | `Wearable.tsx` layout, `watch-ui.css` | Watch visuals follow the wording rules |
| **WorkBuddy** (phone) | `CaregiverPhone.tsx`, `caregiver-phone-ui.css`, caregiver pages | Finish PR #6 |
| **Codex** (logic + hardware) | `store.ts`, `zone/*`, `services/*`, `firmware/*`, stage layout in `App.tsx` | ESP32 parity, PR #8 |
| **Claude** (words, content, QA) | `i18n.ts` copy, `memory/*` content and samples, `tests/e2e/*`, docs | Wording rules, green tests, plan |
| **Ilyas** (review) | — | Logic review gate before merge |
| **Clarine** (owner) | — | Approves each PR and the final demo |

## Task list

### ZCode — watch look
- [ ] Call screen: enlarge the Sent/Seen/Replied chips (now ~9 px) and the status line to the 15 px minimum.
- [ ] Replace the icon-only 🏠 "back" button (on "Not yet" and other screens) with a labelled "Back" button. A house icon reads as "go home", which is confusing during guidance.
- [ ] Talk: chips to 15 px. Decide with Clarine whether 3 topics are enough.
- [ ] Clarine to decide whether the "Mode · Normal" button stays on the watch home (simpler without it; the caregiver can set the mode).

### WorkBuddy — caregiver phone
- [ ] PR #6: apply Clarine's review (shared mode list, no overlap with the bottom nav, correct mode wording).
- [ ] Add an "Open full workspace" link under Care tools. The old in-phone link is gone; today only the header has one.
- [ ] Today screen must show at a glance: wearer status → active alert → Check-in / Find My → mode → location / battery.

### Codex — logic and ESP32
- [ ] ESP32 screens for "Not yet → I see it now", Talk and Game (no "Coming soon" dead ends), with new mirror codes and tests in the same PR.
- [ ] Copy the short watch wording (rule 7) into `firmware/watch_ui.cpp`.
- [ ] Fix the stale "2-second" comment in the firmware (the code already uses 3000 ms).
- [ ] Restore `REDESIGN_HANDOFF.md` from `esp32-watch-ble` to `docs/`. Plans cite it, but it is missing from `main`.
- [ ] Run and record the 2-minute hardware smoke test (below).

### Claude — words, content, QA
- [x] Guide screen: landmark photo back, one line, big buttons; shorter copy on home, zone prompt, call, talk and focus (EN + ID).
- [x] Browser tests back to green (86/86) and aligned with the phone-left layout.
- [ ] Wording pass on remaining screens: check-in, help options, SOS, arrived (rules 1–5).
- [ ] Memory Garden on the watch: cut the menu to 4 big tiles.
- [ ] Keep this plan current after each merge.

### Ilyas — review gate
- [ ] Review each PR's store/flow changes: no orphan screens, no dead buttons, safety interrupts and resumes correctly.

## How we work

1. **Branch per task:** `<lane>/<short-name>` from the latest `main`. No direct pushes to `main`.
2. **Small PRs.** Each has before/after screenshots of the watch or phone, plus test results.
3. **Green bar:** `npm test`, `npm run build`, and the full Playwright suite (baseline **86/86**). A PR may not lower it. If a test's wording is outdated, update the test in the same PR and say why.
4. **Merge order:** owner opens the PR → Ilyas reviews logic (store/BLE PRs) → Clarine approves → squash-merge → GitHub Pages deploys.
5. **Hardware PRs** also need the firmware compile and the smoke test:
   `arduino-cli compile --fqbn esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi,CDCOnBoot=cdc firmware/wayhome-watch`
   Smoke test: pair → 4 home tiles → caregiver check-in → one route step → SOS tap (nothing happens) → SOS hold 3 s (sends once).
6. **Facts stay factual.** Never imply real calling, GPS, monitoring or emergency dispatch.

Windows Git Bash: build with `MSYS_NO_PATHCONV=1` if you pass `--base`.
