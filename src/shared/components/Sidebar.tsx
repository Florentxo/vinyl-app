import { useEffect, useState } from "react"
import { useNavigate, NavLink } from "react-router-dom"
import { Pencil } from "lucide-react"
import { useAuthStore } from "../../features/auth/store/authStore"
import { getAppLogoPath } from "../../features/auth/services/appLogo"
import { signPaths } from "../../features/records/services/recordPhotos"
import AppLogoDialog from "./AppLogoDialog"
import { useIsMobile } from "../hooks/useIsMobile"
import { colors } from "../../theme"

const menus = [
  { path: "/collection", label: "Home", icon: "🎵" },
  { path: "/favorites", label: "Favorites", icon: "★" },
  { path: "/wishlist", label: "Wishlist", icon: "🎯" },
]

export default function Sidebar() {
  const isMobile = useIsMobile()
  const signOut = useAuthStore((state) => state.signOut)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [logoDialogOpen, setLogoDialogOpen] = useState(false)
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null)
  const logoPath = getAppLogoPath(user)
  const logoUrl = signed && signed.path === logoPath ? signed.url : null

  useEffect(() => {
    if (!logoPath) return
    let cancelled = false
    // On failure the original logo stays visible.
    signPaths([logoPath])
      .then((urls) => { if (!cancelled && urls[logoPath]) setSigned({ path: logoPath, url: urls[logoPath] }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [logoPath])

  async function handleSignOut() {
    await signOut()
    navigate("/login")
  }

  // =====================
  // MOBILE — Tab bar en bas
  // =====================

  if (isMobile) {
    return (
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "65px",
        background: colors.bgSecondary,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        borderTop: `1px solid ${colors.border}`,
        zIndex: 100,
      }}>
        {menus.map((menu) => (
          <NavLink
            key={menu.path}
            to={menu.path}
            style={({ isActive }) => ({
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              color: isActive ? colors.accent : colors.textTertiary,
              textDecoration: "none",
              fontSize: "11px",
              flex: 1,
            })}
          >
            <span style={{ fontSize: "22px" }}>{menu.icon}</span>
            {menu.label}
          </NavLink>
        ))}

        <button
          onClick={handleSignOut}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            color: colors.textTertiary,
            background: "none",
            border: "none",
            fontSize: "11px",
            flex: 1,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "22px" }}>↪</span>
          Sign out
        </button>
      </div>
    )
  }

  // =====================
  // DESKTOP — Sidebar gauche
  // =====================

  return (
    <div style={{
      width: "100px",
      background: colors.bgSecondary,
      padding: "20px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      flexShrink: 0,
    }}>
      <div style={{ position: "relative", width: "56px", height: "56px", margin: "0 auto 24px auto", flexShrink: 0 }}>
        <img
          src={logoUrl ?? "/icon-192x192.png"}
          alt="Vinyl Collec'"
          style={{ width: "56px", height: "56px", borderRadius: "12px", display: "block", objectFit: "cover" }}
        />
        <button
          type="button"
          onClick={() => setLogoDialogOpen(true)}
          aria-label="Edit logo"
          title="Edit logo"
          style={{ position: "absolute",                     right: "-2px", bottom: "-2px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", padding: 0 }}
        >
                    <Pencil size={9} aria-hidden="true" />
        </button>
      </div>
      {logoDialogOpen && <AppLogoDialog logoUrl={logoUrl} onClose={() => setLogoDialogOpen(false)} />}

      {menus.map((menu) => (
        <NavLink
          key={menu.path}
          to={menu.path}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: isActive ? colors.accent : "transparent",
            color: isActive ? colors.card : colors.textSecondary,
            borderRadius: "10px",
            padding: "10px 12px",
            fontSize: "14px",
            cursor: "pointer",
            transition: "0.2s",
            textDecoration: "none",
          })}
        >
          <span style={{ fontSize: "16px" }}>{menu.icon}</span>
          {menu.label}
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />

      <button
        onClick={handleSignOut}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "transparent",
          color: colors.textTertiary,
          border: "none",
          borderRadius: "10px",
          padding: "10px 12px",
          fontSize: "14px",
          cursor: "pointer",
          transition: "0.2s",
          width: "100%",
        }}
      >
        <span style={{ fontSize: "16px" }}>↪</span>
        Sign out
      </button>
    </div>
  )
}