# Green WayHome caregiver upgrade

## Scope and decisions

The target is `Clarbel21/WayHome`. `saltymiaaaa/wayhome` was inspected as a functional reference only. No reference styles, illustrations, assets, typography, spacing system or source blocks were copied. The existing React/TypeScript app, hash routing, safety store, Memory Garden, green wearable, companion personality, caregiver workspace and Pages workflow remain.

Baseline before editing: 56 unit tests and 40 browser tests passed. Implementation decisions were recorded before editing in `IMPLEMENTATION_DECISIONS.md`.

## Files and responsibilities

- `src/stage.css`, `src/interfaces.css`, `src/styles.css`: green design tokens, height-bounded desktop stage, phone scrolling, touch targets and responsive reflow.
- `src/App.tsx`, `src/main.tsx`: stage, tool routes, explicit walkthrough/library exits and the existing runtime composition.
- `src/care/store.ts`: persisted contacts, E.164-style normalization, required-caregiver guard, permission/order-aware simulated receipts, quiet hours/grace checks and optional journey definitions.
- `src/care/Tools.tsx`: contact CRUD/photo editor, safety policy, detailed activity/notification history, phone settings and journey editor.
- `src/care/Landmarks.tsx`: extracted existing landmark manager, photograph upload, recognition/spoken cues, map/grid metadata, visibility/salience/familiarity, notes, enable/disable and independent memory approval.
- `src/care/JourneyPlayer.tsx`: optional person/story/place/song journeys with Back, Skip, Next and Exit; no scores or forced recall.
- `src/components/CaregiverPhone.tsx`: compact navigation for Overview, Contacts, Safety policy, Familiar landmarks, Memory Library, Activity history and Settings; shared wearer/device/guidance/check-in details.
- `src/store.ts`, `src/components/CheckInSupport.tsx`: existing safety runtime timing, cancellation, landmark-reached/GPS history and explicit interaction exits. No replacement emergency engine.
- `src/components/Wearable.tsx`: home companion/memory actions, acknowledgment next actions, simulated landmark distance/recognition cue, spoken landmark cue and cancellation during uncertain GPS.
- `src/memory/MemoryPlayer.tsx`, `src/memory/MemoryDemo.tsx`: correct root Back/Exit behavior, optional journey invitation and walkthrough exit.
- `tests/caregiver-tools.test.ts`, `tests/e2e/caregiver-tools.spec.ts`: new validation, persistence, permission, layout, shared-state, keyboard and exit regressions. Existing memory/landmark browser tests now distinguish root Back from activity Back and navigation approval from memory approval.

## Layout and green identity

Desktop uses the available viewport height (`100vh` fallback and `100dvh`) with a 60 px application header, bounded heading/control rows and a 45/55 watch/phone grid. Both devices and the SOS/demo controls fit at 1280×720, 1366×768, 1440×900 and 1920×1080 without document scrolling. Tests measure device and control bounds in home, acknowledgment, guidance and help states. The phone scrolls internally.

Below 1000 px width or 650 px height, content returns to a readable stacked layout. Large-text mode also allows normal flow. Mobile 390 px and 200%-equivalent reflow (a 1280×720 desktop reduced to 640×360 CSS pixels) retain both interfaces and keyboard access. The app uses the existing cream, pale green, sage and forest colors; amber marks nonemergency validation/attention, red remains associated with SOS/emergency. Existing art and Memory Garden remain nature-inspired. Touch targets are at least 44 px in the new tools and compact controls.

## Logic and caregiver features

Contacts include name, relationship, country code, normalized number, optional profile photo, preferred method, individual simulated push/SMS/call permissions, primary/emergency status, enablement and ordered escalation. Invalid numbers and a mismatched country code produce clear errors. Deleting or disabling the last enabled primary caregiver with a permitted method is blocked with an explanation. Committed numbers are fictional +1 202-555-01xx examples. Numbers are not used in URLs or logs.

