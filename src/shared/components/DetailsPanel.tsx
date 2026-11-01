import { useCallback, useState } from "react"
import { Pencil } from "lucide-react"
import { useRecordsStore } from "../../features/records/store/recordsStore"
import TracklistSection from "../../features/records/components/TracklistSection"
import RecordPhotosDialog from "../../features/records/components/RecordPhotosDialog"
import { getDisplayCover } from "../../features/records/utils/photos"
import { colors } from "../../theme"

interface DetailsPanelProps {
  onClose: () => void
}

export default function DetailsPanel({ onClose }: DetailsPanelProps) {
  const selectedRecord = useRecordsStore((state) => state.selectedRecord)
  const setSelectedRecord = useRecordsStore((state) => state.setSelectedRecord)
  const deleteRecord = useRecordsStore((state) => state.deleteRecord)

  const [genre, setGenre] = useState("")
  const [style, setStyle] = useState("")
  const [photosOpen, setPhotosOpen] = useState(false)
  const updateGenreStyle = useCallback((g: string, s: string) => { setGenre(g); setStyle(s) }, [])

  if (!selectedRecord) return null

  async function handleDelete() {
    if (!selectedRecord) return
    if (!window.confirm(`Delete "${selectedRecord.album}" from your records?`)) return
    const deleted = await deleteRecord(selectedRecord.id)
    if (deleted) setSelectedRecord(null)
  }

  const spotifyUrl = `spotify:search:${encodeURIComponent(`${selectedRecord.artist} ${selectedRecord.album}`)}`
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedRecord.artist} ${selectedRecord.album}`)}`
  const deezerUrl = `https://www.deezer.com/search/${encodeURIComponent(`${selectedRecord.artist} ${selectedRecord.album}`)}`

  return (
    <div style={{
      width: "260px",
      flexShrink: 0,
      background: colors.bgSecondary,
      borderLeft: `1px solid ${colors.border}`,
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
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
      }}>
        <span style={{ color: colors.textSecondary, fontSize: "13px" }}>Details</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: colors.textTertiary, fontSize: "18px", cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* COVER */}
        <div style={{
          position: "relative",
          borderRadius: "12px",
          overflow: "hidden",
          aspectRatio: "1",
          background: colors.card,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {getDisplayCover(selectedRecord) ? (
            <img
              src={getDisplayCover(selectedRecord)}
              alt={selectedRecord.album}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: "48px" }}>🎵</span>
          )}
          <button
            type="button"
            onClick={() => setPhotosOpen(true)}
            aria-label="Edit cover"
            style={{ position: "absolute", right: "8px", bottom: "8px",             width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer" }}
          >
                        <Pencil size={18} aria-hidden="true" />
          </button>
        </div>
        {photosOpen && <RecordPhotosDialog key={selectedRecord.id} record={selectedRecord} onClose={() => setPhotosOpen(false)} />}

        {/* INFO */}
        <h2 style={{ color: colors.textPrimary, margin: 0, fontSize: "18px" }}>{selectedRecord.artist}</h2>
        <p style={{ color: colors.textSecondary, margin: 0, fontSize: "14px" }}>{selectedRecord.album}</p>

        {selectedRecord.year && (
          <p style={{ color: colors.textTertiary, margin: 0, fontSize: "13px" }}>{selectedRecord.year}</p>
        )}

        {/* GENRE & STYLE */}
        {(genre || style) && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {genre && (
              <span style={{
                background: colors.card,
                color: colors.textMuted,
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "12px",
              }}>
                {genre}
              </span>
            )}
            {style && (
              <span style={{
                background: colors.card,
                color: colors.accent,
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
            background: colors.card,
            color: colors.spotify,
            borderRadius: "20px",
            padding: "5px 12px",
            fontSize: "12px",
            textDecoration: "none" as const,
            border: `1px solid ${colors.spotify}33`,
          }}>
            Spotify
          </a>
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" style={{
            background: colors.card,
            color: colors.youtube,
            borderRadius: "20px",
            padding: "5px 12px",
            fontSize: "12px",
            textDecoration: "none" as const,
            border: `1px solid ${colors.youtube}33`,
          }}>
            YouTube
          </a>
          <a href={deezerUrl} target="_blank" rel="noopener noreferrer" style={{
            background: colors.card,
            color: colors.deezer,
            borderRadius: "20px",
            padding: "5px 12px",
            fontSize: "12px",
            textDecoration: "none" as const,
            border: `1px solid ${colors.deezer}33`,
          }}>
            Deezer
          </a>
        </div>

        {/* TRACKLIST */}
        <TracklistSection
          artist={selectedRecord.artist}
          album={selectedRecord.album}
          recordId={selectedRecord.id}
          discogsReleaseId={selectedRecord.discogs_release_id}
          onGenreStyle={updateGenreStyle}
        />

      </div>

      {/* DELETE */}
      <div style={{ padding: "16px", flexShrink: 0, borderTop: `1px solid ${colors.border}` }}>
        <button
          onClick={handleDelete}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            background: colors.card,
            color: colors.danger,
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