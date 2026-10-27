# WayHome AI handoff

Last updated: 2026-10-27. This is the short, current handoff for a new Codex session or account. Read `AGENTS.md` first. Revise this file whenever the project state changes; use `COLLABORATION_LOG.md` for the dated history.

## People and repository

- User: GitHub `itsme-lahlou`, one of four people working on WayHome. The other team members and their responsibilities have not been confirmed here.
- Canonical repository: [Clarbel21/WayHome](https://github.com/Clarbel21/WayHome). The user's connected GitHub account had push access when checked on 2026-10-27.
- Local checkout: this folder, with `origin` set to that repository. Baseline at setup: `main` commit [`7000b6c`](https://github.com/Clarbel21/WayHome/commit/7000b6ceeaa0f38796c4bbe267b425d550b4c00d) (2026-10-21).
- GitHub Pages is configured to build and deploy from pushes to `main`: [WayHome site](https://clarbel21.github.io/WayHome/). Confirm the latest workflow/deployment before reporting the site as live or current.

## Product snapshot

WayHome is a React 19, TypeScript, Vite web app with Companion Mode, Caregiver Dashboard, interactive check-ins, simulated SOS/incident resolution, landmark guidance, and Memory Garden reminiscence activities. It uses Zustand and browser storage; same-origin tabs share state, while separate devices do not. Uploaded memory media uses IndexedDB. The app is a prototype with fictional locations and simulated device/emergency behavior.

Key files: `src/store.ts` (safety state and check-ins), `src/App.tsx` (routes/dashboard), `src/components/Wearable.tsx`, `src/components/CheckInSupport.tsx`, `src/memory/`, `tests/`, and `.github/workflows/deploy-pages.yml`. Read `README.md`, `CHECK_IN_DEMO.md`, `PROJECT_AUDIT.md`, and `IMPLEMENTATION_DECISIONS.md` for details and historical test evidence.

## Current working state

- The local checkout was created from `origin/main` on 2026-10-27. Collaboration setup was submitted from branch `codex/workspace-handoff` in [PR #1](https://github.com/Clarbel21/WayHome/pull/1). Check that PR for its current merge status. A fresh clone of `main` includes these instructions only after the PR is merged.
- At initial inspection, GitHub showed no open pull requests or issues. Recheck at the next session; this observation can become stale.
- No product change has been requested yet. The next step after this setup is to ask the user which WayHome product behavior or screen to change, then inspect that flow and implement it.
- Local GitHub CLI credentials failed validation on 2026-10-27, but the GitHub connector authenticated as `itsme-lahlou` and `git push` succeeded. Recheck available access in future sessions. Do not record credentials here.
- The default shell used Node 20.20.0, below the project's requirement. Node 22.22.0 is installed at `~/.nvm/versions/node/v22.22.0/bin/node`; use Node 22+ for installs and tests. Update this note if the environment changes.
- Local baseline verification on 2026-10-27 with Node 22.22.0: `npm ci` succeeded, `npm test` passed 40/40 tests, and `npm run build` passed. The build reports existing third-party `use client` directive and bundle-size warnings. Playwright tests were not run for this documentation-only setup.

## Handoff checklist

Before ending a task: record branch/commit/PR links, what changed, actual test results, unresolved risks, new team updates, and the next concrete action here. Add a dated summary to `COLLABORATION_LOG.md`. Keep the next action current rather than accumulating an old backlog.