First/repeated/nonurgent check-in timing uses the existing safety store/runtime. The policy observer records receipts rather than deciding emergencies. Primary/secondary notifications respect the configured stage, enabled contacts and their permitted methods in saved order. Nonurgent delays, geofence grace and quiet hours affect simulated notifications only. Queued receipts recheck permissions and quiet hours at delivery and cancel when an applicable concern has already cleared. Only explicitly approved SOS/fall simulations may produce an emergency-stage notification receipt. Notification permission never clears SOS.

Every history receipt states its trigger, selected stage/reason, outcome, recipients/method and what resolves the concern. Existing six-state safety conditions, device uncertainty, acknowledgment, human resolution and normal-monitoring gates remain separate. Landmarks must be navigation-approved and enabled to guide; independent memory approval creates approved reminiscence content, not navigation permission. Uploaded photo copies preserve the separation between memory and guidance.

After “I'm okay,” the wearer can Open Memory Garden or Return to wearable home. Memory Garden root Back/Exit returns to its wearer interface; activity Back returns to memory choices. Phone section Back/Close returns to Overview, and standalone Memory Library also has a Close path to the phone. Contact Cancel/Escape and landmark Escape restore the trigger's focus. Exiting either walkthrough closes presenter state and stops its check-in deadline/guidance, while keeping unresolved safety incidents and device faults intact.

## Demonstration

1. Open `#/together` on a desktop. Both devices are visible without page scrolling.
2. Phone → Contacts → Add contact. Try an invalid number, then a fictional valid one. Edit, reorder, refresh, and try deleting the final required caregiver.
3. Phone → Safety policy. Change repeat timing and notification permissions. Read the history receipts; all communication is simulated.
4. Phone → Familiar landmarks. Upload a picture and add a short landmark cue. Approve memory and navigation independently. Try temporarily disabling the landmark.
5. Send a check-in from Overview; answer on the watch. Try both next actions after “I'm okay,” then use Back/Exit to return.
6. Start guidance, reduce GPS confidence in another demo tab, then Cancel guidance. The guidance ends while the location concern stays unresolved.
7. Phone → Memory Library → Memory Journeys. Save optional approved items, open Memory Garden and choose the journey. Skip, go Back or Exit at any time.
8. Hold SOS during any flow. Acknowledge it on the phone; SOS remains active until the existing caregiver incident-resolution flow is completed.

## Prototype limits

- No backend exists in this target repository. Backend-available persistence testing is therefore not applicable; there is no remote caregiver synchronization to claim. localStorage and IndexedDB persistence, reloads and same-origin cross-tab behavior are tested; GitHub Pages needs no backend.
- Phone validation checks E.164-style format and matching country prefix, not number ownership, dialability or a worldwide numbering-plan database.
- Calls, push, SMS, fall, route position, distance, confidence and wearable readings are simulations. Heart rate is explicitly **not measured**; no sensor is invented.
- Visibility/salience/familiarity and grid position are caregiver metadata for review, not an outdoor vision/navigation system. Landmark cues and approximate distances are not verified walking directions.
- Quiet hours use the browser's local clock. Browsers can delay background timers; the demo clock can advance pending notification receipts. Quiet-hour suppression is recorded rather than sending a delayed real message.
- Storage remains on this browser/origin. Existing memory backup features remain; there is no new cloud contact backup or authentication. Existing non-blocking production bundle warnings remain.

## Validation results

- 75 unit tests passed, including phone validation, final-contact protection, policy timings, permissions, quiet-hour delivery checks, cancelled grace-period notifications, explicit fall approval, guidance cancellation and persistence.
- All 50 browser tests passed, covering both existing features and the new tools. Layout tests check the four requested desktop viewports, 390 px mobile, keyboard dialogs/focus return and 200%-equivalent reflow. New browser tests fail on uncaught JavaScript exceptions.
- Production build passed (TypeScript check plus Vite). The existing non-blocking bundle-size/directive warnings remain.
- Static production smoke checks use the `/WayHome/` deployment subpath; the deployment workflow is preserved. Backend-available tests are not applicable because no backend is present in the target repository.
