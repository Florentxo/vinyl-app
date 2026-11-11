import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { colors } from "../../../theme"

// Horizontal chip row that shows a fading chevron on the side where more content is hidden.
export default function DecadeScroller({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const update = useCallback(() => {
    const element = scrollerRef.current
    if (!element) return
    setCanScrollLeft(element.scrollLeft > 1)
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const element = scrollerRef.current
    if (!element) return
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [update, children])

  function scrollBy(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * 120, behavior: "smooth" })
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        ref={scrollerRef}
        onScroll={update}
        style={{ display: "flex", flexWrap: "nowrap", gap: "4px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none" }}
      >
        {children}
      </div>
      {canScrollLeft && <button type="button" aria-label="Scroll decades left" onClick={() => scrollBy(-1)} style={{ ...edgeStyle, left: 0, background: `linear-gradient(to right, ${colors.card} 55%, transparent)`, justifyContent: "flex-start" }}><ChevronLeft size={16} aria-hidden="true" /></button>}
      {canScrollRight && <button type="button" aria-label="Scroll decades right" onClick={() => scrollBy(1)} style={{ ...edgeStyle, right: 0, background: `linear-gradient(to left, ${colors.card} 55%, transparent)`, justifyContent: "flex-end" }}><ChevronRight size={16} aria-hidden="true" /></button>}
    </div>
  )
}

const edgeStyle = {
  position: "absolute" as const,
  top: 0,
  bottom: "2px",
  width: "32px",
  display: "flex",
  alignItems: "center",
  padding: 0,
  border: "none",
  color: colors.textSecondary,
  cursor: "pointer",
}
