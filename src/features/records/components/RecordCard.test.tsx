import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import RecordCard from "./RecordCard"
import type { VinylRecord } from "../types/record"

const record: VinylRecord = {
  id: "record-1",
  artist: "Justice",
  album: "Cross",
  year: "2007",
  genre: "Electronic",
  favorite: false,
  status: "wishlist",
}

function renderCard(item: VinylRecord, actionsOpen = true) {
  return renderToStaticMarkup(
    <RecordCard
      item={item}
      isSelected={false}
      actionsOpen={actionsOpen}
      onActionsOpenChange={() => {}}
      onSelect={() => {}}
      onToggleFlag={() => true}
      onChangeStatus={() => true}
      onDelete={() => true}
    />
  )
}

describe("RecordCard actions", () => {
  it("keeps its height in a scrollable flex list", () => {
    const rootElement = renderCard(record).split(">")[0]
    expect(rootElement).toContain("flex-shrink:0")
  })

  it("offers collection, favorites and deletion for a wishlist record", () => {
    const html = renderCard(record)
    expect(html).toContain("Add to collection")
    expect(html).toContain("Add to favorites")
    expect(html).toContain("Delete vinyl")
  })

  it("does not offer a collection move for an owned record", () => {
    const html = renderCard({ ...record, status: "owned" })
    expect(html).not.toContain("Add to collection")
    expect(html).toContain("Add to favorites")
    expect(html).toContain("Delete vinyl")
  })

  it("offers removing the favorite without changing the wishlist status", () => {
    const html = renderCard({ ...record, favorite: true })
    expect(html).toContain("Remove from favorites")
    expect(html).toContain("Add to collection")
  })

  it("keeps actions hidden until explicitly opened", () => {
    const html = renderCard(record, false)
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('id="record-actions-record-1" hidden=""')
  })

  it("uses icons without visible action labels and retains accessible names", () => {
    const html = renderCard(record)
    const visibleText = html.replace(/<[^>]*>/g, "")
    expect(visibleText).not.toContain("Add to collection")
    expect(visibleText).not.toContain("Add to favorites")
    expect(visibleText).not.toContain("Delete vinyl")
    expect(html).toContain('aria-label="Add to collection"')
    expect(html).toContain('aria-label="Add to favorites"')
    expect(html).toContain('aria-label="Delete vinyl"')
  })

  it("exposes the current favorite state on its icon button", () => {
    expect(renderCard({ ...record, favorite: true })).toContain('aria-pressed="true"')
    expect(renderCard(record)).toContain('aria-pressed="false"')
  })

  it("places the compact menu in the row padding and keeps native vertical scrolling", () => {
    const html = renderCard(record, false)
    expect(html).toContain("touch-action:pan-y")
    expect(html).toContain("padding:10px 44px 10px 12px")
    expect(html).toContain("position:absolute;right:0")
    expect(html).toContain('width="18"')
  })

  it("hides the ellipsis and distinguishes the inline action bar when open", () => {
    const html = renderCard(record)
    const menu = html.match(/<button[^>]*aria-expanded="true"[^>]*>/)?.[0]
    expect(menu).toContain("display:none")
    expect(html).toContain("background:#E8DCC8")
    expect(html).toContain("padding:10px 12px")
    expect(html).not.toContain("padding:10px 44px 10px 12px")
  })

  it("offers cover editing from the actions menu when supported", () => {
    const html = renderToStaticMarkup(
      <RecordCard item={record} isSelected={false} actionsOpen onEdit={() => {}}
        onActionsOpenChange={() => {}} onSelect={() => {}} onToggleFlag={() => true}
        onChangeStatus={() => true} onDelete={() => true} />
    )
    expect(html).toContain('aria-label="Edit cover"')
    expect(renderCard(record)).not.toContain('aria-label="Edit cover"')
  })

  it("shows the album as the title with the artist below", () => {
    const html = renderCard(record)
    expect(html.indexOf("Cross")).toBeLessThan(html.indexOf("Justice"))
  })

  it("adds year and genre columns only when columns are enabled", () => {
    const compact = renderCard(record).replace(/<[^>]*>/g, " ")
    expect(compact).toContain("Justice • 2007")
    expect(compact).not.toContain("Electronic")

    const wide = renderToStaticMarkup(
      <RecordCard item={record} isSelected={false} actionsOpen={false} showColumns
        onActionsOpenChange={() => {}} onSelect={() => {}} onToggleFlag={() => true}
        onChangeStatus={() => true} onDelete={() => true} />
    )
    expect(wide).toContain("Electronic")
    expect(wide).toContain("2007")
  })
})
