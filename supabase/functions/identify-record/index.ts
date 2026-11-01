// Supabase Edge Function (Deno). Identifies an album from cover/disc photos with Gemini.
// Required secret: GEMINI_API_KEY.
// Optional: SCAN_MONTHLY_LIMIT.
import { createClient } from "npm:@supabase/supabase-js@2"
import { isRetryableStatus, parseIdentification, startOfMonthUtc, validateImages } from "./parse.ts"
import type { ImagePayload } from "./parse.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PROMPT = `You identify music albums from photos of the front cover, back cover or label of a record.
Read any visible text and recognise the artwork. Answer with the artist name and the album title exactly as printed on the record.
"artist" must contain only the credited performer or composer names (separate several with " / "), never the album title or a song title. "album" is the album title only.
If the printed names are not in Latin script (for example Japanese), also give "artist_latin" and "album_latin": the romanized or English names under which the record is most likely listed in the Discogs database. Otherwise leave them empty.
If you are not sure, give your best guess with a low confidence. If nothing can be identified, return empty strings and a confidence of 0.`

// Optional tuning through secrets: GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_THINKING_LEVEL
// ("low" by default, empty to disable) and GEMINI_MEDIA_RESOLUTION (for example "MEDIA_RESOLUTION_MEDIUM").
const GEMINI_ATTEMPT_TIMEOUT_MS = 14_000
const TOTAL_BUDGET_MS = 45_000
const MAX_ATTEMPTS = 3
const RETRY_DELAYS_MS = [500, 1_000]
// A normal answer takes a few seconds. When the first model stalls, the next attempt uses the fallback model.
const DEFAULT_MODEL = "gemini-3.8-flash"
const DEFAULT_FALLBACK_MODEL = "gemini-3.5-flash-lite"

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
}

function callGemini(apiKey: string, model: string, images: ImagePayload[], timeoutMs: number, useThinkingLevel: boolean) {
  // gemini-3.8-flash accepts "low", "medium" or "high" ("minimal" is rejected). Low keeps the answer fast.
  const thinkingLevel = Deno.env.get("GEMINI_THINKING_LEVEL") ?? "low"
  const mediaResolution = Deno.env.get("GEMINI_MEDIA_RESOLUTION")
  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        artist: { type: "STRING" },
        album: { type: "STRING" },
        confidence: { type: "NUMBER" },
        artist_latin: { type: "STRING" },
        album_latin: { type: "STRING" },
      },
      required: ["artist", "album", "confidence", "artist_latin", "album_latin"],
    },
    temperature: 0,
  }
  if (mediaResolution) generationConfig.mediaResolution = mediaResolution
  if (useThinkingLevel && thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel }

  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          ...images.map((image) => ({ inline_data: { mime_type: image.mime, data: image.data } })),
        ],
      }],
      generationConfig,
    }),
  })
}

// Gemini sometimes answers 503 ("high demand") or stalls: retry briefly, alternating between the two models.
async function callGeminiWithRetry(apiKey: string, models: string[], images: ImagePayload[], deadline: number) {
  let lastError: unknown = null
  let useThinkingLevel = true
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now()
    if (remaining < 3_000) break
    const model = models[attempt % models.length]
    try {
      let response = await callGemini(apiKey, model, images, Math.min(GEMINI_ATTEMPT_TIMEOUT_MS, remaining), useThinkingLevel)
      // If the model rejects the thinking setting, drop it right away and ask again.
      if (response.status === 400 && useThinkingLevel) {
        console.warn("Gemini rejected the thinking level, retrying without it", model)
        useThinkingLevel = false
        response = await callGemini(apiKey, model, images, Math.min(GEMINI_ATTEMPT_TIMEOUT_MS, deadline - Date.now()), false)
      }
      if (response.ok || !isRetryableStatus(response.status) || attempt === MAX_ATTEMPTS - 1) return { response, model }
      console.warn("Gemini retryable status", response.status, model, "attempt", attempt + 1)
    } catch (error) {
      lastError = error
      console.warn("Gemini attempt failed", attempt + 1, model, error instanceof Error ? error.message : error)
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt] ?? 1_000))
  }
  throw lastError ?? new Error("Gemini did not answer in time")
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405)

  const apiKey = Deno.env.get("GEMINI_API_KEY")
  if (!apiKey) return reply({ error: "Scan is not configured." }, 500)

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
  })

  // Authentication and the quota count are independent, so they run together.
  // Row-level security restricts the count to the caller's own scans.
  const [{ data: userData, error: userError }, { count, error: countError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("scan_usage").select("id", { count: "exact", head: true }).gte("created_at", startOfMonthUtc()),
  ])
  if (userError || !userData.user) return reply({ error: "Sign in to scan records." }, 401)

  let images
  try {
    images = validateImages((await request.json()).images)
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Invalid request." }, 400)
  }

  const limit = Number(Deno.env.get("SCAN_MONTHLY_LIMIT") ?? "30")
  if (countError) return reply({ error: "Could not check your scan quota." }, 500)
  if ((count ?? 0) >= limit) return reply({ error: `Monthly scan limit reached (${limit}).` }, 429)

  // Recording the scan overlaps with the model call instead of delaying it.
  const usageRecorded = supabase.from("scan_usage").insert({ user_id: userData.user.id })

  const models = [
    Deno.env.get("GEMINI_MODEL") ?? DEFAULT_MODEL,
    Deno.env.get("GEMINI_FALLBACK_MODEL") ?? DEFAULT_FALLBACK_MODEL,
  ]
  const startedAt = Date.now()
  let geminiResponse: Response
  let model: string
  try {
    const result = await callGeminiWithRetry(apiKey, models, images, startedAt + TOTAL_BUDGET_MS)
    geminiResponse = result.response
    model = result.model
  } catch {
    console.error("Gemini request timed out or failed", Date.now() - startedAt, "ms")
    return reply({ error: "The recognition service took too long to answer. Please try again." }, 504)
  }

  const { error: usageError } = await usageRecorded
  if (usageError) console.error("Could not record scan usage", usageError.message)
  console.log("scan", model, geminiResponse.status, `${Date.now() - startedAt}ms`, `${images.length} image(s)`)

  if (!geminiResponse.ok) {
    let detail = ""
    try {
      detail = ((await geminiResponse.json()) as { error?: { message?: string } }).error?.message ?? ""
    } catch {
      // keep the status code only
    }
    console.error("Gemini request failed", geminiResponse.status, detail)
    return reply({ error: `Recognition service error (${geminiResponse.status}): ${detail.slice(0, 200) || "no details"}` }, 502)
  }

  const identification = parseIdentification(await geminiResponse.json())
  if (!identification) return reply({ error: "Could not identify this record." }, 422)
  return reply(identification)
})
