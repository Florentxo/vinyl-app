import { describe, expect, it } from "vitest"
import { mapDiscogsRelease } from "./discogs"
import type { DiscogsReleaseResult } from "./discogs"
import {
  GOOD_MATCH,
  bestScore,
  buildScanSearchPlan,
  mergeReleases,
  normalizeForMatch,
  primaryArtist,
  rankReleases,
  releaseScore,
} from "./scanSearch"

// Real Discogs answers for the query "大谷和夫 キャッツ・アイ".
const discogsResults: DiscogsReleaseResult[] = [
  { id: 4266117, title: "杏里* - Cat's Eye = キャッツ・アイ", year: 1983 },
  { id: 3371279, title: "大谷和夫* / 小田裕一郎* - Cat's Eye = キャッツ・アイ サウンド・トラック", year: 1983 },
  { id: 7890161, title: "インターサウンド* - Cat's Eye = キャッツ・アイ", year: 1985 },
  { id: 5339378, title: "大谷和夫* - New Cat's Eye Soundtrack = New キャッツ・アイ サウンド・トラック", year: 1984 },
  { id: 5913856, title: "Osamu Shoji = 東海林 修* - Cat's Eye - Synthesizer Fantasy = キャッツ・アイ シンセサイザー・ファンタジー", year: 1983 },
]
const releases = discogsResults.map((result) => mapDiscogsRelease(result, ""))

// What the recognition returned for that cover: credits and title mixed, punctuation slightly different.
const target = { artist: "大谷和夫 / 杏里 / キャッツ・アイ", album: "キャッツ・アイ サウンドトラック", altArtist: "Kazuo Otani", altAlbum: "Cat's Eye Soundtrack" }

describe("primaryArtist", () => {
  it("keeps only the first credited artist", () => {
    expect(primaryArtist("大谷和夫 / 杏里 / キャッツ・アイ")).toBe("大谷和夫")
    expect(primaryArtist("Justice & Daft Punk")).toBe("Justice")
    expect(primaryArtist("Artist feat. Someone")).toBe("Artist")
    expect(primaryArtist("Nirvana (2)")).toBe("Nirvana")
  })

  it("leaves a single artist untouched", () => {
    expect(primaryArtist("Amy Winehouse")).toBe("Amy Winehouse")
    expect(primaryArtist("")).toBe("")
  })
})

describe("normalizeForMatch", () => {
  it("ignores punctuation, spacing, width and case", () => {
    expect(normalizeForMatch("サウンド・トラック")).toBe(normalizeForMatch("サウンドトラック"))
    expect(normalizeForMatch("Cat's  Eye")).toBe("catseye")
    expect(normalizeForMatch("ＡＢＣ")).toBe("abc")
  })
})

describe("ranking scan results", () => {
  it("puts the exact record first even though Discogs listed it second", () => {
    const ranked = rankReleases(releases, target)
    expect(ranked[0].id).toBe(3371279)
  })

  it("scores the exact record above the unrelated ones", () => {
    const scores = new Map(releases.map((release) => [release.id, releaseScore(release, target)]))
    expect(scores.get(3371279)).toBeGreaterThanOrEqual(GOOD_MATCH)
    expect(scores.get(3371279)!).toBeGreaterThan(scores.get(4266117)!)
    expect(scores.get(3371279)!).toBeGreaterThan(scores.get(5913856)!)
  })

  it("reports the best score of a list and handles an empty one", () => {
    expect(bestScore(releases, target)).toBeGreaterThanOrEqual(GOOD_MATCH)
    expect(bestScore([], target)).toBe(0)
  })

  it("keeps Discogs order for equally scored results", () => {
    const a = mapDiscogsRelease({ id: 1, title: "X - Y" }, "")
    const b = mapDiscogsRelease({ id: 2, title: "X - Y" }, "")
    expect(rankReleases([a, b], { artist: "X", album: "Y" }).map((r) => r.id)).toEqual([1, 2])
  })
})

describe("mergeReleases", () => {
  it("adds only releases not already present", () => {
    expect(mergeReleases(releases.slice(0, 2), releases.slice(1, 4)).map((r) => r.id)).toEqual([4266117, 3371279, 7890161, 5339378])
  })
})

describe("buildScanSearchPlan", () => {
  it("starts from the first artist and the first word of the title, then widens", () => {
    const plan = buildScanSearchPlan(target, "", "tok")
    expect(plan[0].label).toBe("大谷和夫 キャッツ・アイ")
    expect(new URL(plan[0].url).searchParams.get("q")).toBe("大谷和夫 キャッツ・アイ")
    expect(plan.map((attempt) => attempt.label)).toContain("Kazuo Otani – Cat's Eye Soundtrack")
    expect(plan[plan.length - 1]?.label).toBe("Kazuo Otani")
  })

  it("never repeats a free-text query and skips empty ones", () => {
    const labels = buildScanSearchPlan({ artist: "Justice", album: "Cross" }, "", undefined).map((attempt) => attempt.label)
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels.every((label) => label.length >= 2)).toBe(true)
  })
})
