export interface Identification {
  artist: string
  album: string
  confidence: number
  // Romanized or English names, used as a fallback search when the printed text is not in Latin script.
  artistLatin: string
  albumLatin: string
}

export const MAX_IMAGES = 3
export const MAX_IMAGE_BASE64_LENGTH = 5_000_000
const ALLOWED_MIME_TYPES = ["image/webp", "image/jpeg", "image/png"]

export interface ImagePayload {
  mime: string
  data: string
}

export function validateImages(value: unknown): ImagePayload[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Send at least one image.")
  if (value.length > MAX_IMAGES) throw new Error(`Send at most ${MAX_IMAGES} images.`)
  return value.map((item) => {
    const { mime, data } = (item ?? {}) as Partial<ImagePayload>
    if (typeof mime !== "string" || !ALLOWED_MIME_TYPES.includes(mime)) throw new Error("Unsupported image type.")
    if (typeof data !== "string" || data.length === 0 || data.length > MAX_IMAGE_BASE64_LENGTH) throw new Error("Invalid image size.")
    if (!/^[A-Za-z0-9+/]+=*$/.test(data)) throw new Error("Invalid image data.")
    return { mime, data }
  })
}

// Extracts the model answer from a Gemini generateContent response.
export function parseIdentification(response: unknown): Identification | null {
  const text = (response as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("")
  if (!text) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }

  const { artist, album, confidence, artist_latin, album_latin } = (parsed ?? {}) as Record<string, unknown>
  if (typeof artist !== "string" || typeof album !== "string") return null
  const cleanArtist = artist.trim()
  const cleanAlbum = album.trim()
  if (!cleanArtist && !cleanAlbum) return null

  const score = typeof confidence === "number" && Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0
  return {
    artist: cleanArtist,
    album: cleanAlbum,
    confidence: score,
    artistLatin: typeof artist_latin === "string" ? artist_latin.trim() : "",
    albumLatin: typeof album_latin === "string" ? album_latin.trim() : "",
  }
}

// Statuses worth retrying: the provider is overloaded or had a transient failure.
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

export function startOfMonthUtc(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}
