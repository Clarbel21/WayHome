# WayHome redesign direction and handoff

**Updated:** 10 November 2026. **Audience:** WayHome teammates and coding assistants. This document travels with the product code. Check the current branch and app before treating a status item here as complete.

## What we are building

WayHome is an educational, local-first demonstration of a wearable companion and a caregiver application. The main presentation path is **understand the idea → try the working demo → complete a watch and caregiver interaction → explore another situation**. The first audience is university presentation judges; the interface should also be understandable to a family member without a presenter explaining every step.

The design should feel calm, precise and warm: neutral surfaces, dark readable text, one restrained green accent, consistent controls, a clear watch/phone relationship, and a small recognizable Sprout. Put the person's current task before decoration. Use the real React components and existing state transitions; do not replace them with disconnected mock screens.

The canonical hands-on entry is `#/together`. It offers three actual stories: **Walk home**, **Check-in**, and **Get help**. On desktop the watch comes first and the caregiver app sits beside it. On a phone, Watch and Caregiver are explicit tabs; a new request must not silently switch tabs. Advanced scenarios, mode selection and optional Bluetooth pairing belong in **More**, away from the first action.

## Current implementation

As of this update, the presentation redesign's first three milestones are implemented in this source tree. The redesign is still in progress; the remaining work is listed below.

- **Foundation:** shared visual tokens and controls; fixed watch and phone frames; one SVG Sprout family; watch templates for the principal tasks. The browser watch case is 276 × 368 CSS px (268 × 368 below 360 px), with a separate 44 × 64 px SOS target. These are presentation sizes, not physical watch specifications.
- **Paired demo:** three stories use real store actions. On-screen instructions and completion derive from current state. Refresh can resume the task. Changing stories asks before resetting fictional scenario/history, preserves personal content and memory progress, and is blocked by an unresolved SOS.
- **Caregiver priority:** the current request and next valid action appear above map and settings. Acknowledging SOS remains separate from independently reviewing and resolving it. The phone and watch retain explicit handoffs on narrow screens.
- **Presentation fit:** on desktop viewports at least 880 × 700 CSS px, `#/together` keeps the story controls, watch, caregiver phone and simulation footer inside one browser frame. Long content scrolls inside its device; smaller, zoomed or large-text layouts retain the explicit mobile tabs or document reflow.

The watch completion, memory-pause and return prompts now use the shared EN/ID language layer instead of component-local copy. The remaining watch-state audit still includes long-name, large-text and reduced-motion inspection.

Useful code: `src/demo/DemoShell.tsx`, `src/demo/story.ts`, `src/design/`, `src/components/devices/`, `src/watch/`, `src/caregiver/priority.ts`, `src/components/Wearable.tsx`, `src/store.ts`. `src/design/README.md` records current style ownership. The existing `/guided` presentation and standalone caregiver views still need consolidation.

The last completed redesign checkpoint passed **127 unit tests**, **102 Playwright browser tests**, and a production build for `/WayHome/` on Node 22.22.0. Those results describe that checkpoint, not later edits. Hardware, full screen-reader/zoom coverage, and every compact urgent state remain unverified.

## Next work, in order

1. **Finish every watch state.** Check unsure/unavailable guidance, waiting, acknowledgment, arrival, memory pause, returns and exits. Keep Normal, Focus and Dialogue consistent while retaining their different choice density. Test long names, English/Indonesian text, large text and reduced motion.
2. **Unify caregiver views.** Make the standalone app and paired phone show the same task, status and valid actions. Replace generic click-based popups with notifications from actual events and correct actors. Make People, Places, Memories and Watch settings usable as focused list/detail/edit flows on narrow screens.
3. **Rebuild the landing and entry paths.** Explain who the prototype serves, what it demonstrates and where to try it. Use one clear **Try the demo** action. Consolidate the old `/guided` presentation without breaking deep links or saved state.
4. **Complete quality checks.** Inspect desktop, tablet, 390 px and 320 px mobile, large text and browser zoom; check keyboard, focus, touch, reduced motion, EN/ID, screen readers and failed/offline assets. Measure first-load behavior before choosing bundle changes. Run the full tests and `/WayHome/` build on the exact final source.
5. **Rehearse with new viewers.** Observe whether they find and finish the demo without coaching, fix blockers, and prepare a repeatable two-minute presentation. Test the physical board separately if it is part of the pitch.

## Behavior that must remain true

- **SOS comes first.** Acknowledgment is receipt, not safety. Only explicit caregiver review and confirmation can resolve the current incident. A newer SOS invalidates an older resolution attempt. Ordinary navigation, modes and demo reset cannot clear it.
- **Device facts stay factual.** Disconnected, stale, unknown, possibly removed and weak-location observations must not become healthy merely because the UI changed. Show the source and age of an observation where they matter.
- **Guidance uses approved landmarks and existing eligibility checks.** A place approved for memories is not automatically approved for navigation. Recognition and route progress must use existing store actions; the map shows fictional demo progress, not live directions.
- **Family and check-in stages stay distinct.** Waiting, acknowledged, responded and wearer continuation are different events. A visual reassurance is not proof that a message arrived or help was received.
- **Memory content and progress survive ordinary navigation.** Safety interruption pauses an activity. Separate memory/navigation approvals, uploads and caregiver review rules remain in force.
- **Browser storage stays local.** Same-origin tabs can share state; separate devices do not have a backend connection. Location, messaging, calls and emergency dispatch are simulated. Optional ESP32-S3 pairing supplies real battery/motion observations, but no GNSS or real emergency service. The web UI and physical watch are not pixel-identical mirrors.
- **Keep routes and hosting compatible.** Preserve hash links and the GitHub Pages `/WayHome/` subpath.

## How to continue

Read `README.md`, `src/design/README.md`, the relevant store/components and existing tests. Check the branch, working tree, `origin/main`, open PRs and recent team changes before editing; preserve work already present. Extend the existing state and device-service contracts instead of creating a second safety model. For a code change, use Node 22.12+, run `npm test`, `npm run build -- --base /WayHome/`, and relevant Playwright flows; record actual results. Update this document when a milestone or product decision changes.
