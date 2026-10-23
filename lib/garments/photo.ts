export const GARMENT_PHOTOS_BUCKET = "garments";

/** Signed URLs are regenerated on each page render; one hour covers a session comfortably. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

/** Storage path for a new photo: always inside the owner's folder, required by the RLS policies. */
export function photoPath(userId: string, mimeType: string, id: string = crypto.randomUUID()): string {
  const extension = EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error(`Unsupported photo type: ${mimeType}`);
  }
  return `${userId}/${id}.${extension}`;
}
