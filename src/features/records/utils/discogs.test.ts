import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildDiscogsArtistSearchUrl,
  buildDiscogsSearchUrl,
  mapDiscogsRelease,
  matchesDiscogsArtist,
  fetchDiscogsReleaseDetails,
  fetchRecordDetails,
} from "./discogs"

describe("fetchRecordDetails", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("uses the saved edition without any name search", async () => {
    const details = { tracklist: [{ title: "Edition-specific bonus" }] }
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(details)))
    vi.stubGlobal("fetch", request)
    expect(await fetchRecordDetails({ artist: "Justice", album: "Cross", discogs_release_id: 321 })).toEqual(details)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith("https://api.discogs.com/releases/321", { signal: undefined })
  })

  it("never replaces a failed exact edition with another edition", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{}", { status: 404 }))
    vi.stubGlobal("fetch", request)
    await expect(fetchRecordDetails({ artist: "Justice", album: "Cross", discogs_release_id: 321 })).rejects.toThrow("404")
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("searches legacy records then loads the returned release", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ id: 456 }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tracklist: [{ title: "Genesis" }] })))
    vi.stubGlobal("fetch", request)
    const controller = new AbortController()
    const details = await fetchRecordDetails({ artist: "Justice (3)", album: "Cross", discogs_release_id: null }, undefined, controller.signal)
    expect(details.tracklist?.[0].title).toBe("Genesis")
    const url = new URL(request.mock.calls[0][0])
    expect(url.searchParams.get("artist")).toBe("Justice")
    expect(url.searchParams.get("release_title")).toBe("Cross")
    expect(request).toHaveBeenLastCalledWith("https://api.discogs.com/releases/456", { signal: controller.signal })
  })

  it("retains the master fallback for legacy records", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ id: 789 }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tracklist: [{ title: "Master track" }] })))
    vi.stubGlobal("fetch", request)
    const result = await fetchRecordDetails({ artist: "Artist", album: "Album" })
    expect(result.tracklist?.[0].title).toBe("Master track")
    const masterSearch = new URL(request.mock.calls[1][0])
    expect(masterSearch.searchParams.get("type")).toBe("master")
    expect(masterSearch.searchParams.has("format")).toBe(false)
    expect(request).toHaveBeenLastCalledWith("https://api.discogs.com/masters/789", { signal: undefined })
  })

  it("returns no tracks only when successful searches found nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response('{"results":[]}'))))
    expect(await fetchRecordDetails({ artist: "Artist", album: "Album" })).toEqual({})
  })

  it("surfaces legacy search errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })))
    await expect(fetchRecordDetails({ artist: "Artist", album: "Album" })).rejects.toThrow("429")
  })
})

describe("fetchDiscogsReleaseDetails", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("loads the exact edition with its tracklist and forwards cancellation", async () => {
    const details = { tracklist: [{ position: "A1", title: "Genesis", duration: "3:54" }] }
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(details)))
    vi.stubGlobal("fetch", request)
    const controller = new AbortController()

    expect(await fetchDiscogsReleaseDetails(123, "test-token", controller.signal)).toEqual(details)
    expect(request).toHaveBeenCalledWith(
      "https://api.discogs.com/releases/123?token=test-token",
      { signal: controller.signal }
    )
  })

  it("does not send an undefined token and supports missing tracks", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{}"))
    vi.stubGlobal("fetch", request)

    expect(await fetchDiscogsReleaseDetails(456)).toEqual({})
    expect(request).toHaveBeenCalledWith("https://api.discogs.com/releases/456", { signal: undefined })
  })

  it("reports HTTP failures instead of treating them as empty tracklists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })))
    await expect(fetchDiscogsReleaseDetails(123)).rejects.toThrow("429")
  })

  it("propagates network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")))
    await expect(fetchDiscogsReleaseDetails(123)).rejects.toThrow("Network failure")
  })
})

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

  it.each([1, 2])("searches Justice (3) by its credited name on page %i", (page) => {
    const url = new URL(buildDiscogsSearchUrl(
      { artist: " Justice (3) ", album: " Cross ", format: " Vinyl " },
      undefined,
      page
    ))

    expect(url.searchParams.get("artist")).toBe("Justice")
    expect(url.searchParams.get("release_title")).toBe("Cross")
    expect(url.searchParams.get("format")).toBe("Vinyl")
    expect(url.searchParams.get("page")).toBe(String(page))
  })

  it("preserves parentheses that are part of an artist name", () => {
    const url = new URL(buildDiscogsSearchUrl({ artist: "Sunn O)))", album: "", format: "" }))

    expect(url.searchParams.get("artist")).toBe("Sunn O)))")
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
  it("accepts Justice releases without the artist disambiguation suffix", () => {
    expect(matchesDiscogsArtist("Justice - Cross", "Justice (3)")).toBe(true)
    expect(matchesDiscogsArtist("Justice (3) - Cross", "Justice (3)")).toBe(true)
    expect(matchesDiscogsArtist("Justice* - Cross", "Justice (3)")).toBe(true)
    expect(matchesDiscogsArtist("Justice (2) - Other album", "Justice (3)")).toBe(false)
    expect(matchesDiscogsArtist("Justice Crew - Other album", "Justice (3)")).toBe(false)
  })

  it("handles alternate names and casing for a numbered artist", () => {
    expect(matchesDiscogsArtist("JUSTICE = Alternate Name* - Cross", " Justice (3) ")).toBe(true)
    expect(matchesDiscogsArtist("Album without artist", "Justice (3)")).toBe(false)
  })

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