# Vercel production environment variables

When deploying (`PLAN.md` task 12), add **only** these two variables to Vercel's
production environment — copy the actual values from the local `.env` file,
never from this document:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do **not** add any of the other variables from `.env`
(`GITHUB_TOKEN`, `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `OPENAI_API_KEY`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Those are local/CLI-only admin credentials
the deployed app's runtime never reads — adding them to Vercel would let a
single server-side bug escalate from "leaked repair data" to account
takeover across GitHub, Vercel, and Supabase's management API. See
`CHECK.md`'s Tier 1, item 1.
