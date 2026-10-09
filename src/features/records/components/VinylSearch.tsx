import { useEffect, useState } from "react"
import type { VinylRecord } from "../types/record"
import { colors } from "../../../theme"
import {
  buildDiscogsArtistSearchUrl,
  buildDiscogsSearchUrl,
  mapDiscogsRelease,
  matchesDiscogsArtist,
} from "../utils/discogs"
import type { DiscogsArtistSuggestion, DiscogsReleaseResult, Release } from "../utils/discogs"

interface VinylSearchProps {
  onAdd: (record: Omit<VinylRecord, "id" | "favorite" | "status">) => boolean | void | Promise<boolean | void>
  isMobile?: boolean
}

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN
const releaseCache = new Map<string, { releases: Release[]; nextPage: number | null }>()
const formatOptions = ["Vinyl", "LP", '12"', '7"', "CD", "Cassette"]

export default function VinylSearch({ onAdd, isMobile = false }: VinylSearchProps) {
  const [artistQuery, setArtistQuery] = useState("")
  const [selectedArtist, setSelectedArtist] = useState<DiscogsArtistSuggestion | null>(null)
  const [artistSuggestions, setArtistSuggestions] = useState<DiscogsArtistSuggestion[]>([])
  const [loadingArtists, setLoadingArtists] = useState(false)
  const [albumQuery, setAlbumQuery] = useState("")
  const [format, setFormat] = useState("")
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const query = artistQuery.trim()
    const isSelected = selectedArtist?.title.toLowerCase() === query.toLowerCase()
    const controller = new AbortController()

    if (query.length < 2 || isSelected) {
      setArtistSuggestions([])
      setLoadingArtists(false)
      return () => controller.abort()
    }

    setArtistSuggestions([])
    setLoadingArtists(true)
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(buildDiscogsArtistSearchUrl(query, DISCOGS_TOKEN), {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Discogs artist search failed")

        const data = await response.json() as {
          results?: DiscogsArtistSuggestion[]
        }
        setArtistSuggestions(data.results ?? [])
      } catch {
        if (!controller.signal.aborted) setArtistSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLoadingArtists(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [artistQuery, selectedArtist])

  useEffect(() => {
    const artist = selectedArtist?.title ?? ""
    const album = albumQuery.trim()
    const canSearch = Boolean(selectedArtist) || (!artistQuery.trim() && album.length >= 2)
    const controller = new AbortController()

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
    setReleases([])
    setNextPage(null)
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(buildDiscogsSearchUrl({ artist, album, format }, DISCOGS_TOKEN), {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Discogs search failed")

        const data = await response.json() as {
          results?: DiscogsReleaseResult[]
          pagination?: { page: number; pages: number }
        }
        const matchingResults = (data.results ?? []).filter((release) =>
          !selectedArtist || matchesDiscogsArtist(release.title, selectedArtist.title)
        )
        const results = matchingResults.map((release) => mapDiscogsRelease(release, artist))
        const followingPage = data.pagination && data.pagination.page < data.pagination.pages
          ? data.pagination.page + 1
          : null

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
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [artistQuery, selectedArtist, albumQuery, format])

  async function loadMore() {
    if (nextPage === null || loadingMore) return
    const page = nextPage
    const artist = selectedArtist?.title ?? ""
    const album = albumQuery.trim()
    setLoadingMore(true)
    setError("")

    try {
      const response = await fetch(buildDiscogsSearchUrl({ artist, album, format }, DISCOGS_TOKEN, page))
      if (!response.ok) throw new Error("Discogs search failed")

      const data = await response.json() as {
        results?: DiscogsReleaseResult[]
        pagination?: { page: number; pages: number }
      }
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
      setError("Could not load more releases. Please try again.")
    } finally {
      setLoadingMore(false)
    }
  }

  async function selectRelease(release: Release) {
    setAddingId(release.id)
    setError("")
    let genre = ""
    let coverUrl = release.coverUrl

    try {
      const params = new URLSearchParams()
      if (DISCOGS_TOKEN) params.set("token", DISCOGS_TOKEN)
      const query = params.size ? `?${params}` : ""
      const response = await fetch(`https://api.discogs.com/releases/${release.id}${query}`)
      if (response.ok) {
        const details = await response.json() as {
          genres?: string[]
          styles?: string[]
          images?: { uri?: string }[]
        }
        const primaryGenre = details.genres?.[0] ?? ""
        const primaryStyle = details.styles?.[0] ?? ""
        genre = primaryStyle ? `${primaryGenre} / ${primaryStyle}` : primaryGenre
        coverUrl = details.images?.[0]?.uri || coverUrl
      }
    } catch {
      // The search result still contains enough information to add the release.
    }

    try {
      const added = await onAdd({
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
      setError("Could not add this release. Please try again.")
    } finally {
      setAddingId(null)
    }
  }

  const waitingForArtistSelection = artistQuery.trim().length >= 2 && !selectedArtist
  const canSearch = Boolean(selectedArtist) || (!artistQuery.trim() && albumQuery.trim().length >= 2)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: 0 }}>
      <div style={{ position: "relative" }}>
        <label style={fieldStyle}>
          <span>Artist</span>
          <input
            placeholder="Search by artist..."
            value={artistQuery}
            onChange={(event) => {
              setSelectedArtist(null)
              setArtistQuery(event.target.value)
            }}
            style={inputStyle}
            autoComplete="off"
          />
        </label>
        {loadingArtists && <p style={messageStyle}>Searching artists...</p>}
        {artistSuggestions.length > 0 && (
          <div role="listbox" aria-label="Discogs artists" style={artistSuggestionsStyle}>
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
          style={inputStyle}
          autoComplete="off"
        />
      </label>

      <label style={fieldStyle}>
        <span>Format</span>
        <select value={format} onChange={(event) => setFormat(event.target.value)} style={inputStyle}>
          <option value="">All formats</option>
          {formatOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>

      {waitingForArtistSelection && !loadingArtists && artistSuggestions.length === 0 && (
        <p style={messageStyle}>No artists found. Try another name or search by album only.</p>
      )}
      {waitingForArtistSelection && artistSuggestions.length > 0 && (
        <p style={messageStyle}>Select the matching artist to exclude Discogs homonyms.</p>
      )}
      {!canSearch && !waitingForArtistSelection && (
        <p style={messageStyle}>Enter at least 2 characters in Artist or Album.</p>
      )}
      {loading && <p style={messageStyle}>Searching Discogs...</p>}
      {error && <p role="alert" style={errorStyle}>{error}</p>}
      {canSearch && !loading && !error && releases.length === 0 && (
        <p style={messageStyle}>No releases found. Try changing your search.</p>
      )}

      {releases.length > 0 && (
        <div
          aria-label="Search results"
          style={{ ...resultsStyle, maxHeight: isMobile ? "calc(100dvh - 390px)" : "260px" }}
        >
          {releases.map((release) => (
            <button
              key={release.id}
              type="button"
              disabled={addingId !== null}
              onClick={() => selectRelease(release)}
              style={{ ...releaseItemStyle, opacity: addingId === release.id ? 0.6 : 1 }}
            >
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
              {addingId === release.id && <span style={messageStyle}>Adding...</span>}
            </button>
          ))}
        </div>
      )}
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
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "9px",
  textAlign: "left" as const,
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  cursor: "pointer",
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
  maxHeight: "220px",
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