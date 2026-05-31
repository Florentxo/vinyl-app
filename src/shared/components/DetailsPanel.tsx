import { useEffect, useState } from "react"
import { useRecordsStore } from "../../features/records/store/recordsStore"

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN

interface Track {
  number: string
  title: string
  duration: string
}

interface Side {
  name: string
  tracks: Track[]
}

interface TracklistResult {
  sides: Side[]
  genre: string
  style: string
}

function parseTracklist(data: any): TracklistResult {
  const genre = data.genres?.[0] ?? ""
  const style = data.styles?.[0] ?? ""
  const tracklist = data.tracklist ?? []
  const sides: Side[] = []
  let currentSide: Side | null = null

  tracklist.forEach((t: any) => {
    if (t.type_ === "heading") {
      currentSide = { name: t.title, tracks: [] }
      sides.push(currentSide)
    } else {
      if (!currentSide) {
        currentSide = { name: "", tracks: [] }
        sides.push(currentSide)
      }
      currentSide.tracks.push({
        number: t.position,
        title: t.title,
        duration: t.duration || "—",
      })
    }
  })

  return { sides, genre, style }
}

async function fetchTracklist(artist: string, album: string): Promise<TracklistResult> {
  try {
    const search = await fetch(
      `https://api.discogs.com/database/search?q=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}&type=release&format=Vinyl&per_page=5&token=${DISCOGS_TOKEN}`
    )
    const searchData = await search.json()
    const releaseId = searchData.results?.[0]?.id

    if (!releaseId) {
      const fallback = await fetch(
        `https://api.discogs.com/database/search?q=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}&type=master&per_page=5&token=${DISCOGS_TOKEN}`
      )
      const fallbackData = await fallback.json()
      const master = fallbackData.results?.[0]
      if (!master) return { sides: [], genre: "", style: "" }

      const detail = await fetch(`https://api.discogs.com/masters/${master.id}?token=${DISCOGS_TOKEN}`)
      const detailData = await detail.json()
      return parseTracklist(detailData)
    }

    const detail = await fetch(`https://api.discogs.com/releases/${releaseId}?token=${DISCOGS_TOKEN}`)
    const detailData = await detail.json()
    return parseTracklist(detailData)
  } catch {
    return { sides: [], genre: "", style: "" }
  }
}

interface DetailsPanelProps {
  onClose: () => void
}

export default function DetailsPanel({ onClose }: DetailsPanelProps) {
  const selectedRecord = useRecordsStore((state) => state.selectedRecord)
  const setSelectedRecord = useRecordsStore((state) => state.setSelectedRecord)
  const deleteRecord = useRecordsStore((state) => state.deleteRecord)

  const [sides, setSides] = useState<Side[]>([])
  const [genre, setGenre] = useState("")
  const [style, setStyle] = useState("")
  const [loadingTracks, setLoadingTracks] = useState(false)

  useEffect(() => {
    if (!selectedRecord) return
    setSides([])
    setGenre("")
    setStyle("")
    setLoadingTracks(true)
    fetchTracklist(selectedRecord.artist, selectedRecord.album).then((result) => {
      setSides(result.sides)
      setGenre(result.genre)
      setStyle(result.style)
      setLoadingTracks(false)
    })
  }, [selectedRecord?.id])

  if (!selectedRecord) return null

  function handleDelete() {
    if (!selectedRecord) return
    deleteRecord(selectedRecord.id)
    setSelectedRecord(null)
  }

  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${selectedRecord.artist} ${selectedRecord.album}`)}`
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedRecord.artist} ${selectedRecord.album}`)}`
  const deezerUrl = `https://www.deezer.com/search/${encodeURIComponent(`${selectedRecord.artist} ${selectedRecord.album}`)}`

  return (
    <div style={{
      width: "260px",
      flexShrink: 0,
      background: "#0D0D0D",
      borderLeft: "1px solid #222",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* HEADER */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px",
        borderBottom: "1px solid #222",
        flexShrink: 0,
      }}>
        <span style={{ color: "#888", fontSize: "13px" }}>Details</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: "18px", cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* COVER */}
        <div style={{
          borderRadius: "12px",
          overflow: "hidden",
          aspectRatio: "1",
          background: "#1E1E1E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {selectedRecord.cover_url ? (
            <img
              src={selectedRecord.cover_url}
              alt={selectedRecord.album}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: "48px" }}>🎵</span>
          )}
        </div>

        {/* INFO */}
        <h2 style={{ color: "white", margin: 0, fontSize: "18px" }}>{selectedRecord.artist}</h2>
        <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>{selectedRecord.album}</p>

        {selectedRecord.year && (
          <p style={{ color: "#555", margin: 0, fontSize: "13px" }}>{selectedRecord.year}</p>
        )}

        {/* GENRE & STYLE */}
        {(genre || style) && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {genre && (
              <span style={{
                background: "#1E1E1E",
                color: "#888",
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "12px",
              }}>
                {genre}
              </span>
            )}
            {style && (
              <span style={{
                background: "#1E1E1E",
                color: "#2563EB",
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "12px",
              }}>
                {style}
              </span>
            )}
          </div>
        )}

        {/* LISTEN ON */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" style={{
            background: "#1E1E1E",
            color: "#1DB954",
            borderRadius: "20px",
            padding: "5px 12px",
            fontSize: "12px",
            textDecoration: "none" as const,
            border: "1px solid #1DB95433",
          }}>
            Spotify
          </a>
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" style={{
            background: "#1E1E1E",
            color: "#FF0000",
            borderRadius: "20px",
            padding: "5px 12px",
            fontSize: "12px",
            textDecoration: "none" as const,
            border: "1px solid #FF000033",
          }}>
            YouTube
          </a>
          <a href={deezerUrl} target="_blank" rel="noopener noreferrer" style={{
            background: "#1E1E1E",
            color: "#A238FF",
            borderRadius: "20px",
            padding: "5px 12px",
            fontSize: "12px",
            textDecoration: "none" as const,
            border: "1px solid #A238FF33",
          }}>
            Deezer
          </a>
        </div>

        {/* TRACKLIST */}
        <div style={{ marginTop: "8px" }}>
          {loadingTracks && (
            <p style={{ color: "#555", fontSize: "13px" }}>Loading tracklist...</p>
          )}

          {!loadingTracks && sides.length === 0 && (
            <p style={{ color: "#555", fontSize: "13px" }}>No tracklist found</p>
          )}

          {sides.map((side, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              {side.name && (
                <p style={{
                  color: "#2563EB",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  margin: "0 0 8px 0",
                  fontWeight: "bold",
                }}>
                  {side.name.toUpperCase()}
                </p>
              )}
              {side.tracks.map((track, j) => (
                <div key={j} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "5px 0",
                  borderBottom: "1px solid #1a1a1a",
                  gap: "8px",
                }}>
                  <span style={{ color: "#555", fontSize: "11px", flexShrink: 0 }}>{track.number}</span>
                  <span style={{ color: "#ccc", fontSize: "13px", flex: 1 }}>{track.title}</span>
                  <span style={{ color: "#555", fontSize: "11px", flexShrink: 0 }}>{track.duration}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

      </div>

      {/* DELETE */}
      <div style={{ padding: "16px", flexShrink: 0, borderTop: "1px solid #222" }}>
        <button
          onClick={handleDelete}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            background: "#1E1E1E",
            color: "#991B1B",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Delete vinyl
        </button>
      </div>

    </div>
  )
}