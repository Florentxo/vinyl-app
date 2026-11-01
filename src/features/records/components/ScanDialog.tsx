import { useEffect, useRef, useState } from "react"
import { Camera, ScanLine, Trash2, X } from "lucide-react"
import { identifyRecord } from "../services/identifyRecord"
import { compressImage, SCAN_PHOTO_DIMENSION } from "../utils/photos"
import { primaryArtist } from "../utils/scanSearch"
import { colors } from "../../../theme"

interface ScanDialogProps {
  onClose: () => void
  onIdentified: (result: { artist: string; album: string; alternates?: { artist: string; album: string } }) => void
}

interface Shot {
  blob: Blob
  url: string
}

// Only the front photo is required.
const SLOTS = ["Front", "Back"] as const

const tileStyle = {
  position: "relative" as const,
  aspectRatio: "1",
  borderRadius: "12px",
  overflow: "hidden",
  background: colors.card,
}

export default function ScanDialog({ onClose, onIdentified }: ScanDialogProps) {
  const [shots, setShots] = useState<(Shot | null)[]>([null, null])
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!busy) return
    setElapsed(0)
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [busy])

  useEffect(() => () => abortRef.current?.abort(), [])

  function close() {
    abortRef.current?.abort()
    onClose()
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError("")
    setPreparing(true)
    try {
      const blob = await compressImage(file, SCAN_PHOTO_DIMENSION, 0.8)
      const index = targetRef.current
      setShots((current) => {
        const previous = current[index]
        if (previous) URL.revokeObjectURL(previous.url)
        return current.map((shot, i) => (i === index ? { blob, url: URL.createObjectURL(blob) } : shot))
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this photo.")
    } finally {
      setPreparing(false)
    }
  }

  async function identify() {
    const blobs = shots.flatMap((shot) => (shot ? [shot.blob] : []))
    if (blobs.length === 0) return
    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    setError("")
    try {
      const result = await identifyRecord(blobs, controller.signal)
      shots.forEach((shot) => shot && URL.revokeObjectURL(shot.url))
      const hasLatin = Boolean(result.artistLatin || result.albumLatin)
      onIdentified({
        artist: primaryArtist(result.artist),
        album: result.album,
        alternates: hasLatin
          ? { artist: primaryArtist(result.artistLatin ?? ""), album: result.albumLatin ?? "" }
          : undefined,
      })
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not identify this record.")
    } finally {
      abortRef.current = null
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan a record"
      onClick={(event) => { event.stopPropagation(); close() }}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ background: colors.bgSecondary, borderRadius: "16px", width: "100%", maxWidth: "420px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: colors.textPrimary, fontSize: "16px", fontWeight: "bold" }}>Scan a record</div>
          <button onClick={close} aria-label="Close" style={{ background: "none", border: "none", color: colors.textTertiary, cursor: "pointer", display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: "13px" }}>
          Take a photo of the front cover. Adding the back helps for hard-to-read covers.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            void handleFile(file)
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          {SLOTS.map((label, index) => {
            const shot = shots[index]
            return (
              <div key={label} style={{ ...tileStyle, border: `2px ${shot ? "solid" : "dashed"} ${shot ? colors.accent : colors.borderStrong}` }}>
                {shot ? (
                  <>
                    <img src={shot.url} alt={`${label} photo`} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Remove ${label.toLowerCase()} photo`}
                      onClick={() => setShots((current) => {
                        if (current[index]) URL.revokeObjectURL(current[index].url)
                        return current.map((item, i) => (i === index ? null : item))
                      })}
                      style={{ position: "absolute", top: "6px", right: "6px", width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={16} color="#fff" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Take ${label.toLowerCase()} photo`}
                    onClick={() => { targetRef.current = index; inputRef.current?.click() }}
                    style={{ width: "100%", height: "100%", border: "none", background: "none", cursor: "pointer", color: colors.textTertiary, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <Camera size={26} aria-hidden="true" />
                    <span style={{ fontSize: "12px" }}>{label}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {error && <span role="alert" style={{ color: colors.danger, fontSize: "13px" }}>{error}</span>}
        <button
          type="button"
          onClick={() => { void identify() }}
          disabled={busy || preparing || shots.every((shot) => !shot)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", border: "none", borderRadius: "10px", background: colors.accent, color: "#fff", fontSize: "15px", cursor: "pointer", opacity: busy || preparing || shots.every((shot) => !shot) ? 0.55 : 1 }}
        >
          <ScanLine size={18} aria-hidden="true" /> {busy ? `Identifying… ${elapsed}s` : preparing ? "Preparing photo…" : "Identify"}
        </button>
      </div>
    </div>
  )
}
