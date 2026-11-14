import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Check, ListMusic, Plus } from "lucide-react"
import Tracklist from "./Tracklist"
import type { VinylRecord } from "../types/record"
import { colors } from "../../../theme"
import {
  buildDiscogsArtistSearchUrl,
  buildDiscogsSearchUrl,
  fetchDiscogsReleaseDetails,
  mapDiscogsRelease,
  matchesDiscogsArtist,
} from "../utils/discogs"
import type { DiscogsArtistSuggestion, DiscogsReleaseDetails, DiscogsReleaseResult, Release } from "../utils/discogs"
import {
  GOOD_MATCH,
  bestScore,
  buildScanSearchPlan,
  mergeReleases,
  primaryArtist,
  rankReleases,
} from "../utils/scanSearch"

interface VinylSearchProps {
  onAdd: (record: Omit<VinylRecord, "id" | "favorite" | "status">) => boolean | void | Promise<boolean | void>
  isMobile?: boolean
  initialArtist?: string
  initialAlbum?: string
  // Romanized names from a scan, tried when the original text finds nothing on Discogs.
  alternates?: { artist: string; album: string }
}

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN
const releaseCache = new Map<string, { releases: Release[]; nextPage: number | null }>()
const formatOptions = ["Vinyl", "LP", '12"', '7"', "CD", "Cassette"]

const tracklistCache = new Map<number, DiscogsReleaseDetails["tracklist"]>()

function ReleaseTracks({ releaseId }: { releaseId: number }) {
  const [tracks, setTracks] = useState(() => tracklistCache.get(releaseId))
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (tracklistCache.has(releaseId)) {
      setTracks(tracklistCache.get(releaseId))
      return
    }
    const controller = new AbortController()
    setTracks(undefined)
    setError(false)
    fetchDiscogsReleaseDetails(releaseId, DISCOGS_TOKEN, controller.signal)
      .then((details) => {
        if (controller.signal.aborted) return
        tracklistCache.set(releaseId, details.tracklist ?? [])
        setTracks(details.tracklist ?? [])
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
    return () => controller.abort()
  }, [releaseId, attempt])

  if (error) {
    return (
      <div role="alert">
        <p style={errorStyle}>Could not load the tracklist.</p>
        <button type="button" onClick={() => setAttempt((current) => current + 1)}>Retry</button>
      </div>
    )
  }
  if (!tracks) return <p role="status" style={messageStyle}>Loading tracklist...</p>
  if (tracks.length === 0) return <p style={messageStyle}>No tracklist found</p>
  return <Tracklist tracks={tracks} />
}

