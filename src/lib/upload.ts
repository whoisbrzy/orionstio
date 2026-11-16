export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type ImageKind = { ext: "png" | "jpg" | "webp"; mime: string };

/** Identify an image by its first bytes, ignoring whatever type the browser claimed. */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const at = (i: number) => bytes[i];
  if (bytes.length > 12 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) return { ext: "png", mime: "image/png" };
  if (bytes.length > 12 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (bytes.length > 12 && String.fromCharCode(at(0), at(1), at(2), at(3)) === "RIFF" && String.fromCharCode(at(8), at(9), at(10), at(11)) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}
