import { describe, expect, it } from "vitest"
import { latinTitlePart, loadRomanizer, needsRomanization, romanizeHangul, sortKey } from "./romanize"

describe("needsRomanization", () => {
  it("detects Japanese, Chinese and Korean text only", () => {
    expect(needsRomanization("大谷和夫")).toBe(true)
    expect(needsRomanization("キャッツ・アイ")).toBe(true)
    expect(needsRomanization("방탄소년단")).toBe(true)
    expect(needsRomanization("Amy Winehouse")).toBe(false)
    expect(needsRomanization("Björk")).toBe(false)
  })
})

describe("latinTitlePart", () => {
  it("returns the Latin side of a Discogs 'Latin = original' title", () => {
    expect(latinTitlePart("Cat's Eye = キャッツ・アイ サウンド・トラック")).toBe("Cat's Eye")
    expect(latinTitlePart("Osamu Shoji = 東海林 修*")).toBe("Osamu Shoji")
    expect(latinTitlePart("キャッツ・アイ = Cat's Eye")).toBe("Cat's Eye")
  })

  it("returns null when there is no such pair", () => {
    expect(latinTitlePart("大谷和夫*")).toBeNull()
    expect(latinTitlePart("Nevermind")).toBeNull()
    expect(latinTitlePart("A = B = ")).toBe("A")
  })
})

describe("romanizeHangul", () => {
  it("romanizes syllables", () => {
    expect(romanizeHangul("한글")).toBe("hangeul")
    expect(romanizeHangul("방탄소년단")).toBe("bangtansonyeondan")
    expect(romanizeHangul("Mix 가요")).toBe("Mix gayo")
  })
})

describe("sortKey", () => {
  it("leaves plain Latin text untouched so existing ordering is unchanged", () => {
    expect(sortKey("Amy Winehouse")).toBe("Amy Winehouse")
    expect(sortKey("Björk")).toBe("Björk")
  })

  it("uses the Latin part of a Discogs bilingual title without any library", () => {
    expect(sortKey("Cat's Eye = キャッツ・アイ サウンド・トラック")).toBe("Cat's Eye")
  })

  it("keeps non-Latin text as is until the romanizer is available", () => {
    expect(sortKey("大谷和夫*")).toBe("大谷和夫*")
  })

  it("romanizes Japanese, Chinese and Korean with the loaded libraries", async () => {
    const romanize = await loadRomanizer()
    expect(sortKey("キャッツ・アイ", romanize)).toBe("kyattsu ai")
    expect(sortKey("大谷和夫* / 小田裕一郎*", romanize)).toMatch(/^da gu he fu/)
    expect(sortKey("周杰伦", romanize)).toBe("zhou jie lun")
    expect(sortKey("방탄소년단", romanize)).toBe("bangtansonyeondan")
  })

  it("orders mixed scripts alphabetically", async () => {
    const romanize = await loadRomanizer()
    const names = ["Zebra", "大谷和夫*", "Amy", "周杰伦", "Kinks"]
    const sorted = [...names].sort((a, b) => sortKey(a, romanize).localeCompare(sortKey(b, romanize), undefined, { sensitivity: "base" }))
    expect(sorted).toEqual(["Amy", "大谷和夫*", "Kinks", "Zebra", "周杰伦"])
  })
})
