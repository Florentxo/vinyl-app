import { useState, useEffect } from "react"

import VinylSearch from "../components/VinylSearch"
import RecordCard from "../components/RecordCard"
import SearchBar from "../components/SearchBar"

import { useRecordsStore } from "../store/recordsStore"
import type { VinylRecord } from "../types/record"

interface GenericViewProps {
  title: string
  type: "collection" | "favorites" | "wishlist"
}

export default function GenericView({ title, type }: GenericViewProps) {
  const [search, setSearch] = useState("")
  const [error] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900)

  const records = useRecordsStore((state) => state.records)
  const selectedRecord = useRecordsStore((state) => state.selectedRecord)
  const setSelectedRecord = useRecordsStore((state) => state.setSelectedRecord)
  const addRecord = useRecordsStore((state) => state.addRecord)
  const deleteRecord = useRecordsStore((state) => state.deleteRecord)
  const toggleFavorite = useRecordsStore((state) => state.toggleFavorite)
  const changeStatus = useRecordsStore((state) => state.changeStatus)

  useEffect(() => {
    setSelectedRecord(null)
  }, [type])

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  function selectItem(item: VinylRecord) {
    setSelectedRecord(item)
  }

  function deleteItem() {
    if (!selectedRecord) return
    deleteRecord(selectedRecord.id)
    setSelectedRecord(null)
  }

  const filteredItems = records.filter((item) => {
    const matchesSearch =
      item.artist.toLowerCase().includes(search.toLowerCase()) ||
      item.album.toLowerCase().includes(search.toLowerCase())

    if (type === "favorites") return item.favorite && matchesSearch
    if (type === "wishlist") return item.status === "wishlist" && matchesSearch
    return item.status === "owned" && matchesSearch
  })

  return (
    <div style={mainStyle}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "24px" }}>
        <h1 style={titleStyle}>{title}</h1>
        <span style={{ color: "#555", fontSize: "16px" }}>
          {filteredItems.length} vinyl{filteredItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ERROR */}
      {error && <div style={errorStyle}>{error}</div>}

      {/* SEARCH */}
      <SearchBar value={search} onChange={setSearch} />

      {/* VINYL SEARCH — desktop uniquement */}
      {type !== "favorites" && !isMobile && (
        <VinylSearch
          onAdd={(record) => {
            addRecord({
              ...record,
              id: Date.now().toString(),
              favorite: false,
              status: type === "wishlist" ? "wishlist" : "owned",
            })
          }}
        />
      )}

      {/* RECORDS */}
      <div style={{ ...cardsContainerStyle, paddingBottom: isMobile ? "80px" : "0" }}>
        {filteredItems.map((item) => (
          <RecordCard
            key={item.id}
            item={item}
            type={type}
            isSelected={selectedRecord?.id === item.id}
            onSelect={selectItem}
            onToggleFlag={() => toggleFavorite(item.id)}
            onChangeStatus={(item, status) => changeStatus(item.id, status)}
          />
        ))}
      </div>

      {/* BOUTON FLOTTANT — mobile uniquement */}
      {type !== "favorites" && isMobile && (
        <button onClick={() => setModalOpen(true)} style={fabStyle}>
          +
        </button>
      )}

      {/* MODAL DETAILS — mobile */}
      {selectedRecord && isMobile && (
        <div style={detailsOverlayStyle} onClick={() => setSelectedRecord(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>

            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "16px" }}>
              {selectedRecord.cover_url && (
                <img
                  src={selectedRecord.cover_url}
                  alt={selectedRecord.album}
                  style={{ width: "72px", height: "72px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h2 style={{ color: "white", margin: 0, fontSize: "18px" }}>{selectedRecord.artist}</h2>
                  <button onClick={() => setSelectedRecord(null)} style={closeButtonStyle}>✕</button>
                </div>
                <p style={{ color: "#888", margin: "4px 0 0 0", fontSize: "15px" }}>{selectedRecord.album}</p>
                {selectedRecord.year && (
                  <p style={{ color: "#555", margin: "2px 0 0 0", fontSize: "13px" }}>{selectedRecord.year}</p>
                )}
              </div>
            </div>

            {selectedRecord.genre && (
              <span style={{
                display: "inline-block",
                background: "#111",
                color: "#888",
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "12px",
              }}>
                {selectedRecord.genre}
              </span>
            )}

            <div style={{
              padding: "10px 14px",
              background: "#111",
              borderRadius: "10px",
              fontSize: "13px",
              color: selectedRecord.favorite ? "#FACC15" : "#555",
            }}>
              {selectedRecord.favorite ? "★ Favorite" : "☆ Not a favorite"}
            </div>

            <div style={{
              padding: "10px 14px",
              background: "#111",
              borderRadius: "10px",
              fontSize: "13px",
              color: selectedRecord.status === "owned" ? "#4ADE80" : "#60A5FA",
            }}>
              {selectedRecord.status === "owned" ? "✓ Owned" : "◎ Wishlist"}
            </div>
            
            {/* DELETE */}
            <button
              onClick={deleteItem}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: "#111",
                color: "#991B1B",
                fontSize: "14px",
                cursor: "pointer",
                marginTop: "4px",
              }}
            >
              Delete vinyl
            </button>
            
          </div>
        </div>
      )}

      {/* MODAL AJOUT — mobile */}
      {modalOpen && (
        <div style={overlayStyle} onClick={() => setModalOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ color: "white", margin: 0, fontSize: "18px" }}>Add a vinyl</h2>
              <button onClick={() => setModalOpen(false)} style={closeButtonStyle}>✕</button>
            </div>
            <VinylSearch
              onAdd={(record) => {
                addRecord({
                  ...record,
                  id: Date.now().toString(),
                  favorite: false,
                  status: type === "wishlist" ? "wishlist" : "owned",
                })
                setModalOpen(false)
              }}
            />
          </div>
        </div>
      )}

    </div>
  )
}

const mainStyle = {
  flex: 1,
  width: "100%",
  minWidth: 0,
  background: "#111111",
  padding: "30px",
  overflowY: "auto" as const,
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const,
  position: "relative" as const,
}

const titleStyle = {
  color: "white",
  fontSize: "30px",
  margin: 0,
}

const errorStyle = {
  background: "#991B1B",
  color: "white",
  padding: "14px",
  borderRadius: "12px",
  marginBottom: "20px",
}

const cardsContainerStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "14px",
}

const fabStyle = {
  position: "fixed" as const,
  bottom: "80px",
  right: "20px",
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  background: "#2563EB",
  color: "white",
  fontSize: "28px",
  border: "none",
  cursor: "pointer",
  zIndex: 99,
  boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
}

const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  zIndex: 200,
  display: "flex",
  alignItems: "flex-end",
}

const detailsOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 150,
  display: "flex",
  alignItems: "flex-end",
  paddingBottom: "65px",
}

const modalStyle = {
  background: "#1E1E1E",
  borderRadius: "20px 20px 0 0",
  padding: "24px",
  width: "100%",
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
}

const closeButtonStyle = {
  background: "none",
  border: "none",
  color: "#666",
  fontSize: "20px",
  cursor: "pointer",
}