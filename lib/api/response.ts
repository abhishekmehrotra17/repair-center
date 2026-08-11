import { NextResponse } from "next/server";

// Shared envelope for /api/requests and /api/lookup — see DESIGN.md's
// "API response contract" section.
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UPLOAD_FAILED"
  | "INTERNAL_ERROR";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
