import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowDownWideNarrow, ChevronDown, ChevronUp, LayoutGrid, List, ListFilter, Pencil, Plus, ScanLine } from "lucide-react"

import VinylSearch from "../components/VinylSearch"
import RecordCard from "../components/RecordCard"
import RecordGridCard from "../components/RecordGridCard"
import SearchBar from "../components/SearchBar"
import TracklistSection from "../components/TracklistSection"
import RecordPhotosDialog from "../components/RecordPhotosDialog"
import { useSortKey } from "../hooks/useSortKey"
import ScanDialog from "../components/ScanDialog"
import { getDisplayCover } from "../utils/photos"
import { LIST_COLUMN_GAP, LIST_COLUMNS, LIST_ROW_PADDING_LEFT, LIST_ROW_PADDING_RIGHT } from "../utils/listLayout"

import { useRecordsStore } from "../store/recordsStore"
import { useIsMobile } from "../../../shared/hooks/useIsMobile"
import { colors } from "../../../theme"
import type { VinylRecord } from "../types/record"

interface GenericViewProps {
  title: string
  type: "collection" | "favorites" | "wishlist"
}

type SortOrder = "artist" | "artist-desc" | "album" | "album-desc" | "genre" | "genre-desc" | "year-newest" | "year-oldest"
type ViewMode = "list" | "grid"

const VIEW_MODE_KEY = "vinyl-view-mode"

function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "grid" ? "grid" : "list"
  } catch {
    return "list"
  }
}

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "artist", label: "Artist A-Z" },
  { value: "artist-desc", label: "Artist Z-A" },
  { value: "album", label: "Album A-Z" },
  { value: "album-desc", label: "Album Z-A" },
  { value: "genre", label: "Genre A-Z" },
  { value: "genre-desc", label: "Genre Z-A" },
  { value: "year-newest", label: "Year : Newest" },
  { value: "year-oldest", label: "Year : Oldest" },
]

