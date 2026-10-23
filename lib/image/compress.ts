export const MAX_PHOTO_DIMENSION = 1000;
const QUALITY = 0.82;

export type PhotoMimeType = "image/webp" | "image/jpeg";

export type CompressedPhoto = {
  blob: Blob;
  type: PhotoMimeType;
  width: number;
  height: number;
};

/** Scales (width, height) down to fit in a max × max box, keeping the ratio. Never upscales. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Encodes as WebP, falling back to JPEG when the browser silently ignores the
 * requested type (Safari's canvas encoder returns PNG for "image/webp").
 */
export async function encodeWithFallback(
  encode: (type: PhotoMimeType) => Promise<Blob | null>,
): Promise<{ blob: Blob; type: PhotoMimeType }> {
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") {
    return { blob: webp, type: "image/webp" };
  }
  const jpeg = await encode("image/jpeg");
  if (jpeg?.type === "image/jpeg") {
    return { blob: jpeg, type: "image/jpeg" };
  }
  throw new Error("Image encoding failed");
}

type DrawableImage = { source: CanvasImageSource; width: number; height: number; release: () => void };

/** Decodes the file, applying the EXIF orientation of phone photos. */
async function decode(file: Blob): Promise<DrawableImage> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall through to <img> decoding.
    }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

/** Resizes a picked photo to at most 1000 px and re-encodes it (WebP, else JPEG) before upload. */
export async function compressPhoto(file: Blob, maxDimension = MAX_PHOTO_DIMENSION): Promise<CompressedPhoto> {
  const image = await decode(file);
  try {
    const { width, height } = fitWithin(image.width, image.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context unavailable");
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(image.source, 0, 0, width, height);

    const { blob, type } = await encodeWithFallback(
      (mimeType) => new Promise((resolve) => canvas.toBlob(resolve, mimeType, QUALITY)),
    );
    return { blob, type, width, height };
  } finally {
    image.release();
  }
}
