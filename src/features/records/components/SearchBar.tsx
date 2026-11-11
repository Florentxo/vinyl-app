import { ChangeEvent } from "react"
import { colors } from "../../../theme"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  compact?: boolean
  autoFocus?: boolean
  onEscape?: () => void
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search by artist or album...",
  compact = false,
  autoFocus = false,
  onEscape,
}: SearchBarProps) {
  function handleChange(
    e: ChangeEvent<HTMLInputElement>
  ) {
    onChange(e.target.value)
  }

  return (
    <input
      type="search"
      aria-label="Search in collection"
      enterKeyHint="search"
      autoComplete="off"
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onKeyDown={(e) => {
        if (e.key === "Escape") onEscape?.()
        else if (e.key === "Enter") e.currentTarget.blur()
      }}
      style={{ ...searchStyle, ...(compact ? compactSearchStyle : {}) }}
    />
  )
}

// =================================================
// STYLES
// =================================================

const searchStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "14px",
  border: `0.5px solid ${colors.border}`,
  background: colors.card,
  color: colors.textPrimary,
  fontSize: "16px",
  marginBottom: "25px",
  boxSizing: "border-box" as const,
  outline: "none",
}

const compactSearchStyle = {
  padding: "12px",
  borderRadius: "8px",
  marginBottom: 0,
}