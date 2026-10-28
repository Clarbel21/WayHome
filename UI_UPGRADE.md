# WayHome UI upgrade

A usability pass on the side-by-side demo (`#/together`), using the
[saltymiaaaa/wayhome](https://github.com/saltymiaaaa/wayhome) prototype as a reference. All safety rules stay in
`src/store.ts` and `src/services/safety.ts`. These changes are presentation and wiring only.

## What changed

**Wearable (`src/components/Wearable.tsx`, `src/upgrade.css`)**

- The watch now shows one screen per situation instead of stacking every button at once.
- Home is four large tiles (**Go home, Call family, Talk, Memories**) plus the SOS hold bar, like the reference's GO HOME / CALL / TALK / SOS layout.
- Check-in shows two big answers: **I'm okay** and **I need help**.
- Guidance shows **Stop n of 4** progress, a large landmark photo, "Look for …", **I see it**, **I don't see it**, and small Call / Cancel buttons.
- Reaching the last landmark shows a **Welcome home** screen.
- Reorientation is a calm breathe-with-me screen.
- Family handover and SOS show a Sent → Seen → Responding tracker. The watch only says the caregiver has seen an SOS after they actually acknowledge it.
- SOS fills left to right while held, so the 2-second hold is visible.
- **Cancel guidance** stays reachable even when a GPS or check-in event replaces the guidance screen.

**Caregiver phone (`src/components/CaregiverPhone.tsx`)**

- The status card is colour-coded: **All calm** (green), **Needs attention** (amber) or **Urgent** (red).
- Each card has one contextual action: SOS timeline + Acknowledge, family request first, route progress during a walk, or plain-language reasons for scenario alerts.
- A live route strip moves the wearer's dot along the seven sample points toward home.
- Four reading chips (device, wear, battery, GPS) each have a status dot. Low battery shows a reminder.
- Updates show relative times ("5 min ago") and include **Mark all read**.

**Demo stage (`src/components/DemoStage.tsx`)**

- A one-click **Try a moment** bar: Walk home, Wanders off route, Stops moving, Weak GPS, Takes it off, Loses signal, Low battery, SOS, Reset demo.
- Each moment calls an existing store action, so SOS precedence and blocked reset still apply. A caption tells the presenter what to watch on each device.

**Language (`src/i18n.ts`)**

- An **EN / ID** switch sits in the header and is remembered per browser.
- The wearer screens, phone headline actions and page chrome are translated. Caregiver-entered content (landmark names, notes, alert history) keeps the language it was entered in.
- English strings are unchanged from before, and a unit test enforces that.

## Test changes

- Home-screen tests now click **Go home** / **Talk** / **Memories** instead of the old long labels. Help-option labels such as "Help me get home" are unchanged.
- New: `tests/i18n.test.ts` (4 tests) and `tests/e2e/upgrade.spec.ts` (5 browser tests).
- Result: 79 unit tests and 57 browser tests pass. The production build and the `/WayHome/` subpath were smoke-checked.

## Still simulated

Nothing here adds real GPS, calls, notifications or hardware. Thresholds and wording are demo assumptions. Review the wearer-facing wording with caregivers before any user trial.

## Linking pass (follow-up)

The first upgrade only covered the side-by-side page. This pass connects the rest of the app to it:

- **Landing:** "Explore demo", "Explore the companion experience" and "Enter Companion Mode" now open the live side-by-side stage (`#/together`). "Take the guided demo" still opens the story.
- **Guided story:** shows the caregiver phone next to the watch. All eight steps now describe what the new screens actually show. It also links to the side-by-side stage.
- **Caregiver dashboard:** the status banner turns green, amber or red like the phone, with a direct action (Review SOS / Answer family request / Review alerts). The header has **Open live stage**.
- **Demo control center:** has the same one-click **Quick moments** bar as the stage.
- **Memory Garden:** activities are coloured tiles with icons, answers use distinct colours (Yes / Not sure / Tell me more), headings match the app, the focus box is gone, and the SOS bar matches the watch.
- **Stale site fix:** the footer shows a build stamp (commit ID and date). Open tabs check for a newer deploy and offer **Refresh**, so an old cached version is never presented by accident.

Tests: 79 unit, 59 browser.

## Safe zone and guided return (modelled on saltymiaaaa/wayhome)

Code: `src/zone/` (store, runtime, views). Fall detection and medicine reminders were intentionally not ported.

- **Set the radius:** use the slider under the phone's map, or **Safety policy → Safe zone around home**, which also sets the ladder timing. Values are remembered per browser.
- **Demo moments:** **Walk out of safe zone** (the dot walks past the edge), **Lost far from home** (jumps well outside) and **+8 min** (fast-forwards time outside).
- **Leaving the zone:** the watch vibrates (shake animation, `navigator.vibrate` where supported, a soft chime) and asks _"Heading home? Alex, you are a little far from home. Shall I guide you back?"_ with **Yes, take me home** / **No, I'm fine** and a 16-second countdown. Silence or "No" means it asks again gently.
- **Escalation ladder** (shown on the phone, paused while guiding): check-in on the watch now → notify Jamie (+5 min) → SMS and call Morgan (+10 min) → simulated emergency (+20 min), which hands over to the existing SOS flow. One real second equals 30 simulated seconds.
- **Guided return:** for each approved landmark the watch shows a direction ("Go straight ahead · about 55 m") while the dot walks on the map. Then it asks _"Do you see the Community garden?"_ with the photo. **I see it** continues; **I don't see it** stops directions and offers family. After the last landmark: **Welcome home**, the zone check closes, and Updates records "arrived home safely".
- Everything is simulated: no real GPS, vibration hardware, SMS, calls or emergency dispatch.

Tests: `tests/zone.test.ts` (5) and `tests/e2e/safe-zone.spec.ts` (3). Totals: 84 unit, 62 browser.

## Live route home (watch directions + caregiver map)

- `src/zone/route.ts` defines one simulated street route home. Each landmark sits on a corner, and the watch and the phone both read from it, so they always agree.
- **Watch:** while walking it shows a turn instruction from the route ("Go straight ahead", "Turn right at the Community garden", "Turn left at the Neighborhood bakery"), the metres left to the next landmark with a progress bar, and the landmark photo. On arrival it asks "Do you see the …?".
- **Caregiver phone:** during guidance the first card is a live map. It shows streets, the dashed route, the walked part in green, landmark photos as pins (ticked once passed), home, and the wearer's pulsing dot moving toward home, plus "Next: Local library · 7 m" and the distance from home. The paused escalation ladder shrinks to one line.
- Starting guidance from the watch's **Go home** tile inside the zone uses a fictional start point inside the radius, so the walk is shown without triggering a zone alert.

Tests: `tests/route.test.ts` (3); safe-zone browser test checks the map and turn text. Totals: 87 unit, 62 browser.

## Memory Garden: Practice my way home

The Memory Garden now has a clear purpose at the top: helping the wearer **notice and remember the landmarks on their walk home**, using the same landmarks and turns as live guidance (`src/zone/route.ts`).

- **Practice my way home** card: the walk shown as a strip of photos with turn arrows, and how many places already feel familiar.
- **Look at my walk first:** one place at a time, with the instruction the watch will give ("Turn right at the Community garden"), a large photo and a clue ("Look for the red-and-white striped awning and the peach door").
- **Practice with me:** short questions in three rounds:
  - "Which one is the Neighborhood bakery?" (photos)
  - "At the Community garden, which way do you go?" (Left / Straight on / Right)
  - "After the bakery, which place comes next?"
    The look-alike choices come from 8 new neighbourhood places.
- **Errorless learning:** a wrong pick is never marked wrong. The right photo glows with its clue and the wearer chooses it. A place that needed a clue comes back a little later (spaced retrieval), once per question and at most 3 extra per walk.
- **Finishing** grows a flower in the garden and shows each place as "Feels familiar" or "Let's look again soon". There are no scores, timers or penalties.
- **For caregivers:** _Familiar landmarks_ has a **Landmark familiarity** card ("Remembers well / Getting familiar / Still learning", with how often each was recognised straight away versus with a clue). It describes the landmark, not the person: a place that stays "Still learning" needs a clearer photo or clue.
- **More realistic data:** distinctive redrawn route landmarks (a garden arch with flowers, a striped bakery awning, library columns, a blue home gate) with clues; 8 new place illustrations; new sample memories (grandson Daniel, neighbour Mrs Tan, the Saturday market, the kopi shop, a wedding song, making tea). Saved libraries are migrated to include the new samples.
- **Garden picture:** redrawn with illustrated flowers, leaves, butterflies and trees.

Code: `src/memory/practice.ts` (engine), `src/memory/WayHomePractice.tsx` (screens + caregiver card). Tests: `tests/practice.test.ts` (6), `tests/e2e/practice.spec.ts` (4). Existing library tests were updated for the new samples. Totals: 93 unit, 68 browser.

## Pass 7 — Memory Garden on the watch, real songs, realistic faces

- **Memory Garden now runs inside the watch screen.** The Memories tile, "Open Memory Garden" and the companion "Explore Memories" button open it on the watch (no page change). "Back to watch home" / "Maybe later" close it. SOS stays visible underneath.
- Old links to `/memories` (caregiver review, journeys, library) open it on the watch when the wearer is calm. If an alert, check-in or guidance is active, the separate paused page still explains why and links to caregiver review.
- **Safety wins:** any non-NORMAL mode closes the watch Memory Garden immediately. The activity is paused, not lost, and can be resumed later. The open view survives a reload (per-tab sessionStorage).
- Compact watch styling: single-column activity tiles, 2×2 route photos, smaller hero and garden art, no horizontal overflow.
- **Familiar Faces:** 10 new realistic people with portraits and everyday details: son Jamie, daughter-in-law Morgan, granddaughter Lily, carer Sarah, kopi-stall Ah Seng, neighbour Auntie Siti, Uncle Lim, Dr Kumar, granddaughter Priya, Mr Wong. 13 faces in total.
- **Music Memories:** 12 real, well-known songs with artist and year: Teresa Teng, P. Ramlee, Saloma, Gesang, folk songs, Elvis, Louis Armstrong, Audrey Hepburn, Doris Day, The Righteous Brothers. 14 songs in total. No audio or lyrics are bundled. Each card has a "Find this song to play together" YouTube search link.
- Realistic samples and caregiver-added entries are offered before the old placeholder samples.
- Memory store migration v3 adds the new samples for existing users without touching their own entries. The backup image whitelist includes the new portraits.
- Tests: `tests/memory-samples.test.ts` and `tests/e2e/watch-memories.spec.ts` are new, and the existing specs are updated for the watch flow. 97 unit tests and 70 browser tests pass.
