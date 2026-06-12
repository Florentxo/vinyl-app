import { useState, useEffect, useRef } from "react"
import type { VinylRecord } from "../types/record"



interface Artist {
  id: number
  name: string
  thumb?: string
}

interface Release {
  id: number
  title: string
  year?: string
  genre?: string
  style?: string
  cover_url?: string
  master_id?: number
  format?: string
}

interface VinylSearchProps {
  onAdd: (record: Omit<VinylRecord, "id" | "favorite" | "status">) => void
  isMobile?: boolean
}

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN
const releaseCache = new Map<number, Release[]>()

export default function VinylSearch({ onAdd, isMobile = false }: VinylSearchProps) {
  const [step, setStep] = useState<"artist" | "album">("artist")
  const [artistQuery, setArtistQuery] = useState("")
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [loadingArtists, setLoadingArtists] = useState(false)
  const [loadingReleases, setLoadingReleases] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  

  // =================================================
  // SEARCH ARTISTS
  // =================================================

  useEffect(() => {
    if (artistQuery.length < 2) {
      setArtists([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoadingArtists(true)
      try {
        const res = await fetch(
          `https://api.discogs.com/database/search?q=${encodeURIComponent(artistQuery)}&type=artist&per_page=10&token=${DISCOGS_TOKEN}`
        )
        const data = await res.json()
        const results: Artist[] = data.results?.map((a: any) => ({
          id: a.id,
          name: a.title,
          thumb: a.thumb || "",
        })) ?? []

        results.sort((a, b) => a.name.localeCompare(b.name))
        setArtists(results)
      } catch {
        setArtists([])
      }
      setLoadingArtists(false)
    }, 200)
  }, [artistQuery])

  // =================================================
  // FETCH RELEASES
  // =================================================

  async function fetchReleases(artist: Artist) {
    setSelectedArtist(artist)
    setStep("album")

    if (releaseCache.has(artist.id)) {
      setReleases(releaseCache.get(artist.id)!)
      return
    }

    setLoadingReleases(true)
    try {
      const res = await fetch(
        `https://api.discogs.com/artists/${artist.id}/releases?sort=year&sort_order=asc&per_page=100&token=${DISCOGS_TOKEN}`
      )
      const data = await res.json()

      const results: Release[] = (data.releases ?? [])
        .filter((r: any) => r.type === "master" && r.role === "Main")
        .map((r: any) => ({
          id: r.id,
          master_id: r.id,
          title: r.title,
          year: r.year?.toString(),
          cover_url: r.thumb || "",
          format: r.format || "",
        }))

      results.sort((a, b) => (a.year ?? "").localeCompare(b.year ?? ""))
      releaseCache.set(artist.id, results)
      setReleases(results)
    } catch {
      setReleases([])
    }
    setLoadingReleases(false)
  }

  // =================================================
  // SELECT ALBUM
  // =================================================

  async function selectAlbum(release: Release) {
    let genre = ""
    let style = ""
    let cover_url = release.cover_url || ""

    try {
      const endpoint = release.master_id
        ? `https://api.discogs.com/masters/${release.master_id}`
        : `https://api.discogs.com/releases/${release.id}`

      const res = await fetch(`${endpoint}?token=${DISCOGS_TOKEN}`)
      const data = await res.json()

      genre = data.genres?.[0] ?? ""
      style = data.styles?.[0] ?? ""
      if (data.images?.[0]?.uri) cover_url = data.images[0].uri
    } catch {
      // keep defaults
    }

    onAdd({
      artist: selectedArtist!.name,
      album: release.title,
      year: release.year ?? "",
      genre: style ? `${genre} / ${style}` : genre,
      cover_url,
    })

    reset()
  }

  // =================================================
  // RESET
  // =================================================

  function reset() {
    setStep("artist")
    setArtistQuery("")
    setArtists([])
    setSelectedArtist(null)
    setReleases([])
  }

  // =================================================
  // RENDER
  // =================================================

  return (
     <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", flex: 1, height: "100%" }}>

      {/* STEP ARTIST */}
      {step === "artist" && (
        <div style={{ position: "relative" }}>
          <input
            placeholder="Search an artist..."
            value={artistQuery}
            onChange={(e) => setArtistQuery(e.target.value)}
            style={inputStyle}
            autoComplete="off"
          />

          {loadingArtists && (
            <div style={dropdownStyle}>
              <div style={dropdownItemStyle}>Searching...</div>
            </div>
          )}

          {!loadingArtists && artists.length > 0 && (
            <div style={isMobile ? {
              background: "#2a2a2a",
              borderRadius: "12px",
              marginTop: "8px",
              overflow: "hidden",
              maxHeight: "200px",
              overflowY: "auto" as const,
            } : dropdownStyle}>
              {artists.map((artist) => (
                <div
                  key={artist.id}
                  style={dropdownItemStyle}
                  onClick={() => fetchReleases(artist)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {artist.thumb ? (
                      <img
                        src={artist.thumb}
                        alt={artist.name}
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#333", flexShrink: 0 }} />
                    )}
                    <span>{artist.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP ALBUM */}
      {step === "album" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <button onClick={reset} style={backButtonStyle}>←</button>
            <span style={{ color: "white", fontWeight: "bold" }}>{selectedArtist?.name}</span>
            {!loadingReleases && (
              <span style={{ color: "#555", fontSize: "13px" }}>
                {releases.length} release{releases.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loadingReleases && (
            <div style={{ color: "#666", padding: "10px" }}>Loading albums...</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: isMobile ? "calc(100vh - 200px)" : "300px", overflowY: "auto" as const }}>
            {releases.map((release) => (
              <div
                key={release.id}
                style={releaseItemStyle}
                onClick={() => selectAlbum(release)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1E1E1E")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {release.cover_url && (
                    <img
                      src={release.cover_url}
                      alt={release.title}
                      style={{ width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <span style={{ color: "white", fontSize: "15px", display: "block" }}>{release.title}</span>
                    {release.format && (
                      <span style={{ color: "#555", fontSize: "11px" }}>{release.format}</span>
                    )}
                  </div>
                </div>
                {release.year && (
                  <span style={{ color: "#666", fontSize: "13px", flexShrink: 0 }}>{release.year}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// =================================================
// STYLES
// =================================================

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#1E1E1E",
  color: "white",
  fontSize: "16px",
  boxSizing: "border-box" as const,
}

const dropdownStyle = {
  position: "absolute" as const,
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  background: "#1E1E1E",
  borderRadius: "12px",
  zIndex: 50,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  maxHeight: "300px",
  overflowY: "auto" as const,
}

const dropdownItemStyle = {
  padding: "10px 16px",
  color: "white",
  cursor: "pointer",
  fontSize: "15px",
  background: "transparent",
  transition: "0.15s",
}

const backButtonStyle = {
  background: "#1E1E1E",
  border: "none",
  color: "white",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "16px",
}

const releaseItemStyle = {
  background: "#1E1E1E",
  borderRadius: "10px",
  padding: "10px 14px",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  transition: "0.15s",
}