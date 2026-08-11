# Repair Center

A small web app that lets customers submit a hardware repair request online and check its status later, without calling or visiting the service center in person.

## What it does

- **Submit a repair request** — device type (with a free-text option for "Other"), an issue description, a phone number, and up to 3 photos of the device.
- **Check repair status** — look up a request by its ID and phone number for full detail (current stage, full status history, and photos), or by phone number alone to see a list of all requests tied to that number.

Every request moves through four fixed stages: **Received → In Repair → Ready for Pickup → Completed**, with a full timestamped history kept automatically, including when staff update status directly from the database.

## Tech stack

- **[Next.js](https://nextjs.org)** (App Router) — both the UI and the API routes live in one project.
- **[Supabase](https://supabase.com)** — Postgres database and private file storage for uploaded photos, served only via short-lived signed URLs.
- **[Vercel](https://vercel.com)** — deployment target.
- **Zod** + **react-hook-form** for shared client/server field validation.
- **Tailwind CSS** for styling.

## Project docs

- [`PRD.md`](./PRD.md) — the product requirements: problem, goals, features, and binding validation rules.
- [`PLAN.md`](./PLAN.md) — the build plan and task order.
- [`DESIGN.md`](./DESIGN.md) — the screen layouts, data flow, and API contracts.
- [`CHECK.md`](./CHECK.md) — verification status: success criteria, a design-vs-implementation gap analysis, and a pre-launch security review.

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). You'll need your own Supabase project and a local `.env` file (not committed to this repo) defining:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service-role key (server-side only, never exposed to the browser)

Run the SQL migrations in `supabase/migrations/` against your project to create the schema, RLS policies, and the private `repair-photos` storage bucket before starting the app.
