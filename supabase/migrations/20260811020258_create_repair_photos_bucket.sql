-- PLAN.md task 4: private Supabase Storage bucket for repair photos, served
-- only via signed, expiring URLs (see PRD.md Section 7, DESIGN.md Tech choices).
-- file_size_limit and allowed_mime_types mirror PRD.md Section 5's per-photo
-- rules (JPG/PNG only, 5MB max) as a DB-level backstop to the app's own checks.
--
-- No storage.objects policies are added: the bucket is private (public = false)
-- and, per PLAN.md task 2/3, the app only ever talks to Storage server-side with
-- the service-role key, which bypasses RLS — anon/authenticated callers get zero
-- access by default.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'repair-photos',
  'repair-photos',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do nothing;