export default function GenericView({ title, type }: GenericViewProps) {
  const [search, setSearch] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>("artist")
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [prefill, setPrefill] = useState<{ artist: string; album: string; alternates?: { artist: string; album: string } } | null>(null)

  function openAddDialog() {
    setPrefill(null)
    setModalOpen(true)
  }
  const [editId, setEditId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [mobileGenre, setMobileGenre] = useState("")
  const [mobileStyle, setMobileStyle] = useState("")
  const updateMobileGenreStyle = useCallback((g: string, s: string) => { setMobileGenre(g); setMobileStyle(s) }, [])
  const sortControlRef = useRef<HTMLDivElement>(null)
  const sortTriggerRef = useRef<HTMLButtonElement>(null)
  const sortOptionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const filterSearchRef = useRef<HTMLDivElement>(null)

  const isMobile = useIsMobile()

  const records = useRecordsStore((state) => state.records)
  const recordsLoading = useRecordsStore((state) => state.loading)
  const recordsError = useRecordsStore((state) => state.error)
  const selectedRecord = useRecordsStore((state) => state.selectedRecord)
  const setSelectedRecord = useRecordsStore((state) => state.setSelectedRecord)
  const clearError = useRecordsStore((state) => state.clearError)
  const addRecord = useRecordsStore((state) => state.addRecord)
  const deleteRecord = useRecordsStore((state) => state.deleteRecord)
  const toggleFavorite = useRecordsStore((state) => state.toggleFavorite)
  const changeStatus = useRecordsStore((state) => state.changeStatus)

  useEffect(() => {
    if (!openActionsId) return
    function closeActionsOnOutside(event: PointerEvent) {
      if (!(event.target instanceof Element) || event.target.closest("[data-record-actions-id]")?.getAttribute("data-record-actions-id") !== openActionsId) {
        setOpenActionsId(null)
      }
    }
    document.addEventListener("pointerdown", closeActionsOnOutside)
    return () => document.removeEventListener("pointerdown", closeActionsOnOutside)
  }, [openActionsId])

  useEffect(() => {
    if (!sortMenuOpen) return

    const selectedIndex = sortOptions.findIndex((option) => option.value === sortOrder)
    sortOptionRefs.current[selectedIndex]?.focus()

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!sortControlRef.current?.contains(event.target as Node)) setSortMenuOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      setSortMenuOpen(false)
      sortTriggerRef.current?.focus()
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [sortMenuOpen, sortOrder])

  useEffect(() => {
    if (!filterOpen) return

    function closeFilterOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node
      if (filterTriggerRef.current?.contains(target) || filterSearchRef.current?.contains(target)) return
      setFilterOpen(false)
    }

    document.addEventListener("pointerdown", closeFilterOnOutsidePointer)
    return () => document.removeEventListener("pointerdown", closeFilterOnOutsidePointer)
  }, [filterOpen])

  function selectItem(item: VinylRecord) {
    setSelectedRecord(item)
  }

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode)
    try { localStorage.setItem(VIEW_MODE_KEY, mode) } catch { /* storage unavailable */ }
  }

  async function deleteItem() {
    if (!selectedRecord) return
    if (!window.confirm(`Delete "${selectedRecord.album}" from your records?`)) return
    await deleteRecord(selectedRecord.id)
  }

  function getListenUrls(artist: string, album: string) {
    const q = encodeURIComponent(`${artist} ${album}`)
    return {
      spotify: `spotify:search:${q}`,
      youtube: `https://www.youtube.com/results?search_query=${q}`,
      deezer: `https://www.deezer.com/search/${q}`,
    }
  }

  async function addOrMove(record: Omit<VinylRecord, "id" | "favorite" | "status">) {
    const existing = records.find(
      (r) =>
        r.artist.toLowerCase().trim() === record.artist.toLowerCase().trim() &&
        r.album.toLowerCase().trim() === record.album.toLowerCase().trim()
    )
    if (existing && existing.status === "wishlist" && type === "collection") {
      return changeStatus(existing.id, "owned")
    }
    return addRecord({
      ...record,
      favorite: false,
      status: type === "wishlist" ? "wishlist" : "owned",
    })
  }

  const editRecord = records.find((record) => record.id === editId) ?? null
  const sortKeyOf = useSortKey(records.flatMap((record) => [record.artist, record.album]))

  const filteredItems = records
    .filter((item) => {
      const matchesSearch =
        item.artist.toLowerCase().includes(search.toLowerCase()) ||
        item.album.toLowerCase().includes(search.toLowerCase())

      if (type === "favorites") return item.favorite && matchesSearch
      if (type === "wishlist") return item.status === "wishlist" && matchesSearch
      return item.status === "owned" && matchesSearch
    })
    .sort((a, b) => {
      const artistOrder = sortKeyOf(a.artist).localeCompare(sortKeyOf(b.artist), undefined, { sensitivity: "base" })
      if (sortOrder === "artist-desc") return -artistOrder
      if (sortOrder === "album" || sortOrder === "album-desc") {
        const albumOrder = sortKeyOf(a.album).localeCompare(sortKeyOf(b.album), undefined, { sensitivity: "base" })
        if (albumOrder !== 0) return sortOrder === "album-desc" ? -albumOrder : albumOrder
        return artistOrder
      }
      if (sortOrder === "genre" || sortOrder === "genre-desc") {
        const genreA = a.genre.trim()
        const genreB = b.genre.trim()
        if (Boolean(genreA) !== Boolean(genreB)) return genreA ? -1 : 1
        const genreOrder = genreA.localeCompare(genreB, undefined, { sensitivity: "base" })
        return (sortOrder === "genre-desc" ? -genreOrder : genreOrder) || artistOrder
      }
      if (sortOrder === "year-newest" || sortOrder === "year-oldest") {
        const yearA = Number.parseInt(a.year, 10)
        const yearB = Number.parseInt(b.year, 10)
        const hasYearA = Number.isFinite(yearA)
        const hasYearB = Number.isFinite(yearB)

        if (hasYearA !== hasYearB) return hasYearA ? -1 : 1
        if (hasYearA && hasYearB && yearA !== yearB) {
          return sortOrder === "year-newest" ? yearB - yearA : yearA - yearB
        }
      }
      return artistOrder
    })

  const sortControl = (
    <div ref={sortControlRef} style={isMobile ? sortControlStyle : { ...sortControlStyle, flex: "0 0 130px" }}>
      <div style={sortMenuContainerStyle}>
        <button
          ref={sortTriggerRef}
          type="button"
          aria-label="Sort records"
          aria-haspopup="menu"
          aria-expanded={sortMenuOpen}
          aria-controls="record-sort-menu"
          onClick={() => setSortMenuOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") setSortMenuOpen(true)
          }}
          style={toolbarButtonStyle}
        >
          <ArrowDownWideNarrow aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>Sort</span>
        </button>
        {sortMenuOpen && (
          <div
            id="record-sort-menu"
            role="menu"
            aria-label="Sort records"
            style={sortOptionsMenuStyle}
            onKeyDown={(event) => {
              const currentIndex = sortOptions.findIndex((option) => option.value === sortOrder)
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault()
                const direction = event.key === "ArrowDown" ? 1 : -1
                const nextIndex = (currentIndex + direction + sortOptions.length) % sortOptions.length
                sortOptionRefs.current[nextIndex]?.focus()
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault()
                const nextIndex = event.key === "Home" ? 0 : sortOptions.length - 1
                sortOptionRefs.current[nextIndex]?.focus()
              }
            }}
          >
            {sortOptions.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => { sortOptionRefs.current[index] = element }}
                type="button"
                role="menuitemradio"
                aria-checked={sortOrder === option.value}
                tabIndex={sortOrder === option.value ? 0 : -1}
                onClick={() => {
                  setSortOrder(option.value)
                  setSortMenuOpen(false)
                  sortTriggerRef.current?.focus()
                }}
                style={{
                  ...sortOptionStyle,
                  background: sortOrder === option.value ? colors.accentBg : "transparent",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const filterToggle = (
    <button
      ref={filterTriggerRef}
      type="button"
      aria-label="Filter records"
      aria-expanded={filterOpen}
      aria-controls={filterOpen ? "record-filter" : undefined}
      onClick={() => setFilterOpen((open) => !open)}
      style={{ ...toolbarButtonStyle, width: "100%", color: filterOpen || search ? colors.accent : colors.textPrimary }}
    >
      <ListFilter aria-hidden="true" size={18} strokeWidth={1.8} />
      <span>Filter</span>
    </button>
  )

  const filterSearch = filterOpen && (
    <div ref={filterSearchRef} id="record-filter" style={isMobile ? filterInputStyle : { ...filterInputStyle, right: "auto", width: "300px" }}>
      <SearchBar compact value={search} onChange={setSearch} />
    </div>
  )

  function columnHeader(label: string, ascending: SortOrder, descending: SortOrder) {
    const active = sortOrder === ascending || sortOrder === descending
    const Arrow = sortOrder === descending ? ChevronDown : ChevronUp
    return (
      <button
        key={label}
        type="button"
        onClick={() => setSortOrder(sortOrder === ascending ? descending : ascending)}
        aria-label={`Sort by ${label}`}
        style={{ ...columnHeaderButtonStyle, color: active ? colors.accent : colors.textSecondary }}
      >
        {label}
        {active && <Arrow aria-hidden="true" size={14} />}
      </button>
    )
  }

  const viewToggle = (
    <div role="group" aria-label="Display mode" style={isMobile ? viewToggleStyle : { ...viewToggleStyle, marginLeft: "auto" }}>
      {([["list", List, "List view"], ["grid", LayoutGrid, "Grid view"]] as const).map(([mode, Icon, label]) => (
        <button
          key={mode}
          type="button"
          aria-label={label}
          aria-pressed={viewMode === mode}
          onClick={() => changeViewMode(mode)}
          style={{ ...viewToggleButtonStyle, background: viewMode === mode ? colors.accentBg : "transparent", color: viewMode === mode ? colors.accent : colors.textMuted }}
        >
          <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  )

  const filterToolbar = (
    <div style={toolbarStyle}>
      <div style={isMobile ? filterControlStyle : { ...filterControlStyle, flex: "0 0 130px" }}>
        {filterToggle}
        {filterSearch}
      </div>
      {sortControl}
      {viewToggle}
    </div>
  )

  return (
      <div
        style={{ ...mainStyle, display: "flex", flexDirection: "column" }}
        onClick={() => setSelectedRecord(null)}
      >

      {/* STICKY HEADER */}
      <div style={{
        position: "sticky",
        top: 0,
        background: colors.bg,
        zIndex: 10,
        paddingBottom: "16px",
      }}>

        {/* TITLE */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "16px" }}>
          <h1 style={titleStyle}>{title}</h1>
          <span style={{ color: colors.textSecondary, fontSize: "16px" }}>
            {filteredItems.length} vinyl{filteredItems.length !== 1 ? "s" : ""}
          </span>
          {type !== "favorites" && !isMobile && (
            <div style={{ display: "flex", gap: "8px", marginLeft: "auto", alignSelf: "center" }}>
              <button type="button" onClick={(event) => { event.stopPropagation(); setScanOpen(true) }} style={scanButtonStyle}>
                <ScanLine aria-hidden="true" size={16} /> Scan
              </button>
              <button type="button" onClick={(event) => { event.stopPropagation(); openAddDialog() }} style={addButtonStyle}>
                <Plus aria-hidden="true" size={16} /> Add a vinyl
              </button>
            </div>
          )}
        </div>

        {filterToolbar}

      </div>

      {recordsError && (
        <div role="alert" style={errorBannerStyle}>
          <span>{recordsError}</span>
          <button type="button" onClick={clearError} style={dismissButtonStyle}>Dismiss</button>
        </div>
      )}

      {/* SCROLLABLE RECORDS LIST */}
      <div style={{ ...(viewMode === "grid" ? gridContainerStyle : cardsContainerStyle), paddingBottom: isMobile ? "80px" : "0", overflowY: "auto", flex: 1, alignContent: "start", ...(viewMode === "list" ? { maxWidth: "1100px" } : {}) }}>
        {viewMode === "list" && !isMobile && filteredItems.length > 0 && (
          <div role="row" style={listHeaderStyle}>
            <span />
            <span style={{ display: "flex", gap: "14px" }}>
              {columnHeader("Album", "album", "album-desc")}
              {columnHeader("Artist", "artist", "artist-desc")}
            </span>
            {columnHeader("Year", "year-newest", "year-oldest")}
            {columnHeader("Genre", "genre", "genre-desc")}
          </div>
        )}
        {recordsLoading && <p style={{ ...emptyStateStyle, gridColumn: "1 / -1" }}>Loading your records...</p>}
        {!recordsLoading && filteredItems.length === 0 && !recordsError && (
          <p style={{ ...emptyStateStyle, gridColumn: "1 / -1" }}>No records found.</p>
        )}
        {filteredItems.map((item) => viewMode === "grid" ? (
          <RecordGridCard
            key={item.id}
            item={item}
            isSelected={selectedRecord?.id === item.id}
            onSelect={selectItem}
            onToggleFlag={() => toggleFavorite(item.id)}
            onMoveToCollection={() => changeStatus(item.id, "owned")}
            onEdit={(record) => setEditId(record.id)}
          />
        ) : (
          <RecordCard
            key={item.id}
            item={item}
            showColumns={!isMobile}
            onEdit={(record) => setEditId(record.id)}
            actionsOpen={openActionsId === item.id}
            onActionsOpenChange={(open) => setOpenActionsId(open ? item.id : null)}
            isSelected={selectedRecord?.id === item.id}
            onSelect={selectItem}
            onToggleFlag={() => toggleFavorite(item.id)}
            onChangeStatus={(item, status) => changeStatus(item.id, status)}
            onDelete={(item) => deleteRecord(item.id)}
          />
        ))}
      </div>

      {/* FLOATING BUTTON — mobile only */}
      {type !== "favorites" && isMobile && (
        <>
          <button onClick={() => setScanOpen(true)} style={scanFabStyle} aria-label="Scan a record"><ScanLine size={24} aria-hidden="true" /></button>
          <button onClick={openAddDialog} style={fabStyle} aria-label="Add a vinyl">+</button>
        </>
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
                    <div style={{ position: "relative", width: "88px", height: "88px", flexShrink: 0, borderRadius: "8px", overflow: "hidden", background: colors.card, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {getDisplayCover(selectedRecord)
                        ? <img src={getDisplayCover(selectedRecord)} alt={selectedRecord.album} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: "28px" }}>🎵</span>}
                      <button
                        type="button"
                        onClick={() => setEditId(selectedRecord.id)}
                        aria-label="Edit cover"
                        style={{ position: "absolute", right: "4px", bottom: "4px",                         width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", padding: 0 }}
                      >
                                                <Pencil size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <h2 style={{ color: colors.textPrimary, margin: 0, fontSize: "18px" }}>{selectedRecord.artist}</h2>
                        <button onClick={() => setSelectedRecord(null)} style={closeButtonStyle}>✕</button>
                      </div>
                      <p style={{ color: colors.textSecondary, margin: "4px 0 0 0", fontSize: "15px" }}>{selectedRecord.album}</p>
                      {selectedRecord.year && (
                        <p style={{ color: colors.textTertiary, margin: "2px 0 0 0", fontSize: "13px" }}>{selectedRecord.year}</p>
                      )}
                    </div>
                  </div>

                  {/* GENRE & STYLE */}
                  {(mobileGenre || mobileStyle) && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {mobileGenre && (
                        <span style={genreTagStyle}>{mobileGenre}</span>
                      )}
                      {mobileStyle && (
                        <span style={styleTagStyle}>{mobileStyle}</span>
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
                    discogsReleaseId={selectedRecord.discogs_release_id}
                    onGenreStyle={updateMobileGenreStyle}
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

      {editRecord && (
        <RecordPhotosDialog key={editRecord.id} record={editRecord} onClose={() => setEditId(null)} />
      )}

      {scanOpen && (
        <ScanDialog
          onClose={() => setScanOpen(false)}
          onIdentified={(result) => {
            setScanOpen(false)
            setPrefill(result)
            setModalOpen(true)
          }}
        />
      )}

      {/* ADD VINYL MODAL — fullscreen on mobile, centered on desktop */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add a vinyl"
          style={isMobile ? addModalStyle : addDialogOverlayStyle}
          onClick={(event) => { event.stopPropagation(); if (!isMobile) setModalOpen(false) }}
        >
          <div
            style={isMobile ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : addDialogStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: colors.textPrimary, margin: 0, fontSize: "18px" }}>Add a vinyl</h2>
              <button onClick={() => setModalOpen(false)} aria-label="Close" style={closeButtonStyle}>✕</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}>
              <VinylSearch
                key={prefill ? `${prefill.artist}|${prefill.album}` : "blank"}
                isMobile={isMobile}
                initialArtist={prefill?.artist}
                initialAlbum={prefill?.album}
                alternates={prefill?.alternates}
                onAdd={async (record) => {
                  const added = await addOrMove(record)
                  if (added) setModalOpen(false)
                  return added
                }}
              />
            </div>
          </div>
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
  background: colors.bg,
  padding: "30px",
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const,
  position: "relative" as const,
}

const titleStyle = {
  color: colors.textPrimary,
  fontSize: "30px",
  margin: 0,
}

const sortControlStyle = {
  display: "flex",
  flex: 1,
  minWidth: 0,
}

const toolbarStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  minWidth: 0,
  marginTop: "10px",
  paddingTop: "8px",
  borderTop: `1px solid ${colors.border}`,
}

const toolbarButtonStyle = {
  display: "flex",
  flex: 1,
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "7px",
  minWidth: 0,
  padding: "9px 6px",
  border: "none",
  borderRadius: "6px",
  background: "transparent",
  color: colors.textPrimary,
  fontSize: "16px",
  textAlign: "left" as const,
  whiteSpace: "nowrap" as const,
  cursor: "pointer",
}

const filterControlStyle = {
  position: "relative" as const,
  flex: 1,
  minWidth: 0,
}

const filterInputStyle = {
  position: "absolute" as const,
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 40,
  boxSizing: "border-box" as const,
}

const sortMenuContainerStyle = {
  position: "relative" as const,
  flex: 1,
  minWidth: 0,
}

const sortTriggerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box" as const,
  padding: "10px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.border}`,
  background: colors.card,
  color: colors.textPrimary,
  textAlign: "left" as const,
  whiteSpace: "nowrap" as const,
  cursor: "pointer",
}

const sortOptionsMenuStyle = {
  position: "absolute" as const,
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 40,
  maxHeight: "min(220px, 45vh)",
  overflowY: "auto" as const,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  background: colors.card,
  boxShadow: "0 8px 20px rgba(58,46,34,0.16)",
}

const sortOptionStyle = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  minHeight: "40px",
  boxSizing: "border-box" as const,
  padding: "8px 12px",
  border: "none",
  color: colors.textPrimary,
  fontSize: "14px",
  textAlign: "left" as const,
  whiteSpace: "nowrap" as const,
  cursor: "pointer",
}

const cardsContainerStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "0",
}

const listHeaderStyle = {
  position: "sticky" as const,
  top: 0,
  zIndex: 5,
  display: "grid",
  gridTemplateColumns: LIST_COLUMNS,
  columnGap: `${LIST_COLUMN_GAP}px`,
  alignItems: "center",
  padding: `6px ${LIST_ROW_PADDING_RIGHT}px 6px ${LIST_ROW_PADDING_LEFT}px`,
  background: colors.bg,
  borderBottom: `1px solid ${colors.borderStrong}`,
  flexShrink: 0,
}

const columnHeaderButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
  padding: "4px 0",
  border: "none",
  background: "transparent",
  fontSize: "12px",
  letterSpacing: "0.5px",
  textTransform: "uppercase" as const,
  cursor: "pointer",
  justifySelf: "start",
}

const gridContainerStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: "18px 14px",
}

const viewToggleStyle = {
  display: "flex",
  flexShrink: 0,
  gap: "2px",
}

const viewToggleButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "38px",
  height: "38px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
}

const scanButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "9px 16px",
  border: `1px solid ${colors.accent}`,
  borderRadius: "20px",
  background: "transparent",
  color: colors.accent,
  fontSize: "14px",
  cursor: "pointer",
}

const scanFabStyle = {
  position: "fixed" as const,
  bottom: "146px",
  right: "12px",
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  background: colors.accent,
  color: "#fff",
  border: "none",
  cursor: "pointer",
  zIndex: 99,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: `0 4px 12px ${colors.textPrimary}66`,
}

const addButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginLeft: "auto",
  alignSelf: "center",
  padding: "9px 16px",
  border: "none",
  borderRadius: "20px",
  background: colors.accent,
  color: "#fff",
  fontSize: "14px",
  cursor: "pointer",
}

const addDialogOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(58,46,34,0.45)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
}

const addDialogStyle = {
  background: colors.bg,
  borderRadius: "16px",
  width: "100%",
  maxWidth: "640px",
  height: "min(85vh, 760px)",
  padding: "24px",
  boxSizing: "border-box" as const,
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
}

const fabStyle = {
  position: "fixed" as const,
  bottom: "80px",
  right: "12px",
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  background: colors.textPrimary,
  color: colors.card,
  fontSize: "28px",
  border: "none",
  cursor: "pointer",
  zIndex: 99,
  boxShadow: `0 4px 12px ${colors.textPrimary}66`,
}

const detailsOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(58,46,34,0.4)",
  zIndex: 150,
  display: "flex",
  alignItems: "flex-end" as const,
}

