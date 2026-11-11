import { useEffect, useRef, useState } from "react"
import { ChevronLeft, Search } from "lucide-react"
import { colors } from "../../../theme"
import { genreKey } from "../utils/genres"
import type { GenreOption } from "../utils/genres"

interface GenreFilterDrawerProps {
  options: GenreOption[]
  selected: string[]
  resultCount: number
  onToggle: (key: string) => void
  onClear: () => void
  onClose: () => void
}

export default function GenreFilterDrawer({ options, selected, resultCount, onToggle, onClear, onClose }: GenreFilterDrawerProps) {
  const [query, setQuery] = useState("")
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  const needle = genreKey(query)
  const visible = needle ? options.filter((option) => option.key.includes(needle)) : options

  return (
    <div
      role="dialog"
      aria-label="Genre / Style"
      style={overlayStyle}
      onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }}
      onTouchEnd={(event) => {
        const start = touchStart.current
        touchStart.current = null
        if (!start) return
        const dx = event.changedTouches[0].clientX - start.x
        const dy = Math.abs(event.changedTouches[0].clientY - start.y)
        if (dx > 80 && dy < 60) onClose()
      }}
    >
      <div style={headerStyle}>
        <button type="button" onClick={onClose} aria-label="Back" style={iconButtonStyle}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <span style={{ flex: 1, fontWeight: "bold", color: colors.textPrimary }}>Genre / Style</span>
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={onClear}
          style={{ ...clearStyle, opacity: selected.length ? 1 : 0.4 }}
        >
          Clear
        </button>
      </div>

      <label style={searchStyle}>
        <Search size={16} aria-hidden="true" color={colors.textTertiary} />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter genres…"
          aria-label="Filter genres"
          style={searchInputStyle}
        />
      </label>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {visible.length === 0 && <p style={{ padding: "16px", color: colors.textTertiary, fontSize: "13px" }}>No genre found</p>}
        {visible.map((option) => {
          const checked = selected.includes(option.key)
          return (
            <label key={option.key} style={{ ...rowStyle, background: checked ? colors.accentBg : "transparent" }}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(option.key)} style={{ accentColor: colors.accent, width: "18px", height: "18px" }} />
              <span style={{ flex: 1, color: checked ? colors.accent : colors.textPrimary }}>{option.label}</span>
              <span style={{ color: colors.textTertiary, fontSize: "12px" }}>{option.count}</span>
            </label>
          )
        })}
      </div>

      <div style={footerStyle}>
        <button type="button" onClick={onClose} style={doneStyle}>
          Show {resultCount} vinyl{resultCount !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: "fixed" as const,
  top: 0,
  right: 0,
  bottom: 0,
  width: "min(360px, 100vw)",
  zIndex: 250,
  display: "flex",
  flexDirection: "column" as const,
  background: colors.bgSecondary,
  borderLeft: `1px solid ${colors.border}`,
  boxShadow: "-6px 0 20px rgba(0,0,0,0.3)",
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "12px",
  borderBottom: `1px solid ${colors.border}`,
}

const iconButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  background: "none",
  border: "none",
  color: colors.textPrimary,
  cursor: "pointer",
}

const clearStyle = {
  background: "none",
  border: "none",
  color: colors.accent,
  fontSize: "14px",
  cursor: "pointer",
}

const searchStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  margin: "12px",
  padding: "0 10px",
  borderRadius: "8px",
  border: `1px solid ${colors.border}`,
  background: colors.bg,
}

const searchInputStyle = {
  flex: 1,
  minWidth: 0,
  padding: "10px 0",
  border: "none",
  outline: "none",
  background: "transparent",
  color: colors.textPrimary,
  fontSize: "16px",
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  fontSize: "15px",
  cursor: "pointer",
}

const footerStyle = {
  padding: "12px",
  borderTop: `1px solid ${colors.border}`,
}

const doneStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  background: colors.accent,
  color: "#fff",
  fontSize: "15px",
  cursor: "pointer",
}
