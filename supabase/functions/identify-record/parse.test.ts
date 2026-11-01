import { describe, expect, it } from "vitest"
import { isRetryableStatus, parseIdentification, startOfMonthUtc, validateImages } from "./parse"

const reply = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] })

describe("parseIdentification", () => {
  it("reads artist, album and confidence", () => {
    expect(parseIdentification(reply('{"artist":" Justice ","album":"Cross","confidence":0.92}')))
      .toEqual({ artist: "Justice", album: "Cross", confidence: 0.92, artistLatin: "", albumLatin: "" })
  })

  it("reads the romanized fallback names", () => {
    const result = parseIdentification(reply('{"artist":"大谷和夫","album":"キャッツ・アイ","confidence":0.8,"artist_latin":" Kazuo Otani ","album_latin":"Cat\'s Eye"}'))
    expect(result).toMatchObject({ artistLatin: "Kazuo Otani", albumLatin: "Cat's Eye" })
  })

  it("clamps the confidence and defaults it to 0", () => {
    expect(parseIdentification(reply('{"artist":"A","album":"B","confidence":5}'))?.confidence).toBe(1)
    expect(parseIdentification(reply('{"artist":"A","album":"B"}'))?.confidence).toBe(0)
  })

  it("rejects empty, malformed or non-object answers", () => {
    expect(parseIdentification(reply("not json"))).toBeNull()
    expect(parseIdentification(reply('{"artist":"","album":""}'))).toBeNull()
    expect(parseIdentification(reply('{"artist":1,"album":2}'))).toBeNull()
    expect(parseIdentification({})).toBeNull()
    expect(parseIdentification(null)).toBeNull()
  })

  it("accepts an answer where only one field is known", () => {
    expect(parseIdentification(reply('{"artist":"","album":"Cross","confidence":0.4}'))?.album).toBe("Cross")
  })
})

describe("validateImages", () => {
  const ok = { mime: "image/webp", data: "QUJD" }

  it("accepts 1 to 3 valid images", () => {
    expect(validateImages([ok])).toHaveLength(1)
    expect(validateImages([ok, ok, ok])).toHaveLength(3)
  })

  it("rejects missing, too many, or badly typed images", () => {
    expect(() => validateImages([])).toThrow()
    expect(() => validateImages("x")).toThrow()
    expect(() => validateImages([ok, ok, ok, ok])).toThrow()
    expect(() => validateImages([{ mime: "image/gif", data: "QUJD" }])).toThrow()
    expect(() => validateImages([{ mime: "image/webp", data: "not base64!" }])).toThrow()
    expect(() => validateImages([{ mime: "image/webp", data: "A".repeat(5_000_001) }])).toThrow()
  })
})

describe("isRetryableStatus", () => {
  it("retries overload and server errors only", () => {
    for (const status of [429, 500, 502, 503, 504]) expect(isRetryableStatus(status)).toBe(true)
    for (const status of [200, 400, 401, 403, 404]) expect(isRetryableStatus(status)).toBe(false)
  })
})

describe("startOfMonthUtc", () => {
  it("returns the first instant of the UTC month", () => {
    expect(startOfMonthUtc(new Date("2026-11-17T10:00:00Z"))).toBe("2026-11-01T00:00:00.000Z")
  })
})
