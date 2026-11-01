import { useRef, useState } from "react"
import { MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react"
import type { VinylRecord } from "../types/record"
import { colors } from "../../../theme"
import { getDisplayCover } from "../utils/photos"
import { LIST_COLUMN_GAP, LIST_COLUMNS, LIST_COVER_SIZE, LIST_ROW_PADDING_LEFT, LIST_ROW_PADDING_RIGHT } from "../utils/listLayout"

type ActionResult = boolean | void | Promise<boolean | void>

interface RecordCardProps {
  item: VinylRecord
  isSelected: boolean
  actionsOpen: boolean
  onActionsOpenChange: (open: boolean) => void
  onSelect: (item: VinylRecord) => void
  onToggleFlag: (item: VinylRecord) => ActionResult
  onChangeStatus: (item: VinylRecord, status: "owned" | "wishlist") => ActionResult
  onDelete: (item: VinylRecord) => ActionResult
  showColumns?: boolean
  onEdit?: (item: VinylRecord) => void
}

export default function RecordCard({
  item, isSelected, actionsOpen, onActionsOpenChange, onSelect, onToggleFlag, onChangeStatus, onDelete, showColumns = false, onEdit,
}: RecordCardProps) {
  const [hovered, setHovered] = useState(false)
  const busyRef = useRef(false)
  const gestureRef = useRef<{ id: number; x: number; y: number; horizontal: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const menuRef = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function runAction(action: () => ActionResult) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError("")
    try {
      if (await action() === false) throw new Error("Record action failed")
      onActionsOpenChange(false)
    } catch {
      setError("Could not update this record. Please try again.")
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const favoriteLabel = item.favorite ? "Remove from favorites" : "Add to favorites"

  return (
    <div
      data-record-actions-id={item.id}
      onClick={(event) => event.stopPropagation()}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return
        event.preventDefault()
        event.stopPropagation()
        suppressClickRef.current = false
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") suppressClickRef.current = false
        if (event.key === "Escape" && actionsOpen) {
          event.stopPropagation()
          onActionsOpenChange(false)
          requestAnimationFrame(() => menuRef.current?.focus())
        }
      }}
      onPointerDown={(event) => {
        suppressClickRef.current = false
        if (!event.isPrimary || event.pointerType === "mouse" || busyRef.current) return
        gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false }
      }}
      onPointerMove={(event) => {
        const gesture = gestureRef.current
        if (!gesture || gesture.id !== event.pointerId) return
        const dx = event.clientX - gesture.x
        const dy = event.clientY - gesture.y
        if (!gesture.horizontal && Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) {
          gestureRef.current = null
          suppressClickRef.current = true
          return
        }
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          gesture.horizontal = true
          suppressClickRef.current = true
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.setPointerCapture(event.pointerId)
          }
        }
      }}
      onPointerUp={(event) => {
        const gesture = gestureRef.current
        gestureRef.current = null
        if (!gesture || gesture.id !== event.pointerId || busyRef.current) return
        const dx = event.clientX - gesture.x
        const dy = event.clientY - gesture.y
        if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          suppressClickRef.current = true
          onActionsOpenChange(dx < 0)
        }
      }}
      onPointerCancel={() => {
        gestureRef.current = null
        suppressClickRef.current = true
      }}
      style={{
        background: isSelected ? colors.accentBg : hovered && !actionsOpen ? colors.card : "transparent",
        borderRadius: "10px", width: "100%", boxSizing: "border-box",
        boxShadow: `inset 0 -1px 0 ${colors.border}`,
        touchAction: "pan-y", overflow: "hidden", flexShrink: 0,
      }}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "4px", padding: actionsOpen ? "10px 12px" : `10px ${LIST_ROW_PADDING_RIGHT}px 10px ${LIST_ROW_PADDING_LEFT}px` }}>
        <button
          type="button"
          onClick={() => {
            onActionsOpenChange(false)
            onSelect(item)
          }}
          style={{
            display: "grid",
            gridTemplateColumns: showColumns ? LIST_COLUMNS : `${LIST_COVER_SIZE}px minmax(0, 1fr)`,
            columnGap: `${LIST_COLUMN_GAP}px`,
            alignItems: "center",
            flex: 1, minWidth: 0, border: "none", padding: 0, textAlign: "left", background: "transparent", cursor: "pointer", color: colors.textPrimary,
          }}
        >
          <span style={{ width: `${LIST_COVER_SIZE}px`, height: `${LIST_COVER_SIZE}px`, borderRadius: "8px", background: colors.cover, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {getDisplayCover(item)
              ? <img src={getDisplayCover(item)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span aria-hidden="true" style={{ fontSize: "20px" }}>♪</span>}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "16px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.album}</span>
            <span style={{ display: "block", color: colors.textSecondary, fontSize: "13px", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(showColumns ? [item.artist] : [item.artist, item.year]).filter(Boolean).join(" • ")}
            </span>
          </span>
          {showColumns && (
            <>
              <span style={{ color: colors.textSecondary, fontSize: "14px" }}>{item.year}</span>
              <span style={{ minWidth: 0 }}>
                {item.genre && (
                  <span style={{ display: "inline-block", maxWidth: "100%", boxSizing: "border-box", background: colors.card, color: colors.textMuted, borderRadius: "20px", padding: "3px 10px", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                    {item.genre}
                  </span>
                )}
              </span>
            </>
          )}
        </button>
        <div id={`record-actions-${item.id}`} hidden={!actionsOpen} style={{ flexShrink: 0 }}>
          <div role="group" aria-label={`Actions for ${item.album}`} style={{ display: "flex", gap: "2px", flexWrap: "nowrap", background: colors.bgSecondary, borderRadius: "10px", border: `1px solid ${colors.borderStrong}` }}>
            {item.status === "wishlist" && (
              <button type="button" aria-label="Add to collection" title="Add to collection" disabled={busy} style={{ ...actionStyle, color: colors.accent }} onClick={() => { void runAction(() => onChangeStatus(item, "owned")) }}>
                <Plus size={22} aria-hidden="true" />
              </button>
            )}
            <button type="button" aria-label={favoriteLabel} title={favoriteLabel} aria-pressed={item.favorite} disabled={busy} style={{ ...actionStyle, color: item.favorite ? colors.favorite : colors.textSecondary }} onClick={() => { void runAction(() => onToggleFlag(item)) }}>
              <Star size={22} fill={item.favorite ? "currentColor" : "none"} aria-hidden="true" />
            </button>
            {onEdit && (
              <button type="button" aria-label="Edit cover" title="Edit cover" disabled={busy} style={{ ...actionStyle, color: colors.textSecondary }} onClick={() => { onActionsOpenChange(false); onEdit(item) }}>
                <Pencil size={22} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              aria-label="Delete vinyl"
              title="Delete vinyl"
              disabled={busy}
              style={{ ...actionStyle, color: colors.danger }}
              onClick={() => {
                if (window.confirm(`Delete "${item.album}" by ${item.artist} from your records? This also removes it from favorites and wishlist.`)) {
                  void runAction(() => onDelete(item))
                }
              }}
            ><Trash2 size={22} aria-hidden="true" /></button>
          </div>
        </div>
        <button
          ref={menuRef}
          type="button"
          aria-label={`Actions for ${item.album}`}
          aria-expanded={actionsOpen}
          aria-controls={`record-actions-${item.id}`}
          disabled={busy}
          onClick={() => onActionsOpenChange(!actionsOpen)}
          style={{ ...actionStyle, display: actionsOpen ? "none" : "inline-flex", position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}
        ><MoreHorizontal size={18} aria-hidden="true" /></button>
      </div>
      {busy && <p role="status" style={{ padding: "0 16px", color: colors.textSecondary }}>Updating...</p>}
      {error && <p role="alert" style={{ padding: "0 16px", color: colors.danger }}>{error}</p>}
    </div>
  )
}

const actionStyle = {
  width: "44px",
  minHeight: "44px",
  padding: "8px",
  border: "none",
  borderRadius: "8px",
  background: "transparent",
  color: colors.textPrimary,
  cursor: "pointer",
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
}
