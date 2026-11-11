import { useEffect, useState } from "react"
import { colors } from "../../../theme"
import { fetchRecordDetails } from "../utils/discogs"
import type { DiscogsReleaseDetails } from "../utils/discogs"
import Tracklist from "./Tracklist"
import { useRecordsStore } from "../store/recordsStore"

interface TracklistSectionProps {
  artist: string
  album: string
  recordId: string
  discogsReleaseId?: number | null
  onGenreStyle?: (genre: string, style: string) => void
}

export default function TracklistSection({ artist, album, recordId, discogsReleaseId, onGenreStyle }: TracklistSectionProps) {
  const [details, setDetails] = useState<DiscogsReleaseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setDetails(null)
    setLoading(true)
    setError("")
    onGenreStyle?.("", "")
    fetchRecordDetails({ artist, album, discogs_release_id: discogsReleaseId }, import.meta.env.VITE_DISCOGS_TOKEN, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setDetails(result)
        const genre = result.genres?.[0] ?? ""
        const style = result.styles?.[0] ?? ""
        onGenreStyle?.(genre, style)
        // Keep the stored genre (used by list and filters) aligned with Discogs.
        void useRecordsStore.getState().syncGenre(recordId, style ? `${genre} / ${style}` : genre)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not load the tracklist. Please try again.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [artist, album, recordId, discogsReleaseId, onGenreStyle, attempt])

  if (loading) return <p role="status" style={{ color: colors.textTertiary, fontSize: "13px" }}>Loading tracklist...</p>
  if (error) return (
    <div role="alert">
      <p style={{ color: colors.danger }}>{error}</p>
      <button type="button" onClick={() => setAttempt((current) => current + 1)}>Retry</button>
    </div>
  )
  if (!details?.tracklist?.length) return <p style={{ color: colors.textTertiary, fontSize: "13px" }}>No tracklist found</p>
  return <Tracklist tracks={details.tracklist} />
}
