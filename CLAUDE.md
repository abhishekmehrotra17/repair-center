# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repository is pre-code: only planning documents exist so far, nothing has been scaffolded. There is no `package.json`, build tooling, linter, or test runner, so no build/lint/test commands exist to document. `PRD.md` Development unit 1 is the first implementation step (Next.js scaffold); once that lands, replace this section with the real commands.

## Planning documents (source of truth)

- **`PRD.md`** — the authoritative, fully-decided plan. Start here. It covers the problem, goals, users/flow, the two must-have features with their exact build rules (validation limits, field formats, the ID generation scheme, etc.), explicit out-of-scope items, security/privacy decisions, the fixed technology stack, and a numbered "Development units" list (Section 9) that gives the intended build order — follow it in sequence.
- **`prd_lite.md`** — an earlier, lighter draft, superseded by `PRD.md` wherever the two disagree. It survives only for its "Design feel and colors" notes (mood, main color, mobile-first constraint), which were deliberately left out of `PRD.md` and should be pulled in later when actual screens get built.

Treat each feature's "Rules the AI must follow" bullets in `PRD.md` Section 5 as binding constraints, not suggestions — they capture decisions (field limits, file-type restrictions, ID formats) that were already made deliberately.

## Technology stack (fixed — do not substitute)

- **Next.js** — single project handles both UI and API routes. Do not switch to another framework or suggest migrating away from it.
- **Supabase** — database (`repair_requests`, `status_history` tables) and private file storage (served via signed URLs, not public).
- **Vercel** — deployment target, default `*.vercel.app` subdomain (no custom domain).

This stack is fixed per `PRD.md` Section 8 to stay continuous with prior course parts; do not propose alternatives.

## Secrets

`.env` holds `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, and `OPENAI_API_KEY`. Both `.env` and `node_modules` must be registered in `.gitignore` and never committed. Never print, log, or commit the contents of `.env`.

If a task needs authentication with an external service, don't ask the user for the token or print it in chat — read and use the value already in `.env` instead. Example: for Supabase work, install the Supabase CLI and authenticate with `SUPABASE_ACCESS_TOKEN`. Example: for Vercel work (deployment, etc.), install the Vercel CLI and authenticate with `VERCEL_TOKEN`.

## Working rules

- Write all explanations and comments in English.
- Only create new files inside the project folder (`my_app`) — never outside it.
- Whenever code changes, report in one line what changed and why.
- When a file needs to be removed, don't delete it outright — move it to a `trash/` folder at the project root for the user to review and delete later.
- Actively use the already-installed subagents whenever a task matches one of their descriptions.
- Share validation rules between client and server via one module (e.g. `lib/validation/`) instead of duplicating field/file checks — duplication is how the two layers silently drift. Enforce any fixed-value column (status, enums) with a DB-level `CHECK` constraint on every table that stores it, not just the primary one.
- Never ship a debug/diagnostic endpoint that reveals which secrets or env vars exist, even as booleans — remove it once its scaffolding purpose is done. Only prefix an env var with `NEXT_PUBLIC_` when it's genuinely meant for the browser.
- When a security or gap finding has no code fix because it's a direct, deliberate consequence of an already-decided `PRD.md` requirement or out-of-scope item, record it explicitly as an accepted risk in `PRD.md` Section 7 rather than leaving it as a silent gap.

## Workflow (verification loop)

For every code change, repeat this loop rather than treating the change as done once written:

1. **Make the change.**
2. **Check the result yourself** — open it in a browser or run it; don't assume it works.
3. **Review your own code** — re-read the diff for correctness, edge cases, and adherence to the rules in this file (especially `PRD.md` Section 5's binding constraints).
4. **If there's a problem, fix it and go back to step 1.**
5. Once it passes, summarize in one line what changed and why.
