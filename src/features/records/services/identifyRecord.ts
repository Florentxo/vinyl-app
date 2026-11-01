import { supabase } from "../../../services/supabase"

export interface Identification {
  artist: string
  album: string
  confidence: number
  artistLatin?: string
  albumLatin?: string
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the image."))
    reader.readAsDataURL(blob)
  })
}

async function errorMessage(error: unknown): Promise<string> {
  const response = (error as { context?: Response })?.context
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json() as { error?: string }
      if (body.error) return body.error
    } catch {
      // the body was not the function's JSON error: report the HTTP status instead
    }
    return `The server could not process this scan (HTTP ${response.status}). Please try again.`
  }
  return "Could not reach the server. Check your connection and try again."
}

// Longer than the server's own budget (45 s) so the server's explicit error arrives first.
export const IDENTIFY_TIMEOUT_MS = 55_000

// The only entry point for recognition: the provider can change on the server without touching the app.
export async function identifyRecord(images: Blob[], signal?: AbortSignal): Promise<Identification> {
  const payload = await Promise.all(images.map(async (image) => ({ mime: image.type, data: await toBase64(image) })))
  const { data, error } = await supabase.functions.invoke("identify-record", {
    body: { images: payload },
    signal,
    timeout: IDENTIFY_TIMEOUT_MS,
  })
  if (error) {
    if (signal?.aborted) throw new Error("Identification cancelled.")
    if (/abort|timeout/i.test(`${(error as Error).name} ${(error as Error).message}`)) {
      throw new Error("Identification took too long. Please try again.")
    }
    throw new Error(await errorMessage(error))
  }
  return data as Identification
}
