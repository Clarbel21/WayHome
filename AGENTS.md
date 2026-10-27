# WayHome collaboration instructions

This repository is the shared workspace for the WayHome team and the user `itsme-lahlou`. Read [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md) at the start of each session, then the latest entries in [docs/COLLABORATION_LOG.md](docs/COLLABORATION_LOG.md). The README and existing audit/decision files provide product history; the handoff records our current working state.

## At the start of a session

1. Check the current branch, working tree, and `origin` URL. Preserve all existing local changes.
2. Fetch `origin` when access is available. Compare the local branch with `origin/main`, then check recent commits, open pull requests, issues, and relevant CI/deployment status. Report material team changes to the user with links. If access fails, say which checks could not be made; never claim the repo is current without verification.
3. Read the handoff and relevant source files before making product changes. Update the handoff if repository changes make it stale.

## Working agreement

- Explain new findings and intended changes in plain language. The user chooses product direction; implement requested changes and use judgment for routine technical details.
- Work on a focused branch for shared-repository changes. Do not overwrite teammates' work or force-push. Sync with `origin/main` before opening a pull request or pushing a branch; handle conflicts carefully.
- The user has authorized collaborating through GitHub, including pushing our work. Prefer a reviewable pull request for product changes in this four-person project. Do not merge a pull request or deploy outside the existing workflow unless the user asks. Pushing `main` triggers the existing GitHub Pages workflow.
- After each meaningful task, update `docs/AI_HANDOFF.md` with current status and next actions, and append a dated entry to `docs/COLLABORATION_LOG.md`. Keep them concise and factual. Commit these files with the related work so a new session or account can reconstruct it.
- GitHub authentication belongs to the current environment, not this repository. Check access each session. Never save tokens, secrets, personal health information, or private user data in tracked files.
- No background monitoring is installed. Check GitHub when a session starts or the user asks for an update; do not imply that alerts will arrive while no session is running.

## Product boundaries

- WayHome is an educational, local-first dementia-support demonstration. It has no real GPS, emergency dispatch, caregiver messaging, wearable integration, or clinical validation. Keep simulation labels and safety limitations clear.
- SOS and incident resolution must retain their existing priority and explicit caregiver verification. Acknowledgment alone does not establish safety. Do not silently alter device observations, approval gates, or incident history.
- Memory Garden content and media remain browser-local. Navigation landmarks require independent approval from reminiscence content. Preserve accessible controls and the GitHub Pages subpath behavior.

## Build and review

- Use Node.js 22.12+; `.nvmrc` recommends Node 24. Run `npm ci` for a clean install, `npm test`, and `npm run build` for code changes. Run relevant Playwright tests when changing interactions or safety flows. Record what actually ran and any failures.
- Check the diff for unrelated edits, generated files, credentials, and stale handoff notes before committing. Keep `original-backup` untouched unless the user explicitly asks.
