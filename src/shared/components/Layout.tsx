import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import Sidebar from "./Sidebar"
import DetailsPanel from "./DetailsPanel"

import { useRecordsStore } from "../../features/records/store/recordsStore"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const selectedRecord = useRecordsStore((state) => state.selectedRecord)
  const setSelectedRecord = useRecordsStore((state) => state.setSelectedRecord)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 900)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#151515",
      overflow: "hidden",
      position: "relative",
    }}>
      {!isMobile && <Sidebar />}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </div>

      {selectedRecord && !isMobile && (
        <DetailsPanel onClose={() => setSelectedRecord(null)} />
      )}

      {isMobile && <Sidebar />}
    </div>
  )
}