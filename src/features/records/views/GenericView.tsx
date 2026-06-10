import { useState } from "react"

import VinylSearch from "../components/VinylSearch"
import RecordCard from "../components/RecordCard"
import SearchBar from "../components/SearchBar"
import TracklistSection from "../components/TracklistSection"

import { useRecordsStore } from "../store/recordsStore"
import { useIsMobile } from "../../../shared/hooks/useIsMobile"
import type { VinylRecord } from "../types/record"

interface GenericViewProps {
  title: string
  type: "collection" | "favorites" | "wishlist"
}

export default function GenericView({ title, type }: GenericViewProps) {
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [mobileGenre, setMobileGenre] = useState("")
  const [mobileStyle, setMobileStyle] = useState("")

  const isMobile = useIsMobile()

  const records = useRecordsStore((state) => state.records)
  const selectedRecord = useRecordsStore((state) => state.selectedRecord)
  const setSelectedRecord = useRecordsStore((state) => state.setSelectedRecord)
  const addRecord = useRecordsStore((state) => state.addRecord)
  const deleteRecord = useRecordsStore((state) => state.deleteRecord)
  const toggleFavorite = useRecordsStore((state) => state.toggleFavorite)
  const changeStatus = useRecordsStore((state) => state.changeStatus)

  function selectItem(item: VinylRecord) {
    setSelectedRecord(item)
  }

  function deleteItem() {
    if (!selectedRecord) return
    deleteRecord(selectedRecord.id)
    setSelectedRecord(null)
  }

  function getListenUrls(artist: string, album: string) {
    const q = encodeURIComponent(`${artist} ${album}`)
    return {
      spotify: `spotify:search:${q}`,
      youtube: `https://www.youtube.com/results?search_query=${q}`,
      deezer: `https://www.deezer.com/search/${q}`,
    }
  }

  const filteredItems = records
    .filter((item) => {
      const matchesSearch =
        item.artist.toLowerCase().includes(search.toLowerCase()) ||
        item.album.toLowerCase().includes(search.toLowerCase())

      if (type === "favorites") return item.favorite && matchesSearch
      if (type === "wishlist") return item.status === "wishlist" && matchesSearch
      return item.status === "owned" && matchesSearch
    })
    .sort((a, b) => a.artist.localeCompare(b.artist))

  return (
    <div style={{ ...mainStyle, display: "flex", flexDirection: "column" }}>

      {/* STICKY HEADER */}
      <div style={{
        position: "sticky",
        top: 0,
        background: "#111111",
        zIndex: 10,
        paddingBottom: "16px",
      }}>

        {/* TITLE */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "16px" }}>
          <h1 style={titleStyle}>{title}</h1>
          <span style={{ color: "#555", fontSize: "16px" }}>
            {filteredItems.length} vinyl{filteredItems.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* DESKTOP — two bars side by side */}
        {!isMobile && (
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#555", fontSize: "12px", margin: "0 0 6px 0", letterSpacing: "0.5px" }}>
                SEARCH
              </p>
              <SearchBar value={search} onChange={setSearch} />
            </div>

            {type !== "favorites" && (
              <div style={{ flex: 1 }}>
                <p style={{ color: "#555", fontSize: "12px", margin: "0 0 6px 0", letterSpacing: "0.5px" }}>
                  ADD A VINYL
                </p>
                <VinylSearch
                  onAdd={(record) => {
                    const existing = records.find(
                      (r) =>
                        r.artist.toLowerCase().trim() === record.artist.toLowerCase().trim() &&
                        r.album.toLowerCase().trim() === record.album.toLowerCase().trim()
                    )
                    if (existing && existing.status === "wishlist" && type === "collection") {
                      changeStatus(existing.id, "owned")
                      return
                    }
                    addRecord({
                      ...record,
                      id: Date.now().toString(),
                      favorite: false,
                      status: type === "wishlist" ? "wishlist" : "owned",
                    })
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* MOBILE — search bar only */}
        {isMobile && <SearchBar value={search} onChange={setSearch} />}

      </div>

      {/* SCROLLABLE RECORDS LIST */}
      <div style={{ ...cardsContainerStyle, paddingBottom: isMobile ? "80px" : "0", overflowY: "auto", flex: 1 }}>
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

      {/* FLOATING BUTTON — mobile only */}
      {type !== "favorites" && isMobile && (
        <button onClick={() => setModalOpen(true)} style={fabStyle}>+</button>
      )}

      {/* DETAILS MODAL — mobile only */}
      {selectedRecord && isMobile && (
        <div style={detailsOverlayStyle} onClick={() => setSelectedRecord(null)}>
          <div
            style={{ ...modalStyle, maxHeight: "calc(85vh - 65px)", overflowY: "auto" as const }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const urls = getListenUrls(selectedRecord.artist, selectedRecord.album)
              return (
                <>
                  {/* HEADER */}
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
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

                  {/* GENRE & STYLE */}
                  {(mobileGenre || mobileStyle) && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {mobileGenre && (
                        <span style={{ background: "#0D0D0D", color: "#888", borderRadius: "20px", padding: "4px 12px", fontSize: "12px" }}>
                          {mobileGenre}
                        </span>
                      )}
                      {mobileStyle && (
                        <span style={{ background: "#0D0D0D", color: "#2563EB", borderRadius: "20px", padding: "4px 12px", fontSize: "12px" }}>
                          {mobileStyle}
                        </span>
                      )}
                    </div>
                  )}

                  {/* LISTEN ON */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <a href={urls.spotify} target="_blank" rel="noopener noreferrer" style={spotifyLinkStyle}>Spotify</a>
                    <a href={urls.youtube} target="_blank" rel="noopener noreferrer" style={youtubeLinkStyle}>YouTube</a>
                    <a href={urls.deezer} target="_blank" rel="noopener noreferrer" style={deezerLinkStyle}>Deezer</a>
                  </div>

                  {/* TRACKLIST */}
                  <TracklistSection
                    artist={selectedRecord.artist}
                    album={selectedRecord.album}
                    recordId={selectedRecord.id}
                    onGenreStyle={(g, s) => { setMobileGenre(g); setMobileStyle(s) }}
                  />

                  {/* DELETE */}
                  <button onClick={deleteItem} style={deleteButtonStyle}>
                    Delete vinyl
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ADD VINYL MODAL — mobile only */}
      {modalOpen && (
        <div style={addModalStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "white", margin: 0, fontSize: "18px" }}>Add a vinyl</h2>
            <button onClick={() => setModalOpen(false)} style={closeButtonStyle}>✕</button>
          </div>
          <VinylSearch
            onAdd={(record) => {
              const existing = records.find(
                (r) =>
                  r.artist.toLowerCase().trim() === record.artist.toLowerCase().trim() &&
                  r.album.toLowerCase().trim() === record.album.toLowerCase().trim()
              )
              if (existing && existing.status === "wishlist" && type === "collection") {
                changeStatus(existing.id, "owned")
                return
              }
              addRecord({
                ...record,
                id: Date.now().toString(),
                favorite: false,
                status: type === "wishlist" ? "wishlist" : "owned",
              })
            }}
          />
        </div>
      )}

    </div>
  )
}

// =================================================
// STYLES
// =================================================

const mainStyle = {
  flex: 1,
  width: "100%",
  minWidth: 0,
  background: "#111111",
  padding: "30px",
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const,
  position: "relative" as const,
}

const titleStyle = {
  color: "white",
  fontSize: "30px",
  margin: 0,
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

const detailsOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 150,
  display: "flex",
  alignItems: "flex-end" as const,
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

const deleteButtonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  background: "#111",
  color: "#991B1B",
  fontSize: "14px",
  cursor: "pointer",
  marginTop: "4px",
}

const addModalStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "#111111",
  zIndex: 200,
  display: "flex",
  flexDirection: "column" as const,
  padding: "20px",
  paddingBottom: "80px",
}

const spotifyLinkStyle = {
  background: "#111",
  color: "#1DB954",
  borderRadius: "20px",
  padding: "5px 12px",
  fontSize: "12px",
  textDecoration: "none" as const,
  border: "1px solid #1DB95433",
}

const youtubeLinkStyle = {
  background: "#111",
  color: "#FF0000",
  borderRadius: "20px",
  padding: "5px 12px",
  fontSize: "12px",
  textDecoration: "none" as const,
  border: "1px solid #FF000033",
}

const deezerLinkStyle = {
  background: "#111",
  color: "#A238FF",
  borderRadius: "20px",
  padding: "5px 12px",
  fontSize: "12px",
  textDecoration: "none" as const,
  border: "1px solid #A238FF33",
}