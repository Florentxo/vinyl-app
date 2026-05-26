import { ChangeEvent } from "react"

interface FormState {
  artist: string
  album: string
  year: string
  genre: string
}

interface RecordFormProps {
  form: FormState

  onChange: (
    form: FormState
  ) => void

  onAdd: () => void

  onDelete?: () => void
}

export default function RecordForm({
  form,
  onChange,
  onAdd,
  onDelete,
}: RecordFormProps) {
  function handleChange(
    field: keyof FormState,
    value: string
  ) {
    onChange({
      ...form,
      [field]: value,
    })
  }

  return (
    <div style={formStyle}>
      {/* ARTIST */}

      <input
        placeholder="Artist"
        value={form.artist}
        onChange={(
          e: ChangeEvent<HTMLInputElement>
        ) =>
          handleChange(
            "artist",
            e.target.value
          )
        }
        style={inputStyle}
      />

      {/* ALBUM */}

      <input
        placeholder="Album"
        value={form.album}
        onChange={(
          e: ChangeEvent<HTMLInputElement>
        ) =>
          handleChange(
            "album",
            e.target.value
          )
        }
        style={inputStyle}
      />

      {/* YEAR */}

      <input
        placeholder="Year"
        value={form.year}
        onChange={(
          e: ChangeEvent<HTMLInputElement>
        ) =>
          handleChange(
            "year",
            e.target.value
          )
        }
        style={inputStyle}
      />

      {/* GENRE */}

      <input
        placeholder="Genre"
        value={form.genre}
        onChange={(
          e: ChangeEvent<HTMLInputElement>
        ) =>
          handleChange(
            "genre",
            e.target.value
          )
        }
        style={inputStyle}
      />

      {/* ADD BUTTON */}

      <button
        onClick={onAdd}
        style={addButtonStyle}
      >
        +
      </button>

      {/* DELETE BUTTON */}

      {onDelete && (
        <button
          onClick={onDelete}
          style={deleteButtonStyle}
        >
          -
        </button>
      )}
    </div>
  )
}

// =================================================
// STYLES
// =================================================

const formStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1.5fr 0.5fr 0.8fr auto auto",
  gap: "10px",
  marginBottom: "30px",
  alignItems: "center",
  width: "100%",
  boxSizing: "border-box" as const,
}

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#1E1E1E",
  color: "white",
  fontSize: "16px",
  boxSizing: "border-box" as const,
}

const addButtonStyle = {
  width: "50px",
  height: "50px",
  border: "none",
  borderRadius: "12px",
  background: "#2563EB",
  color: "white",
  fontSize: "24px",
  cursor: "pointer",
}

const deleteButtonStyle = {
  width: "50px",
  height: "50px",
  border: "none",
  borderRadius: "12px",
  background: "#991B1B",
  color: "white",
  fontSize: "24px",
  cursor: "pointer",
}