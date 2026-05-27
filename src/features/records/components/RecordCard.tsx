import type { VinylRecord } from "../types/record"

interface RecordCardProps {
  item: VinylRecord
  isSelected: boolean
  type: "collection" | "favorites" | "wishlist"

  onSelect: (item: VinylRecord) => void

  onToggleFlag: (
    item: VinylRecord
  ) => void

  onChangeStatus: (
  item: VinylRecord,
  status: "owned" | "wishlist"
  ) => void

  onMoveToCollection?: (
    item: VinylRecord
  ) => void
}

export default function RecordCard({
  item,
  type,
  isSelected,
  onSelect,
  onToggleFlag,
  onChangeStatus,
}: RecordCardProps) {
  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        ...cardStyle,

        border: isSelected
          ? "2px solid #2563EB"
          : "2px solid transparent",
      }}
    >
      {/* LEFT */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>

        {/* COVER MINIATURE */}
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "8px",
          background: "#111",
          flexShrink: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {item.cover_url ? (
            <img
              src={item.cover_url}
              alt={item.album}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: "20px" }}>🎵</span>
          )}
        </div>

        {/* INFO */}
        <div>
          <h3 style={artistStyle}>{item.artist}</h3>
          <p style={albumStyle}>
            {item.album}
            {item.year && ` • ${item.year}`}
            {item.genre && ` • ${item.genre}`}
          </p>
        </div>

      </div>

      {/* RIGHT */}

      {type === "wishlist" ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onChangeStatus(item, "owned")
          }}
          style={actionButtonStyle}
        >
          +
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFlag(item)
          }}
          style={{
            ...favoriteButtonStyle,
            color: item.favorite ? "#FACC15" : "#666",
          }}
        >
          {item.favorite ? "★" : "☆"}
        </button>
      )}
    </div>
  )
}

// =================================================
// STYLES
// =================================================

const cardStyle = {
  background: "#1E1E1E",
  borderRadius: "16px",
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
}

const artistStyle = {
  color: "white",
  fontSize: "22px",
  margin: 0,
}

const albumStyle = {
  color: "#888",
  marginTop: "8px",
  marginBottom: 0,
}

const actionButtonStyle = {
  width: "50px",
  height: "50px",
  border: "none",
  borderRadius: "12px",
  background: "#2563EB",
  color: "white",
  fontSize: "24px",
  cursor: "pointer",
}

const favoriteButtonStyle = {
  width: "50px",
  height: "50px",
  borderRadius: "12px",
  border: "none",
  background: "transparent",
  fontSize: "28px",
  cursor: "pointer",
}