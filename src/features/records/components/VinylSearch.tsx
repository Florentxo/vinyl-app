import { useState, useEffect, useRef } from "react"
import type { VinylRecord } from "../types/record"

interface Artist {
  id: string
  name: string
}

interface Release {
  id: string
  title: string
  date?: string
  genres?: string[]
}

interface VinylSearchProps {
  onAdd: (record: Omit<VinylRecord, "id" | "favorite" | "status">) => void
}

// Cache global — persiste pendant toute la session
const artistCache = new Map<string, Artist[]>()
const releaseCache = new Map<string, Release[]>()

export default function VinylSearch({ onAdd }: VinylSearchProps) {
  const [step, setStep] = useState<"artist" | "album">("artist")
  const [artistQuery, setArtistQuery] = useState("")
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [loadingArtists, setLoadingArtists] = useState(false)
  const [loadingReleases, setLoadingReleases] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (artistQuery.length < 2) {
      setArtists([])
      return
    }

    // Vérifie le cache d'abord
    if (artistCache.has(artistQuery)) {
      setArtists(artistCache.get(artistQuery)!)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoadingArtists(true)
      try {
        const res = await fetch(
          `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistQuery)}&limit=6&fmt=json`,
          { headers: { "User-Agent": "VinylApp/1.0 (contact@vinylapp.com)" } }
        )
        const data = await res.json()
        const results = data.artists?.map((a: any) => ({ id: a.id, name: a.name })) ?? []
        artistCache.set(artistQuery, results)
        setArtists(results)
      } catch {
        setArtists([])
      }
      setLoadingArtists(false)
    }, 200) // ← réduit à 200ms
  }, [artistQuery])

  async function fetchReleases(artist: Artist) {
    setSelectedArtist(artist)
    setStep("album")

    // Vérifie le cache
    if (releaseCache.has(artist.id)) {
      setReleases(releaseCache.get(artist.id)!)
      return
    }

    setLoadingReleases(true)
    try {
      const res = await fetch(
        `https://musicbrainz.org/ws/2/release-group?artist=${artist.id}&type=album&limit=20&fmt=json`,
        { headers: { "User-Agent": "VinylApp/1.0 (contact@vinylapp.com)" } }
      )
      const data = await res.json()
      const groups = data["release-groups"] ?? []
      const results = groups.map((r: any) => ({
        id: r.id,
        title: r.title,
        date: r["first-release-date"]?.slice(0, 4),
        genres: r.genres?.map((g: any) => g.name) ?? [],
      }))
      releaseCache.set(artist.id, results)
      setReleases(results)
    } catch {
      setReleases([])
    }
    setLoadingReleases(false)
  }

  async function selectAlbum(release: Release) {
    let cover_url = ""
    try {
      const res = await fetch(`https://coverartarchive.org/release-group/${release.id}`)
      const data = await res.json()
      cover_url = data.images?.[0]?.thumbnails?.small ?? data.images?.[0]?.image ?? ""
    } catch {
      cover_url = ""
    }

    onAdd({
      artist: selectedArtist!.name,
      album: release.title,
      year: release.date ?? "",
      genre: release.genres?.[0] ?? "",
      cover_url,
    })

    reset()
  }

  function reset() {
    setStep("artist")
    setArtistQuery("")
    setArtists([])
    setSelectedArtist(null)
    setReleases([])
  }

  return (
    <div style={{ marginBottom: "24px" }}>

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
            <div style={dropdownStyle}>
              {artists.map((artist) => (
                <div
                  key={artist.id}
                  style={dropdownItemStyle}
                  onClick={() => fetchReleases(artist)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {artist.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "album" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <button onClick={reset} style={backButtonStyle}>←</button>
            <span style={{ color: "white", fontWeight: "bold" }}>{selectedArtist?.name}</span>
          </div>

          {loadingReleases && (
            <div style={{ color: "#666", padding: "10px" }}>Loading albums...</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
            {releases.map((release) => (
              <div
                key={release.id}
                style={releaseItemStyle}
                onClick={() => selectAlbum(release)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1E1E1E")}
              >
                <span style={{ color: "white", fontSize: "15px" }}>{release.title}</span>
                {release.date && (
                  <span style={{ color: "#666", fontSize: "13px" }}>{release.date}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

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
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
}

const dropdownItemStyle = {
  padding: "12px 16px",
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
  padding: "12px 16px",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  transition: "0.15s",
}