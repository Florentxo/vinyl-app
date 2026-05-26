import { useRecordsStore } from "../../features/records/store/recordsStore"

interface DetailsPanelProps {
  onClose: () => void
}

export default function DetailsPanel({ onClose }: DetailsPanelProps) {
  const selectedRecord = useRecordsStore((state) => state.selectedRecord)
  const setSelectedRecord = useRecordsStore((state) => state.setSelectedRecord)
  const deleteRecord = useRecordsStore((state) => state.deleteRecord)

  if (!selectedRecord) return null

  function handleDelete() {
    if (!selectedRecord) return
    deleteRecord(selectedRecord.id)
    setSelectedRecord(null)
  }

  return (
    <div style={{
      width: "240px",
      flexShrink: 0,
      background: "#0D0D0D",
      borderLeft: "1px solid #222",
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
        borderBottom: "1px solid #222",
      }}>
        <span style={{ color: "#888", fontSize: "13px" }}>Details</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: "18px", cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {/* COVER */}
      <div style={{
        margin: "16px 20px",
        borderRadius: "12px",
        overflow: "hidden",
        aspectRatio: "1",
        background: "#1E1E1E",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {selectedRecord.cover_url ? (
          <img
            src={selectedRecord.cover_url}
            alt={selectedRecord.album}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: "48px" }}>🎵</span>
        )}
      </div>

      {/* INFO */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <h2 style={{ color: "white", margin: 0, fontSize: "18px" }}>{selectedRecord.artist}</h2>
        <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>{selectedRecord.album}</p>

        {selectedRecord.year && (
          <p style={{ color: "#555", margin: 0, fontSize: "13px" }}>{selectedRecord.year}</p>
        )}

        {selectedRecord.genre && (
          <span style={{
            display: "inline-block",
            background: "#1E1E1E",
            color: "#888",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "12px",
            alignSelf: "flex-start",
          }}>
            {selectedRecord.genre}
          </span>
        )}

        <div style={{
          padding: "8px 12px",
          background: "#1E1E1E",
          borderRadius: "8px",
          fontSize: "12px",
          color: selectedRecord.favorite ? "#FACC15" : "#555",
        }}>
          {selectedRecord.favorite ? "★ Favorite" : "☆ Not a favorite"}
        </div>

        <div style={{
          padding: "8px 12px",
          background: "#1E1E1E",
          borderRadius: "8px",
          fontSize: "12px",
          color: selectedRecord.status === "owned" ? "#4ADE80" : "#60A5FA",
        }}>
          {selectedRecord.status === "owned" ? "✓ Owned" : "◎ Wishlist"}
        </div>
      </div>

      {/* DELETE */}
      <div style={{ padding: "20px" }}>
        <button
          onClick={handleDelete}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            background: "#1E1E1E",
            color: "#991B1B",
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