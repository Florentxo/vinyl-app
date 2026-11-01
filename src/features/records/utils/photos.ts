import type { PhotoSlot, RecordPhoto, VinylRecord } from "../types/record"

export function buildSlots(photos: RecordPhoto[], extraDiscs: number): PhotoSlot[] {
  const discCount = Math.max(extraDiscs, ...photos.filter((p) => p.kind === "disc").map((p) => p.disc_number), 0)
  const slots: PhotoSlot[] = [
    { kind: "front", disc_number: 0, side: "" },
    { kind: "back", disc_number: 0, side: "" },
  ]
  for (let disc = 1; disc <= discCount; disc++) {
    slots.push({ kind: "disc", disc_number: disc, side: "A" }, { kind: "disc", disc_number: disc, side: "B" })
  }
  return slots
}

export const MAX_PHOTO_INPUT_BYTES = 20 * 1024 * 1024
export const MAX_PHOTO_DIMENSION = 1600
export const SCAN_PHOTO_DIMENSION = 1024

export function slotKey(slot: PhotoSlot) {
  return slot.kind === "disc" ? `disc${slot.disc_number}-${slot.side}` : slot.kind
}

export function sameSlot(a: PhotoSlot, b: PhotoSlot) {
  return a.kind === b.kind && a.disc_number === b.disc_number && a.side === b.side
}

export function slotLabel(slot: PhotoSlot) {
  if (slot.kind === "front") return "Front"
  if (slot.kind === "back") return "Back"
  return `Disc ${slot.disc_number} · Side ${slot.side}`
}

export function buildPhotoPath(userId: string, recordId: string, slot: PhotoSlot, mimeType: string, stamp = Date.now()) {
  const extension = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg"
  return `${userId}/${recordId}/${slotKey(slot)}-${stamp}.${extension}`
}

// Photos are a flat list: each new one takes the first free storage slot (front, back, then disc sides).
export function nextFreeSlot(photos: RecordPhoto[]): PhotoSlot {
  for (let discs = 0; ; discs++) {
    const free = buildSlots([], discs).find((slot) => !photos.some((photo) => sameSlot(photo, slot)))
    if (free) return free
  }
}

export function orderPhotos(photos: RecordPhoto[]): RecordPhoto[] {
  return buildSlots(photos, 0).flatMap((slot) => photos.filter((photo) => sameSlot(photo, slot)))
}

export function getDisplayCover(record: Pick<VinylRecord, "cover_url" | "cover_source" | "custom_cover_url">) {
  if (record.cover_source === "custom" && record.custom_cover_url) return record.custom_cover_url
  return record.cover_url
}

export function fitWithin(width: number, height: number, max = MAX_PHOTO_DIMENSION) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

const HEIC_NAME = /\.(heic|heif)$/i

// Browsers that cannot decode HEIC (Chrome, Edge, Firefox on desktop) get a lazy-loaded converter.
async function decodeImage(file: File): Promise<ImageBitmap> {
  const options: ImageBitmapOptions = { imageOrientation: "from-image" }
  try {
    return await createImageBitmap(file, options)
  } catch {
    const isHeic = HEIC_NAME.test(file.name) || /^image\/hei[cf]$/i.test(file.type)
    if (!isHeic) throw new Error("This image format is not supported. Try a JPEG or PNG photo.")
    try {
      const { heicTo } = await import("heic-to")
      const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 })
      return await createImageBitmap(jpeg, options)
    } catch {
      throw new Error("Could not convert this HEIC photo. Try a JPEG or PNG photo.")
    }
  }
}

export async function compressImage(file: File, maxDimension = MAX_PHOTO_DIMENSION, quality = 0.85): Promise<Blob> {
  // Some systems report no MIME type for HEIC files.
  if (!file.type.startsWith("image/") && !HEIC_NAME.test(file.name)) throw new Error("Please choose an image file.")
  if (file.size > MAX_PHOTO_INPUT_BYTES) throw new Error("This image is too large (20 MB maximum).")

  const bitmap = await decodeImage(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Could not process this image.")
    context.drawImage(bitmap, 0, 0, width, height)

    // Browsers that cannot encode WebP silently return PNG, so fall back to JPEG.
    const webp = await canvasToBlob(canvas, "image/webp", quality)
    if (webp?.type === "image/webp") return webp
    const jpeg = await canvasToBlob(canvas, "image/jpeg", quality)
    if (!jpeg) throw new Error("Could not process this image.")
    return jpeg
  } finally {
    bitmap.close()
  }
}
