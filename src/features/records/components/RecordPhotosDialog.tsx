import { X } from "lucide-react"
import type { VinylRecord } from "../types/record"
import RecordPhotos from "./RecordPhotos"
import { colors } from "../../../theme"

interface RecordPhotosDialogProps {
  record: VinylRecord
  onClose: () => void
}

export default function RecordPhotosDialog({ record, onClose }: RecordPhotosDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit cover"
      onClick={(event) => { event.stopPropagation(); onClose() }}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ background: colors.bgSecondary, borderRadius: "16px", width: "100%", maxWidth: "460px", maxHeight: "90vh", overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: colors.textPrimary, fontSize: "16px", fontWeight: "bold" }}>Edit cover</div>
            <div style={{ color: colors.textSecondary, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {record.artist} – {record.album}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: colors.textTertiary, cursor: "pointer", display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <RecordPhotos record={record} />
      </div>
    </div>
  )
}
