import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_PHOTO_TYPES,
  extractPhotoFiles,
  requestFieldsSchema,
  validatePhotos,
} from "@/lib/validation/repairRequest";

export async function POST(req: NextRequest) {
  // Body is multipart/form-data per DESIGN.md (fields + up to 3 photos).
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be multipart/form-data", 400);
  }

  const parsed = requestFieldsSchema.safeParse({
    deviceType: form.get("deviceType"),
    deviceTypeOther: form.get("deviceTypeOther") ?? undefined,
    issueDescription: form.get("issueDescription"),
    phoneNumber: form.get("phoneNumber"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return apiError("VALIDATION_ERROR", message, 400);
  }

  const photoFiles = extractPhotoFiles(form);
  const photoError = validatePhotos(photoFiles);
  if (photoError) {
    return apiError("VALIDATION_ERROR", photoError, 400);
  }

  const { deviceType, deviceTypeOther, issueDescription, phoneNumber } = parsed.data;
  const supabase = getSupabaseAdminClient();

  // Upload photos before inserting the row (DESIGN.md): an orphaned Storage
  // object from a failed later step is harmless and cleanable, unlike a DB
  // row the customer can already see with photos missing. Consistent with
  // that principle, a failure partway through this loop also leaves any
  // already-uploaded files in place rather than deleting them — cleanup is a
  // later, out-of-band concern, not something this request should do.
  // All photos from one submission share an upload-batch folder so orphans
  // (and any future cleanup pass) are identifiable and groupable in Storage.
  const uploadBatchId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  for (const [index, file] of photoFiles.entries()) {
    const path = `${uploadBatchId}/${index}.${ALLOWED_PHOTO_TYPES[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("repair-photos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      console.error("Failed to upload repair photo:", uploadError);
      return apiError("UPLOAD_FAILED", "Failed to upload one or more photos", 500);
    }

    uploadedPaths.push(path);
  }

  const { data, error } = await supabase
    .from("repair_requests")
    .insert({
      device_type: deviceType,
      device_type_other: deviceType === "Other" ? deviceTypeOther : null,
      issue_description: issueDescription,
      phone_number: phoneNumber,
      photo_paths: uploadedPaths,
      // status defaults to "Received" and id to the next RPR-###### value at
      // the database level (PLAN.md task 3); the insert trigger writes the
      // matching status_history row automatically.
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to insert repair request:", error);
    // DESIGN.md: leave the uploaded photos orphaned in Storage for later
    // cleanup rather than trying to reconcile a customer-visible partial
    // state here.
    return apiError("INTERNAL_ERROR", "Failed to save the repair request", 500);
  }

  return apiSuccess({ requestId: data.id }, 201);
}
