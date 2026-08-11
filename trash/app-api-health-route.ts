import { NextResponse } from "next/server";

// Confirms Next.js loaded .env — reports presence only, never the secret values themselves.
export function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      GITHUB_TOKEN: Boolean(process.env.GITHUB_TOKEN),
      SUPABASE_ACCESS_TOKEN: Boolean(process.env.SUPABASE_ACCESS_TOKEN),
      VERCEL_TOKEN: Boolean(process.env.VERCEL_TOKEN),
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}
