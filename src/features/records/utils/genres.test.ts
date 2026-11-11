import { describe, expect, it } from "vitest"
import { buildGenreOptions, genreKey, genreTokens, recordGenreKeys } from "./genres"

describe("buildGenreOptions", () => {
  it("merges genres and styles into one sorted list without duplicates", () => {
    const options = buildGenreOptions(["Rock / Pop Rock", "Jazz / Jazz-Funk", "Electronic / House", "Funk / Soul / Jazz"])
    expect(options.map((option) => option.label)).toEqual(["Electronic", "Funk / Soul", "House", "Jazz", "Jazz-Funk", "Pop Rock", "Rock"])
    expect(options.find((option) => option.key === "jazz")?.count).toBe(2)
  })

  it("treats case, hyphen and accent variants as the same entry", () => {
    const options = buildGenreOptions(["Hip Hop", "hip-hop", "Hip-Hop", "Hip-Hop", "Kayōkyoku", "Kayokyoku"])
    expect(options).toHaveLength(2)
    expect(options.find((option) => option.key === "hip hop")).toMatchObject({ label: "Hip-Hop", count: 4 })
  })

  it("counts a record once even when genre and style repeat", () => {
    expect(buildGenreOptions(["Jazz / jazz"])).toEqual([{ key: "jazz", label: "Jazz", count: 1 }])
  })

  it("keeps Funk / Soul as a single genre", () => {
    expect(genreTokens("Funk / Soul")).toEqual(["Funk / Soul"])
    expect(genreTokens("Funk / Soul / Disco")).toEqual(["Funk / Soul", "Disco"])
    const options = buildGenreOptions(["Funk / Soul / Disco", "Funk / Soul", "Electronic / Disco"])
    expect(options.map((option) => [option.label, option.count])).toEqual([["Disco", 2], ["Electronic", 1], ["Funk / Soul", 2]])
  })

  it("ignores empty values", () => {
    expect(buildGenreOptions(["", " / "])).toEqual([])
  })
})

describe("recordGenreKeys", () => {
  it("returns unique normalized keys", () => {
    expect(recordGenreKeys("Jazz / Acid Jazz")).toEqual(["jazz", "acid jazz"])
    expect(genreKey("  Hip-Hop ")).toBe("hip hop")
  })
})
