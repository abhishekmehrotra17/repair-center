import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSignedPhotoUrls } from "@/lib/supabase/storage";

// Body per DESIGN.md's lookup flow: { requestId?, phone }. Phone normalization
// mirrors /api/requests — strip to digits-only, reject anything that isn't
// digits/standard formatting characters before stripping.
const lookupSchema = z.object({
  requestId: z.string().trim().min(1).optional(),
  phone: z
    .string()
    .refine((raw) => /^[0-9()+\-.\s]+$/.test(raw), {
      message: "Phone number may only contain digits and standard formatting characters",
    })
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => /^\d{10}$/.test(digits), {
      message: "Phone number must be exactly 10 digits",
    }),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be JSON", 400);
  }

  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return apiError("VALIDATION_ERROR", message, 400);
  }

  const { requestId, phone } = parsed.data;
  const supabase = getSupabaseAdminClient();

  if (requestId) {
    const { data: request, error } = await supabase
      .from("repair_requests")
      .select(
        "id, device_type, device_type_other, issue_description, phone_number, photo_paths, status, created_at"
      )
      .eq("id", requestId)
      .eq("phone_number", phone)
      .maybeSingle();

    if (error) {
      console.error("Lookup by id+phone failed:", error);
      return apiError("INTERNAL_ERROR", "Failed to look up the request", 500);
    }
    if (!request) {
      return apiError("NOT_FOUND", "No matching request found", 404);
    }

    const { data: statusHistory, error: historyError } = await supabase
      .from("status_history")
      .select("status, changed_at")
      .eq("request_id", request.id)
      .order("changed_at", { ascending: true });

    if (historyError) {
      console.error("Failed to load status history:", historyError);
      return apiError("INTERNAL_ERROR", "Failed to load status history", 500);
    }

    const photoUrls = await createSignedPhotoUrls(request.photo_paths ?? []);

    return apiSuccess({
      request: {
        id: request.id,
        deviceType: request.device_type,
        deviceTypeOther: request.device_type_other,
        issueDescription: request.issue_description,
        status: request.status,
        createdAt: request.created_at,
      },
      statusHistory: statusHistory ?? [],
      photoUrls,
    });
  }

  // Phone alone: always the matches-list shape, never full detail — even
  // when exactly one request matches (see DESIGN.md's lookup flow; phone
  // number alone is a single factor and must never unlock issue description
  // or photo URLs).
  const { data: matches, error } = await supabase
    .from("repair_requests")
    .select("id, device_type, status")
    .eq("phone_number", phone);

  if (error) {
    console.error("Lookup by phone failed:", error);
    return apiError("INTERNAL_ERROR", "Failed to look up requests", 500);
  }
  if (!matches || matches.length === 0) {
    return apiError("NOT_FOUND", "No matching requests found", 404);
  }

  return apiSuccess({
    matches: matches.map((match) => ({
      id: match.id,
      deviceType: match.device_type,
      status: match.status,
    })),
  });
}
