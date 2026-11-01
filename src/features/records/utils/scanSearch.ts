import { buildDiscogsFreeTextSearchUrl, buildDiscogsSearchUrl } from "./discogs"
import type { Release } from "./discogs"

export interface ScanTarget {
  artist: string
  album: string
  altArtist?: string
  altAlbum?: string
}

export interface SearchAttempt {
  label: string
  url: string
}

// Above this similarity the best result is considered the right record and the search stops.
export const GOOD_MATCH = 0.9

const ARTIST_SEPARATORS = /\s*(?:\/|、|,|&|＆|;|；|\band\b|\bfeat\.?|\bwith\b)\s*/i

// A scan can read several credits at once ("A / B / title"); only the first one is a reliable search key.
export function primaryArtist(name: string): string {
  const first = name.split(ARTIST_SEPARATORS)[0] ?? ""
  return first.replace(/\s*\(\d+\)\s*$/, "").replace(/\*$/, "").trim()
}

// Compares text across scripts and punctuation: "サウンド・トラック" and "サウンドトラック" must look alike.
export function normalizeForMatch(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")
}

function bigrams(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (let i = 0; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2)
    counts.set(pair, (counts.get(pair) ?? 0) + 1)
  }
  return counts
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const first = bigrams(a)
  const second = bigrams(b)
  let shared = 0
  for (const [pair, count] of first) shared += Math.min(count, second.get(pair) ?? 0)
  return (2 * shared) / (a.length - 1 + (b.length - 1))
}

// Discogs often lists "English title = original title": each part is compared on its own.
function titleParts(title: string): string[] {
  return title.split(/\s=\s/).map(normalizeForMatch).filter(Boolean)
}

export function releaseScore(release: Release, target: ScanTarget): number {
  const wanted = [target.album, target.altAlbum ?? ""].map(normalizeForMatch).filter(Boolean)
  const parts = titleParts(release.album)
  let albumScore = 0
  for (const part of parts) for (const candidate of wanted) albumScore = Math.max(albumScore, similarity(part, candidate))

  const wantedArtists = [primaryArtist(target.artist), primaryArtist(target.altArtist ?? "")].map(normalizeForMatch).filter(Boolean)
  const releaseArtist = normalizeForMatch(release.artist)
  const artistMatches = wantedArtists.some((artist) => releaseArtist.includes(artist))

  return Math.min(1, albumScore * 0.85 + (artistMatches ? 0.15 : 0))
}

export function rankReleases(releases: Release[], target: ScanTarget): Release[] {
  return releases
    .map((release, index) => ({ release, index, score: releaseScore(release, target) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.release)
}

export function bestScore(releases: Release[], target: ScanTarget): number {
  return releases.reduce((best, release) => Math.max(best, releaseScore(release, target)), 0)
}

export function mergeReleases(current: Release[], more: Release[]): Release[] {
  const seen = new Set(current.map((release) => release.id))
  return [...current, ...more.filter((release) => !seen.has(release.id))]
}

// Ordered from the most precise query to the loosest; the first token of the title is often enough to find the record.
export function buildScanSearchPlan(target: ScanTarget, format: string, token?: string): SearchAttempt[] {
  const artist = primaryArtist(target.artist)
  const altArtist = primaryArtist(target.altArtist ?? "")
  const album = target.album.trim()
  const altAlbum = (target.altAlbum ?? "").trim()
  const attempts: SearchAttempt[] = []

  const addFreeText = (text: string) => {
    const query = text.trim().replace(/\s+/g, " ")
    if (query.length >= 2 && !attempts.some((attempt) => attempt.label === query)) {
      attempts.push({ label: query, url: buildDiscogsFreeTextSearchUrl(query, format, token) })
    }
  }
  const addFielded = (searchArtist: string, searchAlbum: string, label: string) => {
    if (searchArtist || searchAlbum) {
      attempts.push({ label, url: buildDiscogsSearchUrl({ artist: searchArtist, album: searchAlbum, format }, token) })
    }
  }

  addFreeText(`${artist} ${album.split(/\s+/)[0] ?? ""}`)
  addFreeText(`${artist} ${album}`)
  addFreeText(album)
  addFielded(artist, "", artist)
  if (altArtist || altAlbum) {
    addFielded(altArtist, altAlbum, [altArtist, altAlbum].filter(Boolean).join(" – "))
    addFreeText(`${altArtist} ${altAlbum.split(/\s+/)[0] ?? ""}`)
    addFreeText(`${altArtist} ${altAlbum}`)
    addFreeText(altAlbum)
    addFreeText(altArtist)
  }
  return attempts
}
