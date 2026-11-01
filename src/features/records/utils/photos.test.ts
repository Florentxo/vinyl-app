import { describe, expect, it } from "vitest"
import { buildPhotoPath, buildSlots, fitWithin, getDisplayCover, nextFreeSlot, orderPhotos, sameSlot, slotKey, slotLabel } from "./photos"
import type { RecordPhoto } from "../types/record"

const front = { kind: "front", disc_number: 0, side: "" } as const

describe("getDisplayCover", () => {
  it("defaults to the Discogs cover", () => {
    expect(getDisplayCover({ cover_url: "discogs.jpg" })).toBe("discogs.jpg")
    expect(getDisplayCover({ cover_url: "discogs.jpg", cover_source: "discogs", custom_cover_url: "mine.webp" })).toBe("discogs.jpg")
  })

  it("uses the custom photo when selected and available", () => {
    expect(getDisplayCover({ cover_url: "discogs.jpg", cover_source: "custom", custom_cover_url: "mine.webp" })).toBe("mine.webp")
  })

  it("falls back to Discogs when the custom URL could not be resolved", () => {
    expect(getDisplayCover({ cover_url: "discogs.jpg", cover_source: "custom" })).toBe("discogs.jpg")
  })
})

describe("photo slots", () => {
  it("always offers front and back", () => {
    expect(buildSlots([], 0).map(slotKey)).toEqual(["front", "back"])
  })

  it("offers sides A and B for every disc, including discs added locally", () => {
    expect(buildSlots([], 2).map(slotKey)).toEqual(["front", "back", "disc1-A", "disc1-B", "disc2-A", "disc2-B"])
  })

  it("keeps discs that already have photos", () => {
    const photo: RecordPhoto = { id: "1", record_id: "r", path: "p", kind: "disc", disc_number: 3, side: "B" }
    expect(buildSlots([photo], 0).map(slotKey)).toContain("disc3-A")
  })

  it("labels and compares slots", () => {
    expect(slotLabel({ kind: "disc", disc_number: 2, side: "B" })).toBe("Disc 2 · Side B")
    expect(sameSlot(front, { ...front })).toBe(true)
    expect(sameSlot(front, { kind: "back", disc_number: 0, side: "" })).toBe(false)
  })
})

describe("flat photo list", () => {
  const photo = (kind: "front" | "back" | "disc", disc_number: number, side: "" | "A" | "B"): RecordPhoto =>
    ({ id: `${kind}${disc_number}${side}`, record_id: "r", path: "p", kind, disc_number, side })

  it("fills the first free slot for each new photo", () => {
    expect(slotKey(nextFreeSlot([]))).toBe("front")
    expect(slotKey(nextFreeSlot([photo("front", 0, "")]))).toBe("back")
    expect(slotKey(nextFreeSlot([photo("front", 0, ""), photo("back", 0, "")]))).toBe("disc1-A")
  })

  it("reuses a slot freed by a deletion", () => {
    expect(slotKey(nextFreeSlot([photo("back", 0, "")]))).toBe("front")
  })

  it("lists photos in slot order", () => {
    const list = [photo("disc", 1, "A"), photo("back", 0, ""), photo("front", 0, "")]
    expect(orderPhotos(list).map((p) => p.id)).toEqual(["front0", "back0", "disc1A"])
  })
})

describe("buildPhotoPath", () => {
  it("scopes files to the user and record folder", () => {
    expect(buildPhotoPath("u1", "r1", front, "image/webp", 5)).toBe("u1/r1/front-5.webp")
    expect(buildPhotoPath("u1", "r1", { kind: "disc", disc_number: 2, side: "A" }, "image/jpeg", 5)).toBe("u1/r1/disc2-A-5.jpg")
  })
})

describe("fitWithin", () => {
  it("downsizes large images and keeps the ratio", () => {
    expect(fitWithin(3200, 1600)).toEqual({ width: 1600, height: 800 })
  })

  it("never enlarges small images", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})
