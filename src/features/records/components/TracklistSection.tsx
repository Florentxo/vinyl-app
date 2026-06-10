import { useEffect, useState } from "react"

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
  const cleanArtist = artist.replace(/\s*\(\d+\)$/, "").trim()
  try {
    const search = await fetch(
      `https://api.discogs.com/database/search?q=${encodeURIComponent(album)}&artist=${encodeURIComponent(cleanArtist)}&type=release&format=Vinyl&per_page=5&token=${DISCOGS_TOKEN}`
    )
    const searchData = await search.json()
    const releaseId = searchData.results?.[0]?.id

    if (!releaseId) {
      const fallback = await fetch(
        `https://api.discogs.com/database/search?q=${encodeURIComponent(album)}&artist=${encodeURIComponent(cleanArtist)}&type=master&per_page=5&token=${DISCOGS_TOKEN}`
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

interface TracklistSectionProps {
  artist: string
  album: string
  recordId: string
  onGenreStyle?: (genre: string, style: string) => void
}

export default function TracklistSection({ artist, album, recordId, onGenreStyle }: TracklistSectionProps) {
  const [sides, setSides] = useState<Side[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSides([])
    setLoading(true)
    fetchTracklist(artist, album).then((result) => {
      setSides(result.sides)
      if (onGenreStyle) onGenreStyle(result.genre, result.style)
      setLoading(false)
    })
  }, [recordId])

  if (loading) return <p style={{ color: "#555", fontSize: "13px" }}>Loading tracklist...</p>
  if (sides.length === 0) return <p style={{ color: "#555", fontSize: "13px" }}>No tracklist found</p>

  return (
    <div>
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
  )
}