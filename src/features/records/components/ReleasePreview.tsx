import { useEffect, useRef, useState } from "react"
import { colors } from "../../../theme"
import { fetchDiscogsReleaseDetails } from "../utils/discogs"
import type { DiscogsReleaseDetails, Release } from "../utils/discogs"
import Tracklist from "./Tracklist"

interface ReleasePreviewProps {
  release: Release
  isMobile: boolean
  adding: boolean
  error: string
  onClose: () => void
  onConfirm: (details: DiscogsReleaseDetails | null) => void
}

export default function ReleasePreview({ release, isMobile, adding, error, onClose, onConfirm }: ReleasePreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmRef = useRef(false)
  const [details, setDetails] = useState<DiscogsReleaseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError("")
    fetchDiscogsReleaseDetails(release.id, import.meta.env.VITE_DISCOGS_TOKEN, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDetails(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError("Could not load the tracklist. You can retry or add this release anyway.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [release.id, attempt])

  useEffect(() => {
    if (!adding) confirmRef.current = false
  }, [adding, error])

  const buttonStyle = {
    padding: "12px 16px",
    borderRadius: "8px",
    border: `1px solid ${colors.border}`,
    background: colors.card,
    color: colors.textPrimary,
    cursor: "pointer",
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="release-preview-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!adding) onClose()
      }}
      style={{
        boxSizing: "border-box", padding: 0, border: `1px solid ${colors.border}`,
        borderRadius: isMobile ? 0 : "12px", background: colors.bgSecondary, color: colors.textPrimary,
        width: isMobile ? "100%" : "520px", maxWidth: isMobile ? "100%" : "calc(100% - 32px)",
        height: isMobile ? "100dvh" : "min(720px, 85dvh)", maxHeight: "100dvh",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <h2 id="release-preview-title" style={{ marginTop: 0 }}>{release.album}</h2>
          {(details?.images?.[0]?.uri || release.coverUrl) && (
            <img src={details?.images?.[0]?.uri || release.coverUrl} alt="" style={{ width: "160px", maxWidth: "100%", borderRadius: "8px" }} />
          )}
          <p>{release.artist}</p>
          <p style={{ color: colors.textSecondary }}>{[release.year, ...release.formats].filter(Boolean).join(" · ")}</p>
          <h3>Tracklist</h3>
          {loading && <p role="status">Loading tracklist...</p>}
          {loadError && (
            <div role="alert">
              <p>{loadError}</p>
              <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>Retry</button>
            </div>
          )}
          {!loading && !loadError && (
            details?.tracklist?.length
              ? <Tracklist tracks={details.tracklist} />
              : <p>No tracklist available for this release.</p>
          )}
        </div>
        <div style={{ padding: "16px", borderTop: `1px solid ${colors.border}`, flexShrink: 0 }}>
          {error && <p role="alert" style={{ color: colors.danger }}>{error}</p>}
          <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
            <button type="button" autoFocus disabled={adding} style={buttonStyle} onClick={onClose}>Back to results</button>
            <button
              type="button"
              disabled={loading || adding}
              style={buttonStyle}
              onClick={() => {
                if (confirmRef.current) return
                confirmRef.current = true
                onConfirm(details)
              }}
            >{adding ? "Adding..." : "Add release"}</button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
