# AGENTS.md

## Project Scope
- CLI automation for social cross-posting and platform test flows.
- Core architecture is split across `commands`, `platforms`, and `testing`.

## Setup and Commands
- Install: `npm install`.
- Build: `npm run build`.
- Dev: `npm run dev`.
- Local CLI link: `npm link`.

## Engineering Rules
- Reuse shared browser/session helpers (`launchBrowser`, `newPage`, `humanType`, `randomDelay`, `waitAndClick`).
- Wrap browser interactions in `try/catch` with clear debug context.
- Keep CLI logs consistent with existing style and result reporting.

## Workflow and Release
- Preserve platform module contract (login, submit/post, verification helpers).
- Support credential loading from `~/.postpilot/credentials.json` and env vars.
- Use database helpers to avoid duplicates and track posting/test outcomes.
- Use `--verify` checks when available for production confidence.

## Safety Guardrails
- Preserve anti-bot timing behavior through randomized human-like delays.
- Keep timestamped screenshots and failure artifacts for traceability.

## History Notes
- Reliability depends on helper reuse and consistent verification/logging patterns.
- Delay and screenshot discipline is intentional and should not be removed.
