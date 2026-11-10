# Interface foundation

The paired demo uses the system sans stack and semantic color/spacing tokens in `tokens.css`. `Controls.tsx` supplies native Button, IconButton, Card and Status elements. Existing native dialogs, disclosures and pressed-button navigation remain responsible for their keyboard behavior; the foundation supplies their visual patterns.

`components/devices/devices.css` owns watch case, display, strap, SOS hit area and phone frame geometry. Watch case sizes are 276 × 368 px, or 268 × 368 below 360 px. The case is intentionally larger than the first design sketch to retain readable text and 44–48 px targets. These are browser presentation dimensions, not manufactured dimensions or a claim of physical screen parity. Phone is 320 × 620 px, with 660 px height on tall desktop viewports.

`watch/WatchScreen.tsx` supplies task layouts; `watch/watch.css` owns migrated watch controls, typography and layouts. The templates contain no safety transitions. Wearable selects tasks; existing stores own decisions. Mode changes retain outstanding check-ins and device review. Dialogue has two topics per page, all four authored replies remain available.

`Sprout.tsx` is the only character drawing: one inline SVG family with calm, attentive and reassuring expressions. Task size is 64 px; home 72 px; waiting 80 px. The status illustration is 26 px. Only a brief touch response animates, and both OS and app reduced-motion settings suppress it.

All owned styles declare `legacy, demo, companion, foundation` before their rules because component styles can load before main entry styles. The old watch geometry and companion overrides have been removed. Remaining dependencies: `demo/shell.css` now owns the paired demo, mobile tabs and direct home actions; `caregiver/caregiver.css` owns the priority card; `demo.css` retains legacy watch content, presenter tools and phone internals; `companion.css` still styles caregiver cards/tools and other routes; the memory player and zone views retain their existing styles. Their remaining migration belongs to later milestones. Do not append duplicate frame geometry to those files.

The firmware mirror remains the existing seven coarse states in `services/ble.ts`. Web home subpages, authored dialogue topics, memory activities and presentation layouts are not a complete visual mirror of the physical watch. This milestone does not modify firmware or verify hardware.

The M2 presentation store (`demo/demoUi.ts`) stores only the selected story/device in sessionStorage. It cannot resolve incidents or change readings. `demo/story.ts` derives instructions/completion from current store state. New-story confirmation calls the existing guarded reset; profile/place/memory data is preserved. Mobile panels remain mounted while hidden to retain local screen state. Caregiver actions suggest an explicit handoff, without changing the selected device automatically.
