import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, Check, Trash2 } from "lucide-react"
import type { RecordPhoto, VinylRecord } from "../types/record"
import { deleteRecordPhoto, listRecordPhotos, saveRecordPhoto } from "../services/recordPhotos"
import { useRecordsStore } from "../store/recordsStore"
import { compressImage, nextFreeSlot, orderPhotos } from "../utils/photos"
import { colors } from "../../../theme"

interface RecordPhotosProps {
  record: VinylRecord
}

const tileStyle = {
  position: "relative" as const,
  aspectRatio: "1",
  borderRadius: "8px",
  overflow: "hidden",
  background: colors.card,
}

const tileButtonStyle = {
  display: "block",
  width: "100%",
  height: "100%",
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
}

const imageStyle = { width: "100%", height: "100%", objectFit: "cover" as const, display: "block" }

const badgeStyle = {
  position: "absolute" as const,
  top: "6px",
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

export default function RecordPhotos({ record }: RecordPhotosProps) {
  const setCustomCover = useRecordsStore((state) => state.setCustomCover)
  const [photos, setPhotos] = useState<RecordPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setPhotos([])
    setError("")
    listRecordPhotos(record.id)
      .then((loaded) => { if (!cancelled) setPhotos(loaded) })
      .catch((err) => {
        if (cancelled) return
        const missing = typeof err === "object" && err !== null && "code" in err && err.code === "PGRST205"
        setError(missing ? "Photo storage is not set up: run the record_photos migration in Supabase." : "Could not load photos.")
      })
    return () => { cancelled = true }
  }, [record.id])

  const ordered = useMemo(() => orderPhotos(photos), [photos])
  const usesCustomCover = record.cover_source === "custom" && !!record.custom_cover_path

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true)
    setError("")
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    void run(async () => {
      const saved = await saveRecordPhoto(record.id, nextFreeSlot(photos), await compressImage(file))
      setPhotos((current) => [...current, saved])
    }, "Could not save this photo.")
  }

  function handleDelete(photo: RecordPhoto) {
    void run(async () => {
      if (photo.path === record.custom_cover_path && !(await setCustomCover(record.id, null))) {
        throw new Error("Could not reset the cover.")
      }
      await deleteRecordPhoto(photo)
      setPhotos((current) => current.filter((item) => item.id !== photo.id))
    }, "Could not delete this photo.")
  }

  function selectCover(photo: RecordPhoto | null) {
    void run(async () => {
      if (!(await setCustomCover(record.id, photo))) throw new Error("Could not update the cover.")
    }, "Could not update the cover.")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          handleFile(file)
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: "8px" }}>
        <div style={{ ...tileStyle, border: `2px solid ${usesCustomCover ? colors.border : colors.accent}` }}>
          <button type="button" disabled={busy} aria-label="Use the album cover" aria-pressed={!usesCustomCover} onClick={() => selectCover(null)} style={tileButtonStyle}>
            {record.cover_url
              ? <img src={record.cover_url} alt="" draggable={false} style={imageStyle} />
              : <span aria-hidden="true" style={{ fontSize: "28px", color: colors.textTertiary }}>♪</span>}
          </button>
          {!usesCustomCover && <span style={{ ...badgeStyle, left: "6px", background: colors.accent }}><Check size={14} color="#fff" aria-hidden="true" /></span>}
        </div>

        {ordered.map((photo, index) => {
          const selected = usesCustomCover && photo.path === record.custom_cover_path
          return (
            <div key={photo.id} style={{ ...tileStyle, border: `2px solid ${selected ? colors.accent : colors.border}` }}>
              <button type="button" disabled={busy} aria-label={`Use photo ${index + 1} as cover`} aria-pressed={selected} onClick={() => selectCover(photo)} style={tileButtonStyle}>
                {photo.url && <img src={photo.url} alt="" loading="lazy" draggable={false} style={imageStyle} />}
              </button>
              {selected && <span style={{ ...badgeStyle, left: "6px", background: colors.accent }}><Check size={14} color="#fff" aria-hidden="true" /></span>}
              <button
                type="button"
                disabled={busy}
                aria-label={`Delete photo ${index + 1}`}
                onClick={() => handleDelete(photo)}
                style={{ ...badgeStyle, right: "6px", border: "none", background: "rgba(0,0,0,0.55)", cursor: "pointer" }}
              >
                <Trash2 size={14} color="#fff" aria-hidden="true" />
              </button>
            </div>
          )
        })}

        <div style={{ ...tileStyle, border: `2px dashed ${colors.borderStrong}` }}>
          <button
            type="button"
            disabled={busy}
            aria-label="Add a photo"
            onClick={() => inputRef.current?.click()}
            style={{ ...tileButtonStyle, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textTertiary }}
          >
            {busy ? "…" : <Camera size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {error && <span role="alert" style={{ color: colors.danger, fontSize: "12px" }}>{error}</span>}
    </div>
  )
}
