import { getSupabaseAdminClient } from "./admin";

const REPAIR_PHOTOS_BUCKET = "repair-photos";
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes, per DESIGN.md's lookup flow

// Best-effort: a photo that fails to sign (e.g. deleted from Storage out of
// band) is dropped from the result rather than failing the whole lookup.
export async function createSignedPhotoUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(REPAIR_PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error("Failed to create signed photo URLs:", error);
    return [];
  }

  return data
    .map((entry) => entry.signedUrl)
    .filter((url): url is string => Boolean(url));
}
