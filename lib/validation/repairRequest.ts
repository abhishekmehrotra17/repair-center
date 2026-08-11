import { z } from "zod";

// Field/photo rules per PRD.md Section 5, Feature 1. Shared between the
// client form (app/page.tsx) and the server route (app/api/requests/route.ts)
// so both layers of DESIGN.md's two-layer validation enforce the same limits.

export const DEVICE_TYPES = ["Desktop", "Laptop", "Monitor", "Printer", "Other"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const ISSUE_DESCRIPTION_MIN = 10;
export const ISSUE_DESCRIPTION_MAX = 500;
export const PHONE_DIGITS = 10;
export const PHONE_RAW_PATTERN = /^[0-9()+\-.\s]+$/;

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Phone normalization (strip to digits-only before storage/comparison) per
// DESIGN.md's submission flow.
export const requestFieldsSchema = z
  .object({
    deviceType: z.enum(DEVICE_TYPES),
    deviceTypeOther: z.string().trim().optional(),
    issueDescription: z
      .string()
      .trim()
      .min(ISSUE_DESCRIPTION_MIN, `Issue description must be at least ${ISSUE_DESCRIPTION_MIN} characters`)
      .max(ISSUE_DESCRIPTION_MAX, `Issue description must be at most ${ISSUE_DESCRIPTION_MAX} characters`),
    phoneNumber: z
      .string()
      .refine((raw) => PHONE_RAW_PATTERN.test(raw), {
        message: "Phone number may only contain digits and standard formatting characters",
      })
      .transform((value) => value.replace(/\D/g, ""))
      .refine((digits) => digits.length === PHONE_DIGITS, {
        message: `Phone number must be exactly ${PHONE_DIGITS} digits`,
      }),
  })
  .refine(
    (data) => data.deviceType !== "Other" || (data.deviceTypeOther?.length ?? 0) > 0,
    {
      message: 'deviceTypeOther is required when deviceType is "Other"',
      path: ["deviceTypeOther"],
    }
  );

export function extractPhotoFiles(form: FormData): File[] {
  return form
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File)
    // An empty, unnamed entry is a file input left blank (browsers submit
    // this even for an optional field) — not a real upload attempt, so it's
    // dropped silently. A named-but-empty file IS a real (bad) upload and
    // must fall through to validatePhotos() to be rejected explicitly.
    .filter((file) => !(file.name === "" && file.size === 0));
}

export function validatePhotos(files: File[]): string | null {
  if (files.length > MAX_PHOTOS) {
    return `At most ${MAX_PHOTOS} photos are allowed`;
  }
  for (const file of files) {
    if (file.size === 0) {
      return `Photo "${file.name}" is empty`;
    }
    if (!(file.type in ALLOWED_PHOTO_TYPES)) {
      return `Photo "${file.name}" must be a JPG or PNG file`;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return `Photo "${file.name}" must be 5MB or smaller`;
    }
  }
  return null;
}
