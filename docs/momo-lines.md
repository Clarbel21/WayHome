# Momo's fixed lines — recording list for the ESP32 (V1)

Every fixed English line Momo says on the web watch, with the WAV file name
to record for the ESP32 voice lane (**V1** — Momo speaks on the watch).
One line per row, one WAV per row. English only (plan rule 6d).

Notes for whoever records:

- Calm, warm, first-person voice, short pauses — these play on a small speaker.
- Rows marked **{placeholder}** contain a real name (wearer, companion, family,
  landmark). V1 records the fixed frame + name separately, or those lines stay
  on device TTS until V2.
- The real clock and day answers ("It's 3:45 PM." / "It's Saturday.") are
  generated from the real date — not fixed lines; excluded here.
- Store interaction notes (Step 8) are listed at the end — they still change.

## Greetings

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `talk-greet-hi.wav` | Hi {name}! I'm {companion}. | Template — {name} and {companion} are the wearer's and companion's real names; V1 records the fixed part or uses on-device TTS. |
| `talk-greet-intro.wav` | I'm here with you. | Free-chat fallback line. |

## Talk opening

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `talk-ask-guide.wav` | Hello! Shall I guide you home? | Outside the safe zone. |
| `talk-ask-chat.wav` | Hi! Want to chat with me? | Inside the safe zone. |
| `None` | Guide me home | Button label (wearer side) — not spoken by Momo. |
| `None` | Let's chat | Button label (wearer side) — not spoken by Momo. |
| `None` | Just chat | Button label (wearer side) — not spoken by Momo. |
| `None` | Not now | Button label (wearer side) — not spoken by Momo. |

## Talk answers

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `talk-answer-go-home.wav` | Okay, let's go home. | T2 home-by-voice confirmation. |
| `talk-bye.wav` | Okay. I'm here if you need me. | "Not now" goodbye. |
| `talk-chat-start.wav` | Lovely! What shall we talk about? | Free chat begins. |
| `talk-nudge-still-there.wav` | Are you still there? | First 7 s quiet nudge. |
| `talk-answer-guide.wav` | I can guide you home. | Kept for the ESP32 copy; the web watch answers Near home · Demo. |
| `talk-answer-family.wav` | Call {caregiver} anytime. | {caregiver} is a real name — spoken by name. |
| `talk-answer-comfort.wav` | Take your time. I'm here. |  |
| `talk-answer-nice.wav` | I'm glad you're here. |  |

## Check-in

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `checkin-ask-help.wav` | How can I help? | Check-in help options screen. |
| `checkin-hint.wav` | Take your time. Tap one. |  |

## Guidance (H1)

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `guide-paused.wav` | Let's pause here. | Guidance paused line. |
| `guide-no-landmarks.wav` | No approved landmarks yet. | No approved landmarks. |
| `guide-step-straight.wav` | Go straight ahead | Guide step. |
| `guide-step-turn-right.wav` | Turn right | Guide step. |
| `guide-step-turn-left.wav` | Turn left | Guide step. |
| `guide-ask-see.wav` | See the {name}? | {name} = the landmark's real name. |
| `guide-walking-home.wav` | {wearer} is walking home | {wearer} = the wearer's real name. |
| `guide-family-helping.wav` | Your family is helping. · Demo | Reorientation: missed stop. |

## Safe zone

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `zone-ask.wav` | Go home? | "Go home?" prompt. |
| `zone-text.wav` | {name}, you are a little far from home. Shall I guide you back? | {name} = the companion's name. |
| `zone-still-out.wav` | Still outside? | Escalation nudge. |
| `zone-family-alerted.wav` | I alerted family · Demo | Escalation: family alerted. |

## SOS

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `sos-help-coming.wav` | Help is coming. · Demo | SOS screen headline (v7). |
| `sos-notified.wav` | {caregiver} and {emergency} are shown as notified in this demo. | {caregiver} and {emergency} are real names. |
| `sos-waiting.wav` | Waiting for {caregiver} | {caregiver} is a real name. |
| `sos-acked.wav` | {caregiver} has seen your SOS | {caregiver} is a real name. |
| `sos-stay-here.wav` | Stay where you are. |  |

## Call (C2)

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `call-ringing.wav` | Ringing… | Ringing screen. |
| `call-no-answer.wav` | No answer · Demo | No-answer screen. |
| `call-try-next.wav` | Try {name} | {name} = the next contact's real name. |

## Offline

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `offline-line.wav` | No signal right now | Offline screen. |

## Inline lines (composed in `Wearable.tsx`, no i18n key yet)

| WAV file | Momo says (EN) | Note |
|---|---|---|
| `call-confirm-name.wav` | Calling {name}. | T3 call-by-voice confirmation — {name} = the called person. |
| `talk-answer-where.wav` | Near home · Demo | T3 where-am-I (simulated; composed from `nearHome` + Demo). |
| `guide-confirm-start.wav` | Okay, let's go home. | T2 confirmation — also in i18n as `talkGoHome`; the ESP32 uses that key. |

## Store interaction notes (Step 8 — wording may still change)

| WAV file | Momo shows/says | Note |
|---|---|---|
| `note-thanks.wav` | Thank you for telling me. I'm here with you. | Acknowledged check-in (test-locked). |
| `note-not-yet.wav` | That's okay. We'll stop these directions. Your family can help. | "Not yet" on a walk. |
| `note-simulated.wav` | These are simulated directions. Look for one familiar place at a time. | Walk start. |
| `note-paused.wav` | Guidance is paused while your caregiver reviews the current concern. I can't confirm the route. | Caregiver review. |
| `note-call-demo.wav` | Demo — no real call. | Honesty note (SOS + call). |

## Not recorded (dynamic or wearer-side)

- Real clock / day answers ("It's 3:45 PM." / "It's Saturday.") — generated from
  the real date.
- Wearer-side button labels (Guide me home, Let's chat, Just chat, Not now,
  I see it, Not yet, Call, I know my way, Back) — tapped, not spoken by Momo.
- The caregiver's and family members' real names — recorded separately per name
  when the family list is final (G4 editor).