export default function VinylSearch({ onAdd, isMobile = false, initialArtist = "", initialAlbum = "", alternates }: VinylSearchProps) {
  const artistFieldRef = useRef<HTMLDivElement>(null)
  const releaseSearchRef = useRef<AbortController | null>(null)
  // A search coming from a scan starts immediately; typing keeps its debounce.
  const firstSearchRef = useRef(Boolean(initialArtist || initialAlbum))
  const [artistQuery, setArtistQuery] = useState(initialArtist)
  // A prefilled artist (from a scan) should not open the suggestion list over the results.
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(!initialArtist)
  const [selectedArtist, setSelectedArtist] = useState<DiscogsArtistSuggestion | null>(null)
  const [artistSuggestions, setArtistSuggestions] = useState<DiscogsArtistSuggestion[]>([])
  const [artistSuggestionsMaxHeight, setArtistSuggestionsMaxHeight] = useState(220)
  const [loadingArtists, setLoadingArtists] = useState(false)
  const [artistSearchError, setArtistSearchError] = useState("")
  const [albumQuery, setAlbumQuery] = useState(initialAlbum)
  const [format, setFormat] = useState("")
  const [fallbackNote, setFallbackNote] = useState("")
  const [triedSearches, setTriedSearches] = useState<string[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addError, setAddError] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [error, setError] = useState("")

  useLayoutEffect(() => {
    if (artistSuggestions.length === 0) return

    function updateMaxHeight() {
      const fieldBottom = artistFieldRef.current?.getBoundingClientRect().bottom
      if (fieldBottom === undefined) return

      const viewport = window.visualViewport
      const viewportBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight
      const bottomInset = isMobile ? 28 : 8
      setArtistSuggestionsMaxHeight(Math.max(0, Math.floor(viewportBottom - fieldBottom - bottomInset)))
    }

    updateMaxHeight()
    window.addEventListener("resize", updateMaxHeight)
    window.addEventListener("scroll", updateMaxHeight, true)
    window.visualViewport?.addEventListener("resize", updateMaxHeight)
    window.visualViewport?.addEventListener("scroll", updateMaxHeight)

    return () => {
      window.removeEventListener("resize", updateMaxHeight)
      window.removeEventListener("scroll", updateMaxHeight, true)
      window.visualViewport?.removeEventListener("resize", updateMaxHeight)
      window.visualViewport?.removeEventListener("scroll", updateMaxHeight)
    }
  }, [artistSuggestions.length, isMobile])

  useEffect(() => {
    const query = artistQuery.trim()
    const isSelected = selectedArtist?.title.toLowerCase() === query.toLowerCase()
    const controller = new AbortController()

    if (query.length < 2 || isSelected || !suggestionsEnabled) {
      setArtistSuggestions([])
      setLoadingArtists(false)
      setArtistSearchError("")
      return () => controller.abort()
    }

    setArtistSuggestions([])
    setLoadingArtists(true)
    setArtistSearchError("")
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(buildDiscogsArtistSearchUrl(query, DISCOGS_TOKEN), {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Discogs artist search failed")

        const data = await response.json() as {
          results?: DiscogsArtistSuggestion[]
        }
        if (controller.signal.aborted) return
        setArtistSuggestions(data.results ?? [])
      } catch {
        if (!controller.signal.aborted) {
          setArtistSuggestions([])
          setArtistSearchError("Could not search artists. Check your connection and try again.")
        }
      } finally {
        if (!controller.signal.aborted) setLoadingArtists(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [artistQuery, selectedArtist, suggestionsEnabled])

  useEffect(() => {
    const artist = selectedArtist?.title ?? artistQuery.trim()
    const album = albumQuery.trim()
    const canSearch = artist.length >= 2 || album.length >= 2
    const controller = new AbortController()
    releaseSearchRef.current = controller
    setLoadingMore(false)

    if (!canSearch) {
      setReleases([])
      setNextPage(null)
      setError("")
      setLoading(false)
      return () => controller.abort()
    }

    const cacheKey = JSON.stringify([selectedArtist?.id ?? null, artist.toLowerCase(), album.toLowerCase(), format])
    const cached = releaseCache.get(cacheKey)
    if (cached) {
      setReleases(cached.releases)
      setNextPage(cached.nextPage)
      setError("")
      setLoading(false)
      return () => controller.abort()
    }

    setLoading(true)
    setError("")
    setFallbackNote("")
    setTriedSearches([])
    setReleases([])
    setNextPage(null)
    const delay = firstSearchRef.current ? 0 : 350
    const timeout = setTimeout(async () => {
      firstSearchRef.current = false
      const fetchPage = async (url: string) => {
        let response = await fetch(url, { signal: controller.signal })
        // Discogs rate-limits per minute: wait briefly once instead of failing the whole search.
        if (response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 2500))
          if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError")
          response = await fetch(url, { signal: controller.signal })
        }
        if (!response.ok) throw Object.assign(new Error("Discogs search failed"), { status: response.status })
        return await response.json() as {
          results?: DiscogsReleaseResult[]
          pagination?: { page: number; pages: number }
        }
      }
      try {
        const data = await fetchPage(buildDiscogsSearchUrl({ artist, album, format }, DISCOGS_TOKEN))
        if (controller.signal.aborted) return
        const matchingResults = (data.results ?? []).filter((release) =>
          !selectedArtist || matchesDiscogsArtist(release.title, selectedArtist.title)
        )
        const results = matchingResults.map((release) => mapDiscogsRelease(release, artist))
        const followingPage = data.pagination && data.pagination.page < data.pagination.pages
          ? data.pagination.page + 1
          : null

        // Text read from a cover (often in another script) rarely matches Discogs exactly: rank what was found
        // by similarity and, if nothing is convincing, widen the search step by step.
        const fromScan = Boolean(initialArtist || initialAlbum)
        const untouched = artistQuery === initialArtist && albumQuery === initialAlbum
        if (fromScan && untouched && !selectedArtist) {
          const target = { artist, album, altArtist: alternates?.artist, altAlbum: alternates?.album }
          let pool = results
          let best = bestScore(pool, target)
          let widenedWith = ""
          const tried: string[] = []
          let failures = 0
          if (best < GOOD_MATCH) {
            for (const attempt of buildScanSearchPlan(target, format, DISCOGS_TOKEN)) {
              // A failing widening query (for example Discogs rate limiting) must not discard what was already found.
              let more: Awaited<ReturnType<typeof fetchPage>>
              try {
                more = await fetchPage(attempt.url)
              } catch (error) {
                if (controller.signal.aborted) return
                failures++
                if (failures >= 2 || (error as { status?: number }).status === 429) break
                continue
              }
              if (controller.signal.aborted) return
              const found = (more.results ?? []).map((release) => mapDiscogsRelease(release, primaryArtist(artist)))
              tried.push(attempt.label)
              const attemptBest = bestScore(found, target)
              pool = mergeReleases(pool, found)
              if (attemptBest > best) {
                best = attemptBest
                widenedWith = attempt.label
              }
              if (best >= GOOD_MATCH) break
            }
          }
          if (pool.length === 0) {
            setTriedSearches(tried)
            setReleases([])
            if (failures > 0) setError("Discogs did not answer every request (it limits how fast you can search). Wait a few seconds and try again.")
            return
          }
          if (widenedWith) setFallbackNote(`No exact match for the text on the cover. Closest matches, found with "${widenedWith}".`)
          setReleases(rankReleases(pool, target).slice(0, 20))
          setNextPage(widenedWith ? null : followingPage)
          return
        }

        releaseCache.set(cacheKey, { releases: results, nextPage: followingPage })
        setReleases(results)
        setNextPage(followingPage)
      } catch {
        if (!controller.signal.aborted) {
          setReleases([])
          setError("Search failed. Please try again.")
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, delay)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [artistQuery, selectedArtist, albumQuery, format])

  async function loadMore() {
    const controller = releaseSearchRef.current
    if (nextPage === null || loadingMore || !controller || controller.signal.aborted) return
    const page = nextPage
    const artist = selectedArtist?.title ?? artistQuery.trim()
    const album = albumQuery.trim()
    setLoadingMore(true)
    setError("")

    try {
      const response = await fetch(buildDiscogsSearchUrl({ artist, album, format }, DISCOGS_TOKEN, page), {
        signal: controller.signal,
      })
      if (!response.ok) throw new Error("Discogs search failed")

      const data = await response.json() as {
        results?: DiscogsReleaseResult[]
        pagination?: { page: number; pages: number }
      }
      if (controller.signal.aborted) return
      const matchingResults = (data.results ?? []).filter((release) =>
        !selectedArtist || matchesDiscogsArtist(release.title, selectedArtist.title)
      )
      const moreReleases = matchingResults.map((release) => mapDiscogsRelease(release, artist))
      setReleases((current) => {
        const existingIds = new Set(current.map((release) => release.id))
        return [...current, ...moreReleases.filter((release) => !existingIds.has(release.id))]
      })
      setNextPage(data.pagination && data.pagination.page < data.pagination.pages
        ? data.pagination.page + 1
        : null)
    } catch {
      if (!controller.signal.aborted) setError("Could not load more releases. Please try again.")
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }

  async function addRelease(release: Release) {
    setAddingId(release.id)
    setAddError("")
    let details: DiscogsReleaseDetails | null = null
    try {
      details = await fetchDiscogsReleaseDetails(release.id, DISCOGS_TOKEN)
    } catch {
      // Genre and cover fall back to the search result when details are unavailable.
    }
    await selectRelease(release, details)
  }

  async function selectRelease(release: Release, details: DiscogsReleaseDetails | null) {
    setAddingId(release.id)
    setAddError("")
    const primaryGenre = details?.genres?.[0] ?? ""
    const primaryStyle = details?.styles?.[0] ?? ""
    const genre = primaryStyle ? `${primaryGenre} / ${primaryStyle}` : primaryGenre
    const coverUrl = details?.images?.[0]?.uri || release.coverUrl

    try {
      const added = await onAdd({
        discogs_release_id: release.id,
        artist: release.artist,
        album: release.album,
        year: release.year,
        genre,
        cover_url: coverUrl,
      })
      if (added === false) throw new Error("Could not add this release")
      setArtistQuery("")
      setSelectedArtist(null)
      setAlbumQuery("")
      setFormat("")
      setReleases([])
      setNextPage(null)
    } catch {
      setAddError("Could not add this release. Please try again.")
    } finally {
      setAddingId(null)
    }
  }

  const hasArtistQuery = artistQuery.trim().length >= 2 && !selectedArtist
  const canSearch = artistQuery.trim().length >= 2 || albumQuery.trim().length >= 2

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: 0, flex: 1 }}>
      <div ref={artistFieldRef} style={{ position: "relative" }}>
        <label style={fieldStyle}>
          <span>Artist</span>
          <input
            placeholder="Search by artist..."
            value={artistQuery}
            onChange={(event) => {
              setSuggestionsEnabled(true)
              setSelectedArtist(null)
              setArtistQuery(event.target.value)
            }}
            style={isMobile ? mobileInputStyle : inputStyle}
            autoComplete="off"
          />
        </label>
        {loadingArtists && <p style={messageStyle}>Searching artists...</p>}
        {artistSearchError && <p role="alert" style={errorStyle}>{artistSearchError}</p>}
        {artistSuggestions.length > 0 && (
          <div
            role="listbox"
            aria-label="Discogs artists"
            style={{ ...artistSuggestionsStyle, maxHeight: `${artistSuggestionsMaxHeight}px` }}
          >
            {artistSuggestions.map((artist) => (
              <button
                key={artist.id}
                type="button"
                role="option"
                aria-selected={selectedArtist?.id === artist.id}
                onClick={() => {
                  setSelectedArtist(artist)
                  setArtistQuery(artist.title)
                  setArtistSuggestions([])
                }}
                style={artistSuggestionStyle}
              >
                {artist.thumb && <img src={artist.thumb} alt="" style={artistThumbStyle} />}
                <span>{artist.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <label style={fieldStyle}>
        <span>Album</span>
        <input
          placeholder="Search by album..."
          value={albumQuery}
          onChange={(event) => setAlbumQuery(event.target.value)}
          style={isMobile ? mobileInputStyle : inputStyle}
          autoComplete="off"
        />
      </label>

      <label style={fieldStyle}>
        <span>Format</span>
        <select value={format} onChange={(event) => setFormat(event.target.value)} style={isMobile ? mobileInputStyle : inputStyle}>
          <option value="">All formats</option>
          {formatOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>

      {hasArtistQuery && !loadingArtists && !artistSearchError && artistSuggestions.length === 0 && (
        <p style={messageStyle}>No artist suggestions found. You can still search by artist and album.</p>
      )}
      {hasArtistQuery && artistSuggestions.length > 0 && (
        <p style={messageStyle}>You can select an artist to refine results, or keep searching by artist and album.</p>
      )}
      {!canSearch && (
        <p style={messageStyle}>Enter at least 2 characters in Artist or Album.</p>
      )}
      {loading && <p style={messageStyle}>Searching Discogs...</p>}
      {fallbackNote && releases.length > 0 && <p role="status" style={messageStyle}>{fallbackNote}</p>}
      {error && <p role="alert" style={errorStyle}>{error}</p>}
      {canSearch && !loading && !error && releases.length === 0 && (
        <p style={messageStyle}>No releases found. Try changing your search.</p>
      )}
      {canSearch && !loading && !error && releases.length === 0 && triedSearches.length > 0 && (
        <p role="status" style={messageStyle}>Also tried: {triedSearches.map((search) => `"${search}"`).join(", ")}.</p>
      )}
      {canSearch && !loading && !error && releases.length === 0 && Boolean(initialArtist || initialAlbum) && !alternates && (
        <p role="status" style={messageStyle}>The scan did not provide a romanized name for this record.</p>
      )}

      {releases.length > 0 && (
        <div
          aria-label="Search results"
          style={{ ...resultsStyle, flex: "1 1 0", minHeight: "140px" }}
        >
          {releases.map((release, index) => (
            <div key={release.id} style={{ ...releaseItemStyle, borderColor: index === 0 ? colors.accent : colors.border }}>
              <div style={releaseRowStyle}>
                {release.coverUrl ? (
                  <img src={release.coverUrl} alt="" style={coverStyle} />
                ) : (
                  <span style={coverPlaceholderStyle} aria-hidden="true">♪</span>
                )}
                <span style={releaseInfoStyle}>
                  <strong style={albumStyle}>{release.album}</strong>
                  <span style={artistStyle}>{release.artist}</span>
                  <span style={formatStyle}>
                    {[release.year, ...release.formats].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {index === 0 && <Check size={18} color={colors.accent} aria-label="Best match" role="img" style={{ flexShrink: 0 }} />}
                <button
                  type="button"
                  aria-label={`${expandedId === release.id ? "Hide" : "Show"} tracks of ${release.album}`}
                  aria-expanded={expandedId === release.id}
                  title="Tracklist"
                  onClick={() => setExpandedId((current) => current === release.id ? null : release.id)}
                  style={tracksButtonStyle}
                >
                  <ListMusic size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Add ${release.album} by ${release.artist}`}
                  title="Add to my records"
                  disabled={addingId !== null}
                  onClick={() => { void addRelease(release) }}
                  style={addButtonStyle}
                >
                  {addingId === release.id ? "…" : <Plus size={18} aria-hidden="true" />}
                </button>
              </div>
              {expandedId === release.id && (
                <div style={tracksPanelStyle}>
                  <ReleaseTracks releaseId={release.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {addError && <p role="alert" style={errorStyle}>{addError}</p>}
      {nextPage !== null && (
        <button type="button" onClick={loadMore} disabled={loadingMore} style={loadMoreStyle}>
          {loadingMore ? "Loading more..." : "Load more releases"}
        </button>
      )}
    </div>
  )
}

const fieldStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "5px",
  color: colors.textSecondary,
  fontSize: "12px",
}

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.border}`,
  background: colors.card,
  color: colors.textPrimary,
  fontSize: "14px",
  boxSizing: "border-box" as const,
}

const mobileInputStyle = { ...inputStyle, fontSize: "16px" }

const messageStyle = {
  color: colors.textTertiary,
  fontSize: "12px",
  margin: "2px 0",
}

const errorStyle = {
  color: colors.danger,
  fontSize: "12px",
  margin: "2px 0",
}

const resultsStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
  overflowY: "auto" as const,
}

const releaseItemStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "9px",
  textAlign: "left" as const,
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
}

const releaseRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
}

const addButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "36px",
  height: "36px",
  border: "none",
  borderRadius: "50%",
  background: colors.accent,
  color: "#fff",
  cursor: "pointer",
}

const tracksButtonStyle = {
  ...addButtonStyle,
  background: "transparent",
  border: `1px solid ${colors.border}`,
  color: colors.textSecondary,
}

const tracksPanelStyle = {
  marginTop: "8px",
  maxHeight: "240px",
  overflowY: "auto" as const,
}

const coverStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "4px",
  objectFit: "cover" as const,
  flexShrink: 0,
}

const coverPlaceholderStyle = {
  ...coverStyle,
  display: "grid",
  placeItems: "center",
  background: colors.cover,
  color: colors.textMuted,
  fontSize: "20px",
}

const releaseInfoStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "2px",
  minWidth: 0,
  flex: 1,
}

const albumStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  color: colors.textPrimary,
  fontSize: "13px",
}

const artistStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  color: colors.textSecondary,
  fontSize: "12px",
}

const formatStyle = {
  color: colors.textTertiary,
  fontSize: "10px",
}

const artistSuggestionsStyle = {
  position: "absolute" as const,
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 20,
  overflowY: "auto" as const,
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  boxShadow: "0 8px 20px rgba(58,46,34,0.12)",
}

const artistSuggestionStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 12px",
  border: "none",
  borderBottom: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textPrimary,
  textAlign: "left" as const,
  cursor: "pointer",
}

const artistThumbStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  objectFit: "cover" as const,
}

const loadMoreStyle = {
  padding: "9px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  background: colors.card,
  color: colors.textPrimary,
  cursor: "pointer",
}
