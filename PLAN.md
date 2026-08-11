# PLAN.md

Build plan for the two must-have features defined in `PRD.md`: Repair Request Submission and Repair Status Tracking.

## Cycle goal

Ship a working Next.js app, deployed on Vercel, where a customer can submit a repair request (with optional photos) and later look up its status using request ID + phone number — matching every rule in `PRD.md` Section 5.

## Success criteria

- A customer can submit a request through the form and receive a `RPR-######` request ID.
- A customer can look up status with request ID + phone number (single-record match with full detail + photos), or with phone number alone (matches list only — request ID, device type, status; never full detail, even when exactly one request matches).
- Status is always exactly one of: Received → In Repair → Ready for Pickup → Completed, with a full timestamped history.
- Photo uploads (0–3 files, JPG/PNG, ≤5MB each) are stored privately and served only via signed URLs.
- All field validation rules from PRD Section 5 are enforced (issue description 10–500 chars, 10-digit phone, device type dropdown incl. "Other").
- App is live on a `*.vercel.app` URL with production environment variables configured.

## Tasks (build order)

This order is API-first (each API route is built and testable before the UI that calls it), which is a deliberate deviation from `PRD.md` Section 9's UI-first ordering — building the endpoint first means it can be verified directly (e.g. via curl) before any screen depends on it.

1. Scaffold the Next.js project and wire up the existing `.env` values — everything else depends on the project existing.
2. Create the Supabase project via `SUPABASE_ACCESS_TOKEN`, then add its connection values (project URL, service-role key) to `.env` — the JS client needs these; the access token alone only covers CLI/admin operations. No anon key is needed: all Supabase access happens server-side, through API routes, using the service-role key (see task 3's RLS setup) — the app never ships a browser-side Supabase client.
3. Create the `repair_requests` table — `id` as the `RPR-######` text primary key, generated from a Postgres sequence (e.g. `'RPR-' || lpad(nextval('repair_requests_seq')::text, 6, '0')`) so uniqueness and ordering are enforced by the database, not app code; `status` as a Postgres enum restricted to the 4 exact stage values; plus `device_type_other`, phone, issue description, and a photo-paths column — and the `status_history` table (request ID, status, changed_at). Add a database trigger firing `AFTER INSERT OR UPDATE OF status`, guarded on the update path by `OLD.status IS DISTINCT FROM NEW.status`, so both the initial "Received" row and every later change (including manual edits made directly in the Supabase dashboard) land in `status_history`. Enable Row Level Security on both tables with no public policies — all reads/writes go through the server-side API routes using the service-role key.
4. Create a private Supabase Storage bucket for repair photos, served via signed URLs.
5. Build the API route to validate and save a new request, auto-generate the `RPR-######` ID, and set status to "Received."
6. Build the photo upload handling (max 3 files, JPG/PNG only, 5MB each, validated server-side) into Supabase Storage, saving the resulting paths onto the request row.
7. Build the Repair Request Submission form UI (device type dropdown incl. "Other" field, issue description, phone number, photo upload).
8. Build the API route for status lookup: request ID + phone number returns the single matching record; phone number alone returns the multiple-matches list; generate signed URLs for any photos on the matched record(s).
9. Build the Repair Status Tracking lookup form UI (request ID + phone number inputs).
10. Build the status display UI showing the current stage, full status history, and photo thumbnails (via signed URLs).
11. Add form validation and error messages across both submission and lookup forms, including a "contact the service center" message when no match is found.
12. Deploy the app to Vercel on the default `*.vercel.app` subdomain and configure production environment variables.

## Verification checklist

One check per success criterion above, to run through the workflow loop in `CLAUDE.md`:
- Submit a request → confirm a `RPR-######` ID is returned, the row appears in `repair_requests` with status "Received," and a matching "Received" row already exists in `status_history` (trigger fires on insert, not just update).
- Look up with ID + phone → confirm exactly one full-detail record returns; look up with phone only, both with exactly 1 match and with 2+ matches → confirm the matches-list format returns in both cases, never the full-detail response.
- Manually change a status in the Supabase dashboard → confirm a new `status_history` row appears automatically (trigger check).
- Upload 3 JPG/PNG photos ≤5MB → confirm they're stored privately and only reachable via a signed URL from the lookup response.
- Submit invalid input (short description, bad phone format, wrong file type) → confirm server-side validation rejects it with a clear error.
- Deploy to Vercel → confirm the live `*.vercel.app` URL runs both flows end-to-end.
