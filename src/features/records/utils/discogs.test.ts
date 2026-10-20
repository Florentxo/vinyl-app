import { describe, expect, it } from "vitest"
import {
  buildDiscogsArtistSearchUrl,
  buildDiscogsSearchUrl,
  mapDiscogsRelease,
  matchesDiscogsArtist,
} from "./discogs"

describe("buildDiscogsSearchUrl", () => {
  it("searches by artist alone", () => {
    const url = new URL(buildDiscogsSearchUrl({ artist: "Radiohead", album: "", format: "" }))

    expect(url.searchParams.get("artist")).toBe("Radiohead")
    expect(url.searchParams.has("release_title")).toBe(false)
    expect(url.searchParams.get("type")).toBe("release")
    expect(url.searchParams.has("sort")).toBe(false)
  })

  it("searches by album and format without requiring an artist", () => {
    const url = new URL(buildDiscogsSearchUrl({ artist: "", album: "Blue", format: "LP" }))

    expect(url.searchParams.get("release_title")).toBe("Blue")
    expect(url.searchParams.get("format")).toBe("LP")
    expect(url.searchParams.has("artist")).toBe(false)
  })

  it("combines artist, album, format, and an optional token", () => {
    const url = new URL(buildDiscogsSearchUrl(
      { artist: " Bjork ", album: " Debut ", format: " Vinyl " },
      "test-token"
    ))

    expect(url.searchParams.get("artist")).toBe("Bjork")
    expect(url.searchParams.get("release_title")).toBe("Debut")
    expect(url.searchParams.get("format")).toBe("Vinyl")
    expect(url.searchParams.get("token")).toBe("test-token")
  })

  it("supports pagination without overriding Discogs relevance order", () => {
    const url = new URL(buildDiscogsSearchUrl(
      { artist: "Nirvana", album: "", format: "" },
      undefined,
      2
    ))

    expect(url.searchParams.get("page")).toBe("2")
    expect(url.searchParams.has("sort_order")).toBe(false)
  })
})

describe("buildDiscogsArtistSearchUrl", () => {
  it("searches Discogs artist entities for explicit selection", () => {
    const url = new URL(buildDiscogsArtistSearchUrl("Nirvana"))

    expect(url.searchParams.get("type")).toBe("artist")
    expect(url.searchParams.get("q")).toBe("Nirvana")
  })
})

describe("matchesDiscogsArtist", () => {
  it("accepts the selected artist and excludes homonyms", () => {
    expect(matchesDiscogsArtist("Nirvana - In Utero", "Nirvana")).toBe(true)
    expect(matchesDiscogsArtist("Nirvana (2) - Pentecost Hotel", "Nirvana")).toBe(false)
  })

  it("matches the canonical artist before an alternate name", () => {
    expect(matchesDiscogsArtist("Nirvana = \u8d85\u8131\u5408\u5531\u5718* - Nevermind", "Nirvana")).toBe(true)
  })
})

describe("mapDiscogsRelease", () => {
  it("separates artist and album from a Discogs result title", () => {
    expect(mapDiscogsRelease({ id: 12, title: "Radiohead - Kid A", year: 2000 }, "")).toMatchObject({
      artist: "Radiohead",
      album: "Kid A",
      year: "2000",
    })
  })

  it("normalizes a list of formats and uses the entered artist as fallback", () => {
    expect(mapDiscogsRelease({
      id: 34,
      title: "Album title",
      format: ["Vinyl", "LP"],
      thumb: "cover.jpg",
    }, "Artist name")).toMatchObject({
      artist: "Artist name",
      album: "Album title",
      formats: ["Vinyl", "LP"],
      coverUrl: "cover.jpg",
    })
  })
})