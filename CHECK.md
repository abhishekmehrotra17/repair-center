# CHECK.md

Consolidated verification status: success-criteria run, DESIGN.md-vs-code gap analysis, and pre-launch security review. Covers the app as built through `PLAN.md` tasks 1-7 and 9-10 (Next.js scaffold, Supabase project, DB schema/RLS, private Storage bucket, submission API, photo upload, submission form UI, lookup API, lookup/status UI) plus 8 code-level gap fixes and 4 Tier-1 security items resolved after the initial reviews. Only task 8 (already covered by `/api/lookup`, built earlier) and task 12 (deployment) remain from `PLAN.md`'s list; task 11's remaining polish is tracked as Tier 3/4 items below.

## Pass / Fail: **FAIL**

5 of 6 `PLAN.md` success criteria pass. The one remaining failure (not deployed) is expected at this stage. All 4 Tier-1 security-critical items are now resolved (either fixed or explicitly documented as an accepted, deliberate risk in `PRD.md` Section 7), and both DESIGN.md screens are built and verified live. Deployment (task 12) is the only remaining blocker to being customer-usable.

---

## Priority-ordered fix list

**Tier 1 — Must resolve before deploying (security-critical)**
1. ✅ **Fixed** — Do **not** add `GITHUB_TOKEN`, `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, or `OPENAI_API_KEY` to Vercel's production environment variables — only the Supabase URL + service-role key belong there. Documented explicitly in `VERCEL_ENV_VARS.md`, listing exactly the two variable names task 12 should copy into Vercel. *(Security #1)*
2. ✅ **Fixed** — Deleted `app/api/health/route.ts` (moved to `trash/app-api-health-route.ts` per `CLAUDE.md`) — it was a public, unauthenticated inventory of which secrets exist. Verified `/api/health` now returns `404`; `/api/requests` and `/api/lookup` unaffected. *(Security #3, Gap #11)*
3. ✅ **Fixed** — Documented as an accepted risk in `PRD.md` Section 7 ("Lookup authentication strength"): a phone number alone can unlock a customer's full request detail via the two lookup modes chained together. This is a consequence of `PRD.md` Section 5's own requirement, not a bug — no code fix applies; this is the conscious product decision the item called for. *(Security #2)*
4. ✅ **Fixed** — Documented as an accepted risk in `PRD.md` Section 7 ("Abuse protection"): no rate limiting exists, so `/api/lookup` is an enumeration oracle and `/api/requests` has no submission cap. This extends Section 6's existing decision to exclude bot/spam protection from this exercise's scope — genuinely closing it needs new shared-state infrastructure, which is out of scope here. *(Security #4)*

**Tier 2 — Blocks success criteria / core features still missing**
5. ✅ **Fixed** — Built the Repair Request Submission form UI (`PLAN.md` task 7) at `app/page.tsx`: device type dropdown incl. conditional "Other" field, issue description, phone number, up to 3 photos with previews/remove, client-side validation (via `react-hook-form`, sharing rules with the server through the new `lib/validation/repairRequest.ts`), and a post-submit confirmation panel showing the `RPR-######` ID. Verified live in the browser end-to-end: validation errors block submission correctly, a real submission was confirmed in the DB with `device_type: "Other"` and `device_type_other` captured correctly. *(Gaps #11, #14, #15, #21-27 closed — see Gap analysis below)*
6. ✅ **Fixed** — Built the Check Status lookup UI (`PLAN.md` tasks 9-10) at `app/status/page.tsx`: request ID (optional) + phone number form, 4-stage status tracker, timestamped history list, phone-only matches table (clicking a row re-runs the ID+phone lookup for detail), photo thumbnails from signed URLs, and the "not found — contact the service center" state. Verified live in the browser: all three result branches rendered correctly (matches list for a phone with 2 requests, full detail via both row-click and direct ID+phone entry — status tracker + 2-entry history + working photo thumbnails, and the not-found message for an unknown phone). *(Gaps #16-20 closed)*
7. Test the submission flow against Vercel's ~4.5MB request-body limit — PRD's 3×5MB photo allowance (~15MB) will likely exceed it once deployed. *(Gap #28, Security #13)*
8. Deploy to Vercel with production env vars (`PLAN.md` task 12) — blocks success criterion 6.

**Tier 3 — Should fix before real customer data flows through**
9. Verify photo file type from actual file bytes (magic numbers), not just the client-declared MIME header. *(Gap #9, Security #5)*
10. Add a length cap to `deviceTypeOther` — Zod `.max(100)` + a matching DB `CHECK` constraint. *(Security #6)*
11. Stop logging raw Supabase error objects — they can contain a customer's phone number/description via `error.details`. Log `error.code`/`error.message` only. *(Security #7)*
12. Add basic security headers (`X-Frame-Options`, `X-Content-Type-Options`, HSTS, `Referrer-Policy`) to `next.config.ts`. *(Security #8)*

**Tier 4 — Low-risk cleanup / polish**
13. Rename `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL` and drop the unused `NEXT_PUBLIC_SUPABASE_ANON_KEY` — naming footgun next to the service-role key, not a live leak today. *(Gap #10, Security #11)*
14. Validate `requestId` format (`^RPR-\d{6}$`) in the lookup schema before querying. *(Security #12)*
15. Don't echo raw uploaded filenames into validation error messages. *(Security #9)*
16. Add a DB-level cap on `photo_paths` array length (defense-in-depth alongside the app-level max-3 check). *(Gap #13)*
17. Fix the status-change trigger definition to `AFTER INSERT OR UPDATE OF status` (currently fires on every column update and relies solely on the in-function guard). *(Gap #12)*
18. Update `PRD.md` Section 7's personal-data inventory to include uploaded photos (EXIF/GPS) and free-text issue descriptions, not just the phone number; consider EXIF stripping on upload. *(Security #10)*
19. ✅ **Fixed** — `react-hook-form` added and in use, per `DESIGN.md`'s tech choices (done as part of Tier 2 item 5). *(Gap #24)*
20. Add `.bkit/` to `.gitignore` before running `git init` — its audit log contains the Supabase project ref and env var names (no values). *(Security, verified-clean notes)*

---

## 1. Success-criteria verdicts (`PLAN.md`)

Re-verified live against the running app and the linked Supabase project.

| # | Criterion | Verdict | Why |
|---|---|---|---|
| 1 | Submit a request through the form, receive a `RPR-######` ID | **PASS** | Verified live in the browser: form at `/` renders, client-side validation blocks bad input, a real submission was confirmed in the DB with correct fields and a `RPR-######` ID shown on the confirmation screen |
| 2 | Look up status by ID+phone (full detail) or phone alone (matches list) | **PASS** | `/api/lookup` built and verified: ID+phone returns full detail incl. history + signed photo URLs; phone-alone always returns the matches-list shape, even for exactly one match; no match returns `404 NOT_FOUND` |
| 3 | Status always exactly one of the 4 stages, with full timestamped history | **PASS** | Verified live: invalid status rejected by DB `CHECK` constraint (now on both tables), valid transition correctly appended a new `status_history` row |
| 4 | Photos (0-3, JPG/PNG, ≤5MB) stored privately and served via signed URLs | **PASS** | Storage confirmed private (anon key gets `403`); signed URL generation built and verified — fetched a signed URL directly, got the actual photo back, 5-minute TTL confirmed |
| 5 | All PRD Section 5 field validation rules enforced | **PASS** | Boundary-tested live: short/long description, malformed phone, invalid device type all rejected; exact boundary values accepted |
| 6 | App live on `*.vercel.app` with production env vars configured | **FAIL** | No `.vercel` project link exists; nothing has been deployed |

---

## 2. Gap analysis (`DESIGN.md` vs. code)

Originally 28 gaps found comparing the design to the implementation. Items 1-8 were fixed in an earlier pass; items 11, 14, 15, 21-27 were fixed while building Screen 1 (`app/page.tsx`); items 16-20 were fixed while building Screen 2 (`app/status/page.tsx`). Remaining open items are backend/data-layer polish only — both screens described in DESIGN.md now exist.

**Fixed:**
1. ✅ `POST /api/lookup` — built (ID+phone detail, phone-only matches list, `NOT_FOUND`)
2. ✅ Signed-URL generation — built, 5-min TTL, verified serving real files
3. ✅ `status_history.status` — CHECK constraint added, matches `repair_requests.status`
4. ✅ API error envelope — now exactly `{ error: { code, message } }`, no undocumented `details` field
5. ✅ Photo storage paths — now grouped per submission under a shared upload-batch folder
6. ✅ Phone validation — rejects non-digit characters before stripping, closing the "junk normalizes to valid" hole
7. ✅ Partial upload failure — no longer deletes already-uploaded photos (leaves orphans, per DESIGN.md's own reasoning)
8. ✅ Zero-byte named files — now rejected with `VALIDATION_ERROR` instead of silently dropped
11. ✅ `/api/health` (and its anon-key probe) removed entirely — moved to `trash/`
14. ✅ Screen 1 (`/`) submission form built — device type incl. "Other", issue description, phone, photo upload
15. ✅ Post-submit confirmation panel built — shows the `RPR-######` ID with a "save this ID" reminder
21. ✅ Client-side validation built via `react-hook-form`, sharing rules with the server through `lib/validation/repairRequest.ts`
22. ✅ Inline field-level errors and a submit-error banner built into Screen 1
23. ✅ "→ Check Status" navigation link built (points to `/status`, not yet built — will 404 until Screen 2 exists)
24. ✅ `react-hook-form` installed and in use
25. ✅ "Repair Center" header now rendered as an actual `<h1>`, not just a `<title>` tag
26. ✅ Mobile-first single-column/max-width layout built for both Screen 1 and Screen 2 (verified at mobile viewport width)
27. ✅ Blue/white/gray color scheme applied to both screens (blue-600 primary actions/active stage, gray/white neutrals)
16. ✅ Screen 2 (`/status`) route built
17. ✅ 4-stage status tracker with timestamped history list built and verified live (correct active-stage highlighting, 2-entry history rendered for a request with a real status transition)
18. ✅ Phone-only matches table built — verified live for a phone number with 2 requests; clicking a row correctly re-runs the ID+phone lookup for full detail
19. ✅ Photo thumbnail rendering built — verified live, both thumbnails loaded successfully via their signed URLs
20. ✅ "Not found — contact the service center" result state built and verified live with the exact copy from `DESIGN.md`

**Still open:**
9. Photo MIME type trusted from client header only, not verified against actual file bytes
10. Supabase client reads the project URL from the browser-exposed `NEXT_PUBLIC_SUPABASE_URL` name (unused by any client code today, but a naming footgun)
12. Status-change trigger defined as `AFTER INSERT OR UPDATE` (all columns) instead of `...OF status` specifically
13. `photo_paths` has no DB-level length cap — max-3-photos is enforced only in app code
28. A 3-photo × 5MB submission can exceed Vercel's ~4.5MB request-body limit — untested against the real platform

---

## 3. Security review (pre-launch)

Not a chatbot/LLM app — prompt injection is **N/A** (verified: no LLM/chat dependencies or code anywhere in the repo). None of the fixes below have been applied yet — this was a read-only review.

**High severity**
1. ✅ **Fixed** — Admin-level tokens (`GITHUB_TOKEN`, `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `OPENAI_API_KEY`) risked being carried into the Vercel production environment even though the app's runtime only needs the Supabase URL + service-role key. `VERCEL_ENV_VARS.md` now makes the exact safe list explicit for task 12.
2. ✅ **Documented as accepted risk** — The "two-factor" ID+phone lookup guarantee is defeated by chaining it with the phone-only mode — phone number alone effectively unlocks full request detail. Design-level consequence of `PRD.md` Section 5, not a code bug; now recorded in `PRD.md` Section 7 as a deliberate, accepted trade-off rather than an oversight.
3. ✅ **Fixed** — `/api/health` was a public, unauthenticated endpoint listing which secrets exist (booleans only, no values); it's been removed to `trash/app-api-health-route.ts` and now returns `404`.

**Medium severity**
4. ✅ **Documented as accepted risk** — No rate limiting on `/api/requests` or `/api/lookup` — enables phone-number harvesting (via finding #2) and storage/DB flooding. PRD explicitly deferred bot protection (Section 6); now recorded in `PRD.md` Section 7 as an extension of that same accepted, deliberate scope decision.
5. Photo type validated from the client-declared MIME header only, not the actual file bytes — same as Gap #9.
6. `deviceTypeOther` has no length limit anywhere in the stack, unlike every other field.
7. Raw Supabase error objects are logged server-side, which can include a customer's phone number/description via `error.details` on a constraint violation. API *responses* are clean — this is a server-log-only issue.

**Low severity**
8. No security headers configured (`X-Frame-Options`, CSP, HSTS, etc.) — minor today with no UI live yet, cheap to add now.
9. Attacker-controlled filename is echoed into validation error messages — safe today (React auto-escapes) but fragile.
10. Uploaded photos keep EXIF/GPS metadata unmodified; `PRD.md` Section 7's PII inventory only lists the phone number, undercounting photos and free-text descriptions.
11. `NEXT_PUBLIC_SUPABASE_URL` naming — a footgun next to the service-role key, though verified unused by any client-shipped code today.
12. `requestId` isn't format-validated before querying the database — no injection risk, just free enumeration-cost reduction.
13. Vercel's ~4.5MB body limit conflicts with the 3×5MB photo allowance — same as Gap #28.

**Verified clean:** no SQL/NoSQL injection (all queries parameterized via supabase-js), no path traversal in uploads (UUID-based paths, filenames never touch storage paths), no secrets in the client bundle or in git (`.env` gitignored, nothing committed yet), RLS correctly locked down with zero policies on both tables and the Storage bucket, error responses never leak stack traces or raw DB errors, dependencies are current with no known-vulnerable versions.
