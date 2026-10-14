# POTION FLOW — project instructions

- Read `docs/GAME_SPEC.md`, `docs/ACCEPTANCE.md`, and `docs/MILESTONES.md` before implementation.
- `design/design.html` is the visual reference; `docs/GAME_SPEC.md` governs game rules. Never overwrite the source design.
- Implement the real game, not an iframe, screenshot, mocked success flow, or marketing page.
- Keep the game engine pure and separate from React, animation, storage, and audio.
- Every shipped level requires a replayable, validated solution certificate. A timeout is not proof of unsolvability.
- Preserve unit counts, capacities, collector invariants, and atomic moves. Finished regular bottles remain playable until the level ends.
- Initial scope: 30 levels, Classic + Collector, local persistence, current-state hints, mobile-first UI. No backend, monetization, analytics, PWA, or daily mode in this scope.
- Reuse the existing package manager; use pnpm for an empty project. No paid services or deployment without permission.
- Implement in milestones and maintain `docs/PROGRESS.md`; do not stop after making a plan.
- Run typecheck, lint, engine tests, all-level validation, browser tests, and a production build. Record actual commands and results.
- Save visual QA screenshots and an honest report in `artifacts/`. Do not claim device/performance testing that did not happen.
