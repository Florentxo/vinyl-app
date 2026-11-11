import { useRef, useState, type ReactNode } from "react"
import { Copy, Download, Pencil, Plus, Share2, Star, Trash2 } from "lucide-react"
import type { VinylRecord } from "../types/record"
import { getDisplayCover } from "../utils/photos"
import { colors } from "../../../theme"

interface RecordGridCardProps {
  item: VinylRecord
  isSelected: boolean
  onSelect: (item: VinylRecord) => void
  onToggleFlag: (item: VinylRecord) => void
  onMoveToCollection: (item: VinylRecord) => void
  onEdit: (item: VinylRecord) => void
  onDelete: (item: VinylRecord) => void
}

const LONG_PRESS_MS = 500

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  width: "100%",
  padding: "10px 14px",
  background: "none",
  border: "none",
  color: colors.textPrimary,
  fontSize: "14px",
  textAlign: "left" as const,
  cursor: "pointer",
}

async function fetchCoverFile(url: string, name: string) {
  const blob = await (await fetch(url)).blob()
  return new File([blob], `${name}.jpg`, { type: blob.type || "image/jpeg" })
}

const overlayButtonStyle = {
  position: "absolute" as const,
  top: "6px",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  border: "none",
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
}

export default function RecordGridCard({ item, isSelected, onSelect, onToggleFlag, onMoveToCollection, onEdit, onDelete }: RecordGridCardProps) {
  const cover = getDisplayCover(item)
  const [menuOpen, setMenuOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  const title = `${item.artist} - ${item.album}`

  function startPress() {
    longPressed.current = false
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { longPressed.current = true; setMenuOpen(true) }, LONG_PRESS_MS)
  }
  function cancelPress() { window.clearTimeout(timer.current) }

  async function share() {
    try {
      const file = cover ? await fetchCoverFile(cover, title).catch(() => null) : null
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title })
      else if (navigator.share) await navigator.share({ title, text: title })
      else await navigator.clipboard.writeText(title)
    } catch { /* share cancelled */ }
  }

  async function saveToPhotos() {
    if (!cover) return
    try {
      const file = await fetchCoverFile(cover, title)
      // The share sheet offers "Save Image" on mobile.
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return }
      const href = URL.createObjectURL(file)
      const link = document.createElement("a")
      link.href = href
      link.download = file.name
      link.click()
      URL.revokeObjectURL(href)
    } catch { /* save cancelled */ }
  }

  function run(action: () => unknown) {
    return (event: { stopPropagation: () => void }) => { event.stopPropagation(); setMenuOpen(false); void action() }
  }

  const entries: { label: string; icon: ReactNode; action: () => unknown; hidden?: boolean }[] = [
    { label: item.favorite ? "Remove from favorites" : "Add to favorites", icon: <Star size={16} />, action: () => onToggleFlag(item) },
    { label: "Edit", icon: <Pencil size={16} />, action: () => onEdit(item) },
    { label: "Share", icon: <Share2 size={16} />, action: share },
    { label: "Save to Photos", icon: <Download size={16} />, action: saveToPhotos, hidden: !cover },
    { label: "Copy", icon: <Copy size={16} />, action: () => navigator.clipboard.writeText(title) },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      action: () => { if (window.confirm(`Delete "${item.album}" by ${item.artist} from your records?`)) onDelete(item) },
    },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (longPressed.current) { longPressed.current = false; return }
            onSelect(item)
          }}
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onPointerMove={(event) => { if (Math.abs(event.movementX) + Math.abs(event.movementY) > 4) cancelPress() }}
          onContextMenu={(event) => { event.preventDefault(); longPressed.current = true; cancelPress(); setMenuOpen(true) }}
          aria-label={`${item.artist} ${item.album}`}
          style={{
            WebkitTouchCallout: "none",
            userSelect: "none",
            display: "block",
            width: "100%",
            aspectRatio: "1",
            padding: 0,
            borderRadius: "10px",
            overflow: "hidden",
            background: colors.cover,
            border: `2px solid ${isSelected ? colors.accent : "transparent"}`,
            cursor: "pointer",
          }}
        >
          {cover
            ? <img src={cover} alt="" loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <span aria-hidden="true" style={{ fontSize: "32px", color: colors.textTertiary }}>♪</span>}
        </button>
        {item.favorite && (
          <span aria-label="Favorite" style={{ ...overlayButtonStyle, right: "6px", pointerEvents: "none" }}>
            <Star size={16} color={colors.favorite} fill={colors.favorite} />
          </span>
        )}
        {menuOpen && (
          <>
            <div onClick={run(() => {})} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
            <div role="menu" style={{ position: "absolute", top: "8px", left: "8px", right: "8px", zIndex: 51, background: colors.cover, border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", boxShadow: "0 6px 20px rgba(0,0,0,0.5)", overflow: "hidden" }}>
              {entries.filter((entry) => !entry.hidden).map((entry) => (
                <button key={entry.label} type="button" role="menuitem" style={menuItemStyle} onClick={run(entry.action)}>
                  {entry.icon}{entry.label}
                </button>
              ))}
            </div>
          </>
        )}
        {item.status === "wishlist" && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onMoveToCollection(item) }}
            aria-label="Add to collection"
            style={{ ...overlayButtonStyle, left: "6px" }}
          >
            <Plus size={16} color="#fff" />
          </button>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: colors.textPrimary, fontSize: "14px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.artist}</div>
        <div style={{ color: colors.textSecondary, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {[item.album, item.year].filter(Boolean).join(" • ")}
        </div>
      </div>
    </div>
  )
}
