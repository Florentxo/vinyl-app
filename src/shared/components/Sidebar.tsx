import { useState, useEffect } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../features/auth/store/authStore"
import { APP_NAME } from "../../config"  

const menus = [
  { path: "/collection", label: "Collection", icon: "🎵" },
  { path: "/favorites", label: "Favorites", icon: "★" },
  { path: "/wishlist", label: "Wishlist", icon: "🎯" },
]

export default function Sidebar() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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
        background: "#0D0D0D",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        borderTop: "1px solid #222",
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
              color: isActive ? "#2563EB" : "#666",
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
            color: "#666",
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
      width: "160px",
      background: "#0D0D0D",
      padding: "20px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      flexShrink: 0,
    }}>
      <h1 style={{
        color: "white",
        fontSize: "16px",
        marginBottom: "24px",
        textAlign: "center",
        letterSpacing: "2px",
      }}>
        {APP_NAME}
      </h1>

      {menus.map((menu) => (
        <NavLink
          key={menu.path}
          to={menu.path}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: isActive ? "#2563EB" : "transparent",
            color: isActive ? "white" : "#888",
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
          color: "#555",
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