const modalStyle = {
  background: colors.bgSecondary,
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
  color: colors.textTertiary,
  fontSize: "20px",
  cursor: "pointer",
}

const deleteButtonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  background: colors.card,
  color: colors.danger,
  fontSize: "14px",
  cursor: "pointer",
  marginTop: "4px",
}

const addModalStyle = {
  position: "fixed" as const,
  inset: 0,
  background: colors.bg,
  zIndex: 200,
  display: "flex",
  flexDirection: "column" as const,
  padding: "20px",
  paddingBottom: "20px",
  overflow: "hidden",
}

const genreTagStyle = {
  background: colors.card,
  color: colors.textMuted,
  borderRadius: "20px",
  padding: "4px 12px",
  fontSize: "12px",
}

const styleTagStyle = {
  background: colors.card,
  color: colors.accent,
  borderRadius: "20px",
  padding: "4px 12px",
  fontSize: "12px",
}

const spotifyLinkStyle = {
  background: colors.card,
  color: colors.spotify,
  borderRadius: "20px",
  padding: "5px 12px",
  fontSize: "12px",
  textDecoration: "none" as const,
  border: `1px solid ${colors.spotify}33`,
}

const youtubeLinkStyle = {
  background: colors.card,
  color: colors.youtube,
  borderRadius: "20px",
  padding: "5px 12px",
  fontSize: "12px",
  textDecoration: "none" as const,
  border: `1px solid ${colors.youtube}33`,
}

const deezerLinkStyle = {
  background: colors.card,
  color: colors.deezer,
  borderRadius: "20px",
  padding: "5px 12px",
  fontSize: "12px",
  textDecoration: "none" as const,
  border: `1px solid ${colors.deezer}33`,
}

const emptyStateStyle = {
  color: colors.textTertiary,
  fontSize: "14px",
  textAlign: "center" as const,
  padding: "24px 12px",
}

const errorBannerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 12px",
  marginBottom: "12px",
  borderRadius: "8px",
  background: colors.card,
  color: colors.danger,
  fontSize: "13px",
}

const dismissButtonStyle = {
  border: "none",
  background: "transparent",
  color: colors.textMuted,
  cursor: "pointer",
  flexShrink: 0,
}