# WayHome button logic audit

This audit preserves the current modular landing page, visual identity, six safety modes, Memory Garden, and GitHub Pages deployment.

| Area | Change and expected behavior |
| --- | --- |
| Button visibility | Correct secondary wearable buttons from white-on-pale text to dark-on-pale text; automated checks require at least 4.5:1 contrast for every help choice. |
| Check-in choices | Back to check-in returns from help choices to the question. Repeat clicks do not duplicate a recorded response. A new question can still record a new response. |
| Caregiver review | Review check-in after observations records caregiver review explicitly, clears a log-only unanswered check-in, and rechecks the existing physical and scenario gates. It never records caregiver review as a wearer answer. A blocked review can be retried after fresh device observations. |
| Family assistance | Removal/missed-check-in handovers without a request offer Contact my family / Start family handover. Waiting requests retain their ID through repeat requests, acknowledgments, device changes and scenario updates. Caregiver response controls are also available in Emergency Assistance. Acknowledgment cannot replace response. |
| Conflicting actions | Pending family assistance cannot be bypassed by simulated walking, guidance or a new check-in. The check-in demo explains the pending request and disables its conflicting start control. |
| Guidance | Recognition callbacks identify the photo they confirmed. Unrelated edits/deletions preserve the current target; withdrawing that target stops directions and offers family support. Approving the first available landmark in an empty guidance list remains usable. |
| SOS | Right-click does not start a hold. Focus loss, hiding the page, pointer cancellation and unmount cancel an incomplete hold. Normal demo controls, route reset and guided-story navigation cannot override active SOS. Fresh SOS and negative device observations remain available. Incident resolution does not silently close a separate family request. |
| Memory Garden | Undo cannot edit paused, completed or withdrawn activities. Completed responses cannot be changed by stale callbacks. Withdrawing/deleting the active memory pauses it immediately; its eligibility guards prevent further changes. Existing choose-another controls remain available. |
| Existing controls checked | Landing preview/tab selection, companion naming/settings, library editing/approval/media/backup, landmark editing, map controls, emergency confirmation, memory choices/skips/resume and presentation controls are covered by the existing browser regression suite. |

## Quick demonstration

1. Demo → Start feeling check-in → I need help → Back to check-in → I'm okay.
2. Disable simulated caregiver notification; start another check-in and simulate two timeouts. Review check-in after observations now clears the unanswered interaction when the existing device/scenario readings permit it.
3. Simulate Wearable Removal → Companion → Contact my family. In Emergency Assistance acknowledge and respond to the family request. Review remains blocked until fresh likely-worn observations are recorded; review again, then open Memory Garden.
4. During guidance delete an unrelated landmark: the shown target stays the same. Delete or withdraw the shown target: guidance stops and offers family contact.
5. Hold SOS, then inspect demo, guided-story and route controls: conflicting buttons are disabled. Resolve the incident through the existing caregiver confirmation. Separate pending family requests still require response.

These are browser-local simulations. Notifications, responses, route readings and emergency services are not real. Background browser throttling may delay check-in prompts; tabs in the same browser share state, not remote caregivers. No hardware wear inference guarantees safety.

## Validation

- 56 unit tests cover state transitions, repeated/stale actions, check-in review, handover recovery, SOS precedence, landmark changes and paused/completed memory edits.
- The browser suite includes landing, caregiver, companion, Memory Garden and SOS regressions, plus new recovery, cross-tab withdrawal, hold cancellation and button contrast checks.
- Production build and mobile smoke checks use the `/WayHome/` path. The existing non-blocking large-bundle warning remains; this change does not replace the deployment workflow.
