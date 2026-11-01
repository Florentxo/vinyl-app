import { useRef, useState } from "react"
import { Camera, Check, Trash2, X } from "lucide-react"
import { useAuthStore } from "../../features/auth/store/authStore"
import { getAppLogoPath, resetAppLogo, saveAppLogo } from "../../features/auth/services/appLogo"
import { compressImage } from "../../features/records/utils/photos"
import { colors } from "../../theme"

interface AppLogoDialogProps {
  logoUrl: string | null
  onClose: () => void
}

const tileStyle = {
  position: "relative" as const,
  aspectRatio: "1",
  borderRadius: "12px",
  overflow: "hidden",
  background: colors.card,
}

const tileButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
}

const badgeStyle = {
  position: "absolute" as const,
  top: "6px",
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

export default function AppLogoDialog({ logoUrl, onClose }: AppLogoDialogProps) {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const path = getAppLogoPath(user)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError("")
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the logo.")
    } finally {
      setBusy(false)
    }
  }

  function handleFile(file: File | undefined) {
    if (!file || !user) return
    void run(async () => setUser(await saveAppLogo(user.id, await compressImage(file), path)))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit logo"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ background: colors.bgSecondary, borderRadius: "16px", width: "100%", maxWidth: "380px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: colors.textPrimary, fontSize: "16px", fontWeight: "bold" }}>Edit logo</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: colors.textTertiary, cursor: "pointer", display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            handleFile(file)
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          <div style={{ ...tileStyle, border: `2px solid ${path ? colors.border : colors.accent}` }}>
            <button
              type="button"
              disabled={busy}
              aria-label="Use the original logo"
              aria-pressed={!path}
              onClick={() => { void run(async () => setUser(await resetAppLogo(path))) }}
              style={tileButtonStyle}
            >
              <img src="/icon-192x192.png" alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
            {!path && <span style={{ ...badgeStyle, left: "6px", background: colors.accent }}><Check size={16} color="#fff" aria-hidden="true" /></span>}
          </div>

          {path && logoUrl && (
            <div style={{ ...tileStyle, border: `2px solid ${colors.accent}` }}>
              <img src={logoUrl} alt="Your logo" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <span style={{ ...badgeStyle, left: "6px", background: colors.accent }}><Check size={16} color="#fff" aria-hidden="true" /></span>
              <button
                type="button"
                disabled={busy}
                aria-label="Delete my logo"
                onClick={() => { void run(async () => setUser(await resetAppLogo(path))) }}
                style={{ ...badgeStyle, right: "6px", border: "none", background: "rgba(0,0,0,0.55)", cursor: "pointer" }}
              >
                <Trash2 size={16} color="#fff" aria-hidden="true" />
              </button>
            </div>
          )}

          <div style={{ ...tileStyle, border: `2px dashed ${colors.borderStrong}` }}>
            <button type="button" disabled={busy} aria-label="Add a photo" onClick={() => inputRef.current?.click()} style={{ ...tileButtonStyle, color: colors.textTertiary }}>
              {busy ? "…" : <Camera size={26} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {error && <span role="alert" style={{ color: colors.danger, fontSize: "12px" }}>{error}</span>}
      </div>
    </div>
  )
}
