import { ChangeEvent } from "react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search artist or album...",
}: SearchBarProps) {
  function handleChange(
    e: ChangeEvent<HTMLInputElement>
  ) {
    onChange(e.target.value)
  }

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      style={searchStyle}
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
  border: "none",
  background: "#1E1E1E",
  color: "white",
  fontSize: "16px",
  marginBottom: "25px",
  boxSizing: "border-box" as const,
  outline: "none",
}