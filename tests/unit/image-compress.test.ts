import { describe, expect, it, vi } from "vitest";
import { encodeWithFallback, fitWithin } from "@/lib/image/compress";

describe("fitWithin", () => {
  it("scales a portrait photo down to 1000 px on its long side", () => {
    expect(fitWithin(3024, 4032, 1000)).toEqual({ width: 750, height: 1000 });
  });

  it("scales a landscape photo down", () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
  });

  it("never upscales a small image", () => {
    expect(fitWithin(600, 800, 1000)).toEqual({ width: 600, height: 800 });
  });

  it("keeps at least one pixel per side", () => {
    expect(fitWithin(10_000, 1, 1000)).toEqual({ width: 1000, height: 1 });
  });
});

describe("encodeWithFallback", () => {
  const blob = (type: string) => new Blob(["x"], { type });

  it("uses WebP when the browser supports it", async () => {
    const encode = vi.fn(async (type: string) => blob(type));

    const result = await encodeWithFallback(encode);

    expect(result.type).toBe("image/webp");
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it("falls back to JPEG when WebP encoding silently returns PNG (Safari)", async () => {
    const encode = vi.fn(async (type: string) => (type === "image/webp" ? blob("image/png") : blob(type)));

    const result = await encodeWithFallback(encode);

    expect(result.type).toBe("image/jpeg");
    expect(result.blob.type).toBe("image/jpeg");
  });

  it("fails when nothing can be encoded", async () => {
    await expect(encodeWithFallback(async () => null)).rejects.toThrow("Image encoding failed");
  });
});
