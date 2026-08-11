# DESIGN.md

Design for the two features scoped in `PLAN.md`. Mood/color notes below come from `prd_lite.md` Section 5: clean, trustworthy, simple, mobile-first, blue main color with white/gray neutrals.

## Screen layout

**Screen 1 — Submit a Repair Request (`/`)**
```
┌─────────────────────────────┐
│  [Logo/Title]  Repair Center │
├─────────────────────────────┤
│  Device type:   [Dropdown ▾] │
│   (Desktop/Laptop/Monitor/   │
│    Printer/Other)             │
│  (if "Other") → [Text field] │
│  Issue description:          │
│  [            textarea     ] │
│  Phone number:  [__________] │
│  Photos (optional, up to 3): │
│  [Upload button]  [previews] │
│                               │
│         [ Submit Request ]   │
├─────────────────────────────┤
│  → link to "Check Status"    │
└─────────────────────────────┘
```
After submit: a confirmation panel replaces the form, showing the new `RPR-######` ID in large text with a "save this ID" reminder.

**Screen 2 — Check Status (`/status`)**
```
┌─────────────────────────────┐
│  [Logo/Title]  Repair Center │
├─────────────────────────────┤
│  Request ID: [__________]    │
│   (optional — leave blank    │
│    to list all requests      │
│    for this phone number)    │
│  Phone number:  [__________] │
│         [ Check Status ]     │
├─────────────────────────────┤
│  Result area:                │
│  - ID + phone, match → status│
│    card with 4-stage tracker │
│    (Received→Repair→Ready→   │
│    Completed) + history list │
│    + photo thumbnails (from  │
│    signed URLs, if any)      │
│  - Phone only → matches table│
│    (ID, device, status) —    │
│    tap a row to re-run the   │
│    ID+phone lookup for detail│
│  - No match → error message  │
│    + "contact the service    │
│    center" instruction       │
└─────────────────────────────┘
```

Both screens: single-column, stacked layout on mobile (primary target per `prd_lite.md`); same column just gets a max-width wrapper on wider screens. Blue for primary actions/active stage, white/gray for backgrounds and inactive stages — no other accent colors.

## Data flow

**Submission flow**
```
Customer fills form (client)
  → client-side validation (required fields, lengths, phone format, file type/size, max 3 files)
  → POST /api/requests (multipart: fields + up to 3 photos)
  → server re-validates (never trust client-only checks; JPG/PNG + 5MB + max 3 files
    enforced again here); phone number normalized to digits-only before storage
  → upload each photo to the private Supabase Storage bucket first — if a later step
    fails, an orphaned Storage object is harmless and cleanable, unlike a DB row the
    customer can already see
  → insert row into repair_requests with photo paths already attached, status = "Received"
    (enum-constrained per PLAN task 3), ID = next RPR-###### (DB-generated, see PLAN
    task 3), device_type_other stored if device type = "Other"
    — the status_history row (status: Received, changed_at: now) is written
    automatically by the database trigger from PLAN task 3 firing on INSERT (not only
    on UPDATE), so it doesn't depend on app code; the same trigger also covers manual
    status edits made in the Supabase dashboard
    — if the insert fails after a successful upload, return UPLOAD_FAILED/INTERNAL_ERROR
    (see API response contract below) and leave the uploaded photos orphaned in Storage
    for later cleanup, rather than leaving a customer-visible request with missing photos
  → response: { data: { requestId } }
  → client shows confirmation screen with the request ID
```

**Lookup flow**
```
Customer enters phone number, and optionally a request ID (client)
  → client-side validation (phone always required; no name-only search in either mode)
  → server normalizes phone to digits-only before every comparison — same normalization
    as the submission flow's write path, so formatting differences (spaces, dashes)
    never cause a false "not found"
  → POST /api/lookup { requestId?, phone }
  → if requestId provided: server queries repair_requests WHERE id = requestId AND phone = phone
    → 0 matches → { error: { code: "NOT_FOUND", message: "..." } }
    → 1 match → { data: { request, statusHistory, photoUrls } } — statusHistory from
      status_history table; photoUrls generated server-side via signed, expiring URLs
      (5-minute TTL) for each stored photo path
  → if requestId omitted: server queries repair_requests WHERE phone = phone
    → 0 matches → { error: { code: "NOT_FOUND", message: "..." } }
    → 1 or more matches → always { data: { matches: [{ id, deviceType, status }, ...] } } —
      phone number alone is a single factor, so it must never unlock issue description or
      photo URLs; this shape applies even when there's exactly one match
  → client renders result card (with photo thumbnails) after an ID+phone lookup, a matches
    table after a phone-only lookup (tapping a row re-runs the ID+phone lookup for detail),
    or a "not found — contact the service center" message accordingly
```

### API response contract

Both `/api/requests` and `/api/lookup` share one envelope:
- Success: `{ data: ... }` — shape depends on the endpoint, see flows above.
- Error: `{ error: { code, message } }`, with HTTP status matching `code`:
  - `VALIDATION_ERROR` (400) — bad/missing field, wrong file type, oversize file, more than 3 photos
  - `NOT_FOUND` (404) — lookup found no matching record
  - `UPLOAD_FAILED` (500) — Storage upload failed
  - `INTERNAL_ERROR` (500) — anything else unexpected

Client forms render `error.message` inline near the relevant field, or as a general banner for `NOT_FOUND` / `INTERNAL_ERROR`.

## Tech choices

- **Next.js (App Router)** — required base per `PRD.md`; one project serves both the screens and the `/api/*` routes, and deploys straight to Vercel in Part 5.
- **Supabase JS client (`@supabase/supabase-js`)** — the library that lets the Next.js API routes talk to the Supabase database and photo storage without hand-writing raw network calls. Used only server-side (API routes), with the project's URL and service-role key (added to `.env` in PLAN task 2) — the existing `SUPABASE_ACCESS_TOKEN` is a separate, admin-only credential this client doesn't use. Both tables have RLS enabled with no public policies (PLAN task 3), so the service-role key is required for any access; no anon key is used anywhere in the app.
- **Zod** — a small library that checks incoming form data against the rules in PRD Section 5 (e.g. "phone must be 10 digits") and rejects anything that doesn't match, on the server where it can't be bypassed.
- **Tailwind CSS** — a styling toolkit that makes it fast to build the mobile-first, blue/white/gray look from `prd_lite.md` without writing custom CSS files by hand.
- **react-hook-form** — a small library that manages form state (typing, errors, submit) so the submission and lookup forms don't need custom code to track every field by hand.

No other tech is needed — everything else (auto-incrementing ID, status history, signed URLs) is handled by Supabase itself, called from the Next.js API routes above.
