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
