import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { IScannerControls } from "@zxing/browser"
import type { VinylRecord } from "../types/record"
import { colors } from "../../../theme"
import {
  buildDiscogsArtistSearchUrl,
  buildDiscogsSearchUrl,
  mapDiscogsRelease,
  matchesDiscogsArtist,
} from "../utils/discogs"
import type { DiscogsArtistSuggestion, DiscogsReleaseResult, Release } from "../utils/discogs"

interface VinylSearchProps {
  onAdd: (record: Omit<VinylRecord, "id" | "favorite" | "status">) => boolean | void | Promise<boolean | void>
  isMobile?: boolean
}

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN
const releaseCache = new Map<string, { releases: Release[]; nextPage: number | null }>()
const formatOptions = ["Vinyl", "LP", '12"', '7"', "CD", "Cassette"]
const photoAngles = [
  { key: "front", label: "Front cover" },
  { key: "back", label: "Back cover" },
  { key: "label", label: "Center label on the record" },
] as const
type PhotoAngle = (typeof photoAngles)[number]["key"]

function normalizeBarcode(value: string) {
  return value.replace(/[\s-]/g, "")
}

function isValidBarcode(value: string) {
  return /^\d{8,14}$/.test(value)
}

export default function VinylSearch({ onAdd, isMobile = false }: VinylSearchProps) {
  const artistFieldRef = useRef<HTMLDivElement>(null)
  const barcodeVideoRef = useRef<HTMLVideoElement>(null)
  const scannerControlsRef = useRef<IScannerControls | null>(null)
  const [artistQuery, setArtistQuery] = useState("")
  const [selectedArtist, setSelectedArtist] = useState<DiscogsArtistSuggestion | null>(null)
  const [artistSuggestions, setArtistSuggestions] = useState<DiscogsArtistSuggestion[]>([])
  const [artistSuggestionsMaxHeight, setArtistSuggestionsMaxHeight] = useState(220)
  const [loadingArtists, setLoadingArtists] = useState(false)
  const [artistSearchError, setArtistSearchError] = useState("")
  const [albumQuery, setAlbumQuery] = useState("")
  const [format, setFormat] = useState("")
  const [barcodeQuery, setBarcodeQuery] = useState("")
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false)
  const [barcodeScannerError, setBarcodeScannerError] = useState("")
  const [photoFiles, setPhotoFiles] = useState<Record<PhotoAngle, File | null>>({
    front: null,
    back: null,
    label: null,
  })
  const [photoSearchQuery, setPhotoSearchQuery] = useState("")
  const [readingPhotos, setReadingPhotos] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [photoOcrError, setPhotoOcrError] = useState("")
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  useLayoutEffect(() => {
    if (artistSuggestions.length === 0) return

    function updateMaxHeight() {
      const fieldBottom = artistFieldRef.current?.getBoundingClientRect().bottom
      if (fieldBottom === undefined) return

      const viewport = window.visualViewport
      const viewportBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight
      const bottomInset = isMobile ? 28 : 8
      setArtistSuggestionsMaxHeight(Math.max(0, Math.floor(viewportBottom - fieldBottom - bottomInset)))
    }

    updateMaxHeight()
    window.addEventListener("resize", updateMaxHeight)
    window.addEventListener("scroll", updateMaxHeight, true)
    window.visualViewport?.addEventListener("resize", updateMaxHeight)
    window.visualViewport?.addEventListener("scroll", updateMaxHeight)

    return () => {
      window.removeEventListener("resize", updateMaxHeight)
      window.removeEventListener("scroll", updateMaxHeight, true)
      window.visualViewport?.removeEventListener("resize", updateMaxHeight)
      window.visualViewport?.removeEventListener("scroll", updateMaxHeight)
    }
  }, [artistSuggestions.length, isMobile])

  useEffect(() => {
    if (!barcodeScannerOpen) return

    let active = true
    let controls: IScannerControls | null = null
    const video = barcodeVideoRef.current

    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setBarcodeScannerError("Camera access is unavailable. Enter the barcode manually.")
      setBarcodeScannerOpen(false)
      return
    }

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        if (!active) return

        const reader = new BrowserMultiFormatReader()
        const startedControls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            if (!result || !active) return

            const barcode = normalizeBarcode(result.getText())
            if (!isValidBarcode(barcode)) {
              setBarcodeScannerError("This code is not a supported 8 to 14 digit barcode.")
              setBarcodeScannerOpen(false)
              return
            }

            setBarcodeScannerError("")
            setBarcodeQuery(barcode)
            setArtistQuery("")
            setSelectedArtist(null)
            setAlbumQuery("")
            setFormat("")
            setPhotoSearchQuery("")
            setBarcodeScannerOpen(false)
          }
        )

        controls = startedControls
        scannerControlsRef.current = startedControls
        if (!active) startedControls.stop()
      } catch (scanError: unknown) {
        if (!active) return
        const errorName = scanError instanceof Error ? scanError.name : ""
        const message = errorName === "NotAllowedError"
          ? "Camera access was denied. Allow camera access or enter the barcode manually."
          : errorName === "NotFoundError"
            ? "No camera found. Enter the barcode manually."
            : "Could not start the camera. Check permissions or enter the barcode manually."
        setBarcodeScannerError(message)
        setBarcodeScannerOpen(false)
      }
    }

    void startScanner()

    return () => {
      active = false
      controls?.stop()
      scannerControlsRef.current?.stop()
      scannerControlsRef.current = null
    }
  }, [barcodeScannerOpen])

  useEffect(() => {
    const query = artistQuery.trim()
    const isSelected = selectedArtist?.title.toLowerCase() === query.toLowerCase()
    const controller = new AbortController()

    if (query.length < 2 || isSelected || barcodeQuery.trim()) {
      setArtistSuggestions([])
      setLoadingArtists(false)
      setArtistSearchError("")
      return () => controller.abort()
    }

    setArtistSuggestions([])
    setLoadingArtists(true)
    setArtistSearchError("")
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(buildDiscogsArtistSearchUrl(query, DISCOGS_TOKEN), {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Discogs artist search failed")

        const data = await response.json() as {
          results?: DiscogsArtistSuggestion[]
        }
        setArtistSuggestions(data.results ?? [])
      } catch {
        if (!controller.signal.aborted) {
          setArtistSuggestions([])
          setArtistSearchError("Could not search artists. Check your connection and try again.")
        }
      } finally {
        if (!controller.signal.aborted) setLoadingArtists(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [artistQuery, selectedArtist, barcodeQuery])

  useEffect(() => {
    const artist = selectedArtist?.title ?? ""
    const album = albumQuery.trim()
    const query = photoSearchQuery.trim()
    const barcode = normalizeBarcode(barcodeQuery.trim())
    const hasBarcodeQuery = barcodeQuery.trim().length > 0
    const validBarcode = isValidBarcode(barcode)
    const canSearch = hasBarcodeQuery
      ? validBarcode
      : Boolean(query) || Boolean(selectedArtist) || (!artistQuery.trim() && album.length >= 2)
    const controller = new AbortController()

    if (!canSearch) {
      setReleases([])
      setNextPage(null)
      setError("")
      setLoading(false)
      return () => controller.abort()
    }

    const cacheKey = JSON.stringify([selectedArtist?.id ?? null, artist.toLowerCase(), album.toLowerCase(), format, barcode, query.toLowerCase()])
    const cached = releaseCache.get(cacheKey)
    if (cached) {
      setReleases(cached.releases)
      setNextPage(cached.nextPage)
      setError("")
      setLoading(false)
      return () => controller.abort()
    }

    setLoading(true)
    setError("")
    setReleases([])
    setNextPage(null)
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(buildDiscogsSearchUrl({ artist, album, format, barcode, query }, DISCOGS_TOKEN), {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Discogs search failed")

        const data = await response.json() as {
          results?: DiscogsReleaseResult[]
          pagination?: { page: number; pages: number }
        }
        const matchingResults = (data.results ?? []).filter((release) =>
          !selectedArtist || matchesDiscogsArtist(release.title, selectedArtist.title)
        )
        const results = matchingResults.map((release) => mapDiscogsRelease(release, artist))
        const followingPage = data.pagination && data.pagination.page < data.pagination.pages
          ? data.pagination.page + 1
          : null

        releaseCache.set(cacheKey, { releases: results, nextPage: followingPage })
        setReleases(results)
        setNextPage(followingPage)
      } catch {
        if (!controller.signal.aborted) {
          setReleases([])
          setError("Search failed. Please try again.")
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [artistQuery, selectedArtist, albumQuery, format, barcodeQuery, photoSearchQuery])

  async function identifyFromPhotos() {
    const selectedPhotos = photoAngles
      .map((angle) => photoFiles[angle.key])
      .filter((photo): photo is File => photo !== null)
    if (selectedPhotos.length === 0 || readingPhotos) return

    setReadingPhotos(true)
    setOcrProgress(0)
    setPhotoOcrError("")
    setPhotoSearchQuery("")

    try {
      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker("eng+fra", undefined, {
        logger: ({ progress }) => setOcrProgress(Math.max(0, Math.min(progress, 1))),
      })

      try {
        const recognizedText: string[] = []
        for (const photo of selectedPhotos) {
          const { data } = await worker.recognize(photo)
          if (data.text.trim()) recognizedText.push(data.text.trim())
        }

        const query = recognizedText.join("\n\n").slice(0, 1200).trim()
        if (!query) {
          setPhotoOcrError("No readable text found. Try a sharper photo of the cover or center label.")
          return
        }

        setPhotoSearchQuery(query)
        setArtistQuery("")
        setSelectedArtist(null)
        setAlbumQuery("")
        setFormat("")
        setBarcodeQuery("")
      } finally {
        await worker.terminate()
      }
    } catch {
      setPhotoOcrError("Could not read the photos. Check your connection and try again.")
    } finally {
      setReadingPhotos(false)
    }
  }

  async function loadMore() {
    if (nextPage === null || loadingMore) return
    const page = nextPage
    const artist = selectedArtist?.title ?? ""
    const album = albumQuery.trim()
    const query = photoSearchQuery.trim()
    const barcode = normalizeBarcode(barcodeQuery.trim())
    setLoadingMore(true)
    setError("")

    try {
      const response = await fetch(buildDiscogsSearchUrl({ artist, album, format, barcode, query }, DISCOGS_TOKEN, page))
      if (!response.ok) throw new Error("Discogs search failed")

      const data = await response.json() as {
        results?: DiscogsReleaseResult[]
        pagination?: { page: number; pages: number }
      }
      const matchingResults = (data.results ?? []).filter((release) =>
        !selectedArtist || matchesDiscogsArtist(release.title, selectedArtist.title)
      )
      const moreReleases = matchingResults.map((release) => mapDiscogsRelease(release, artist))
      setReleases((current) => {
        const existingIds = new Set(current.map((release) => release.id))
        return [...current, ...moreReleases.filter((release) => !existingIds.has(release.id))]
      })
      setNextPage(data.pagination && data.pagination.page < data.pagination.pages
        ? data.pagination.page + 1
        : null)
    } catch {
      setError("Could not load more releases. Please try again.")
    } finally {
      setLoadingMore(false)
    }
  }

  async function selectRelease(release: Release) {
    setAddingId(release.id)
    setError("")
    let genre = ""
    let coverUrl = release.coverUrl

    try {
      const params = new URLSearchParams()
      if (DISCOGS_TOKEN) params.set("token", DISCOGS_TOKEN)
      const query = params.size ? `?${params}` : ""
      const response = await fetch(`https://api.discogs.com/releases/${release.id}${query}`)
      if (response.ok) {
        const details = await response.json() as {
          genres?: string[]
          styles?: string[]
          images?: { uri?: string }[]
        }
        const primaryGenre = details.genres?.[0] ?? ""
        const primaryStyle = details.styles?.[0] ?? ""
        genre = primaryStyle ? `${primaryGenre} / ${primaryStyle}` : primaryGenre
        coverUrl = details.images?.[0]?.uri || coverUrl
      }
    } catch {
      // The search result still contains enough information to add the release.
    }

    try {
      const added = await onAdd({
        artist: release.artist,
        album: release.album,
        year: release.year,
        genre,
        cover_url: coverUrl,
      })
      if (added === false) throw new Error("Could not add this release")
      setArtistQuery("")
      setSelectedArtist(null)
      setAlbumQuery("")
      setFormat("")
      setBarcodeQuery("")
      setPhotoFiles({ front: null, back: null, label: null })
      setPhotoSearchQuery("")
      setReleases([])
      setNextPage(null)
    } catch {
      setError("Could not add this release. Please try again.")
    } finally {
      setAddingId(null)
    }
  }

  const waitingForArtistSelection = artistQuery.trim().length >= 2 && !selectedArtist
  const normalizedBarcode = normalizeBarcode(barcodeQuery.trim())
  const canSearch = barcodeQuery.trim()
    ? isValidBarcode(normalizedBarcode)
    : Boolean(photoSearchQuery.trim()) || Boolean(selectedArtist) || (!artistQuery.trim() && albumQuery.trim().length >= 2)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: 0 }}>
      <div ref={artistFieldRef} style={{ position: "relative" }}>
        <label style={fieldStyle}>
          <span>Artist</span>
          <input
            placeholder="Search by artist..."
            value={artistQuery}
            onChange={(event) => {
              setSelectedArtist(null)
              setArtistQuery(event.target.value)
            }}
            style={isMobile ? mobileInputStyle : inputStyle}
            autoComplete="off"
          />
        </label>
        {loadingArtists && <p style={messageStyle}>Searching artists...</p>}
        {artistSearchError && <p role="alert" style={errorStyle}>{artistSearchError}</p>}
        {artistSuggestions.length > 0 && (
          <div
            role="listbox"
            aria-label="Discogs artists"
            style={{ ...artistSuggestionsStyle, maxHeight: `${artistSuggestionsMaxHeight}px` }}
          >
            {artistSuggestions.map((artist) => (
              <button
                key={artist.id}
                type="button"
                role="option"
                aria-selected={selectedArtist?.id === artist.id}
                onClick={() => {
                  setSelectedArtist(artist)
                  setArtistQuery(artist.title)
                  setArtistSuggestions([])
                }}
                style={artistSuggestionStyle}
              >
                {artist.thumb && <img src={artist.thumb} alt="" style={artistThumbStyle} />}
                <span>{artist.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <label style={fieldStyle}>
        <span>Album</span>
        <input
          placeholder="Search by album..."
          value={albumQuery}
          onChange={(event) => setAlbumQuery(event.target.value)}
          style={isMobile ? mobileInputStyle : inputStyle}
          autoComplete="off"
        />
      </label>

      <label style={fieldStyle}>
        <span>Format</span>
        <select value={format} onChange={(event) => setFormat(event.target.value)} style={isMobile ? mobileInputStyle : inputStyle}>
          <option value="">All formats</option>
          {formatOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>

      <div style={barcodeRowStyle}>
        <label style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
          <span>Barcode</span>
          <input
            value={barcodeQuery}
            onChange={(event) => {
              const value = event.target.value
              setBarcodeQuery(value)
              if (value.trim()) {
                setArtistQuery("")
                setSelectedArtist(null)
                setAlbumQuery("")
                setFormat("")
                setPhotoSearchQuery("")
              }
            }}
            placeholder="EAN / UPC digits..."
            inputMode="numeric"
            autoComplete="off"
            maxLength={18}
            style={isMobile ? mobileInputStyle : inputStyle}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setBarcodeScannerError("")
            setBarcodeScannerOpen(true)
          }}
          style={barcodeScanButtonStyle}
        >
          Scan barcode
        </button>
      </div>
      {barcodeQuery.trim() && !isValidBarcode(normalizeBarcode(barcodeQuery.trim())) && (
        <p style={messageStyle}>Enter an 8 to 14 digit barcode.</p>
      )}
      {barcodeScannerError && <p role="alert" style={errorStyle}>{barcodeScannerError}</p>}

      <details style={photoSectionStyle}>
        <summary style={photoSummaryStyle}>Identify from cover and record photos</summary>
        <p style={messageStyle}>Photos are read on this device. Only the detected text is used for the Discogs search.</p>
        {photoAngles.map((angle) => (
          <label key={angle.key} style={photoFieldStyle}>
            <span>{angle.label}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setPhotoFiles((current) => ({ ...current, [angle.key]: file }))
                setPhotoOcrError("")
              }}
              style={photoFileInputStyle}
            />
          </label>
        ))}
        <button
          type="button"
          disabled={readingPhotos || !Object.values(photoFiles).some(Boolean)}
          onClick={() => void identifyFromPhotos()}
          style={photoOcrButtonStyle}
        >
          {readingPhotos ? `Reading text locally... ${Math.round(ocrProgress * 100)}%` : "Read text from photos"}
        </button>
        {photoOcrError && <p role="alert" style={errorStyle}>{photoOcrError}</p>}
        {photoSearchQuery && (
          <label style={fieldStyle}>
            <span>Detected text (edit to refine the search)</span>
            <textarea
              rows={4}
              maxLength={1200}
              value={photoSearchQuery}
              onChange={(event) => setPhotoSearchQuery(event.target.value)}
              style={ocrTextStyle}
            />
          </label>
        )}
      </details>

      {waitingForArtistSelection && !loadingArtists && !artistSearchError && artistSuggestions.length === 0 && (
        <p style={messageStyle}>No artists found. Try another name or search by album only.</p>
      )}
      {waitingForArtistSelection && artistSuggestions.length > 0 && (
        <p style={messageStyle}>Select the matching artist to exclude Discogs homonyms.</p>
      )}
      {!canSearch && !waitingForArtistSelection && (
        <p style={messageStyle}>Enter at least 2 characters in Artist or Album.</p>
      )}
      {loading && <p style={messageStyle}>Searching Discogs...</p>}
      {error && <p role="alert" style={errorStyle}>{error}</p>}
      {canSearch && !loading && !error && releases.length === 0 && (
        <p style={messageStyle}>No releases found. Try changing your search.</p>
      )}

      {barcodeScannerOpen && (
        <div style={barcodeScannerBackdropStyle} onClick={() => setBarcodeScannerOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="barcode-scanner-title"
            style={barcodeScannerDialogStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 id="barcode-scanner-title" style={{ color: colors.textPrimary, margin: 0, fontSize: "18px" }}>
                Scan vinyl barcode
              </h2>
              <button
                type="button"
                aria-label="Close scanner"
                onClick={() => setBarcodeScannerOpen(false)}
                style={scannerCloseButtonStyle}
              >
                ×
              </button>
            </div>
            <video ref={barcodeVideoRef} muted playsInline autoPlay style={scannerVideoStyle} />
            <p style={messageStyle}>Center the barcode in the camera view.</p>
          </section>
        </div>
      )}

      {releases.length > 0 && (
        <div
          aria-label="Search results"
          style={{ ...resultsStyle, maxHeight: isMobile ? "calc(100dvh - 390px)" : "260px" }}
        >
          {releases.map((release) => (
            <button
              key={release.id}
              type="button"
              disabled={addingId !== null}
              onClick={() => selectRelease(release)}
              style={{ ...releaseItemStyle, opacity: addingId === release.id ? 0.6 : 1 }}
            >
              {release.coverUrl ? (
                <img src={release.coverUrl} alt="" style={coverStyle} />
              ) : (
                <span style={coverPlaceholderStyle} aria-hidden="true">♪</span>
              )}
              <span style={releaseInfoStyle}>
                <strong style={albumStyle}>{release.album}</strong>
                <span style={artistStyle}>{release.artist}</span>
                <span style={formatStyle}>
                  {[release.year, ...release.formats].filter(Boolean).join(" · ")}
                </span>
              </span>
              {addingId === release.id && <span style={messageStyle}>Adding...</span>}
            </button>
          ))}
        </div>
      )}
      {nextPage !== null && (
        <button type="button" onClick={loadMore} disabled={loadingMore} style={loadMoreStyle}>
          {loadingMore ? "Loading more..." : "Load more releases"}
        </button>
      )}
    </div>
  )
}

const fieldStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "5px",
  color: colors.textSecondary,
  fontSize: "12px",
}

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.border}`,
  background: colors.card,
  color: colors.textPrimary,
  fontSize: "14px",
  boxSizing: "border-box" as const,
}

const mobileInputStyle = { ...inputStyle, fontSize: "16px" }

const messageStyle = {
  color: colors.textTertiary,
  fontSize: "12px",
  margin: "2px 0",
}

const errorStyle = {
  color: colors.danger,
  fontSize: "12px",
  margin: "2px 0",
}

const barcodeRowStyle = {
  display: "flex",
  alignItems: "flex-end",
  gap: "8px",
  minWidth: 0,
}

const barcodeScanButtonStyle = {
  flexShrink: 0,
  minHeight: "42px",
  padding: "0 12px",
  border: "none",
  borderRadius: "8px",
  background: colors.accent,
  color: colors.card,
  fontSize: "14px",
  cursor: "pointer",
}

const barcodeScannerBackdropStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 400,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  boxSizing: "border-box" as const,
  background: "rgba(30,24,19,0.72)",
}

const barcodeScannerDialogStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "14px",
  width: "min(100%, 460px)",
  padding: "16px",
  boxSizing: "border-box" as const,
  borderRadius: "12px",
  background: colors.bg,
}

const scannerCloseButtonStyle = {
  width: "40px",
  height: "40px",
  border: "none",
  background: "transparent",
  color: colors.textSecondary,
  fontSize: "28px",
  cursor: "pointer",
}

const scannerVideoStyle = {
  display: "block",
  width: "100%",
  aspectRatio: "4 / 3",
  objectFit: "cover" as const,
  borderRadius: "8px",
  background: colors.textPrimary,
}

const photoSectionStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "10px",
  paddingTop: "10px",
  borderTop: `1px solid ${colors.border}`,
}

const photoSummaryStyle = {
  color: colors.textPrimary,
  fontSize: "14px",
  cursor: "pointer",
}

const photoFieldStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "5px",
  color: colors.textSecondary,
  fontSize: "12px",
}

const photoFileInputStyle = {
  width: "100%",
  color: colors.textPrimary,
  fontSize: "12px",
}

const photoOcrButtonStyle = {
  ...barcodeScanButtonStyle,
  width: "100%",
  background: colors.textPrimary,
}

const ocrTextStyle = {
  ...inputStyle,
  minHeight: "96px",
  resize: "vertical" as const,
  fontFamily: "inherit",
  lineHeight: 1.4,
}

const resultsStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
  overflowY: "auto" as const,
}

const releaseItemStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "9px",
  textAlign: "left" as const,
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  cursor: "pointer",
}

const coverStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "4px",
  objectFit: "cover" as const,
  flexShrink: 0,
}

const coverPlaceholderStyle = {
  ...coverStyle,
  display: "grid",
  placeItems: "center",
  background: colors.cover,
  color: colors.textMuted,
  fontSize: "20px",
}

const releaseInfoStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "2px",
  minWidth: 0,
  flex: 1,
}

const albumStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  color: colors.textPrimary,
  fontSize: "13px",
}

const artistStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  color: colors.textSecondary,
  fontSize: "12px",
}

const formatStyle = {
  color: colors.textTertiary,
  fontSize: "10px",
}

const artistSuggestionsStyle = {
  position: "absolute" as const,
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 20,
  overflowY: "auto" as const,
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  boxShadow: "0 8px 20px rgba(58,46,34,0.12)",
}

const artistSuggestionStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 12px",
  border: "none",
  borderBottom: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textPrimary,
  textAlign: "left" as const,
  cursor: "pointer",
}

const artistThumbStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  objectFit: "cover" as const,
}

const loadMoreStyle = {
  padding: "9px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  background: colors.card,
  color: colors.textPrimary,
  cursor: "pointer",
}