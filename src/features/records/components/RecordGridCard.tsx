import { Pencil, Plus, Star } from "lucide-react"
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

export default function RecordGridCard({ item, isSelected, onSelect, onToggleFlag, onMoveToCollection, onEdit }: RecordGridCardProps) {
  const cover = getDisplayCover(item)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onSelect(item) }}
          aria-label={`${item.artist} ${item.album}`}
          style={{
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
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onToggleFlag(item) }}
          aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={item.favorite}
          style={{ ...overlayButtonStyle, right: "6px" }}
        >
          <Star size={16} color={colors.favorite} fill={item.favorite ? colors.favorite : "none"} />
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onEdit(item) }}
          aria-label={`Edit cover of ${item.album}`}
          style={{ position: "absolute", right: "6px", bottom: "6px",           width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer" }}
        >
                    <Pencil size={18} aria-hidden="true" />
        </button>
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
