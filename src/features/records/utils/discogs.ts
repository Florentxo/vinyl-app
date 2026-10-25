export interface Release {
  id: number
  artist: string
  album: string
  year: string
  formats: string[]
  coverUrl: string
}

export interface DiscogsReleaseResult {
  id: number
  title: string
  year?: number | string
  format?: string[] | string
  cover_image?: string
  thumb?: string
}

export interface DiscogsSearchCriteria {
  artist: string
  album: string
  format: string
}

export interface DiscogsArtistSuggestion {
  id: number
  title: string
  thumb?: string
}

export interface DiscogsTrack {
  position?: string
  title: string
  duration?: string
  type_?: string
  sub_tracks?: DiscogsTrack[]
}

export interface DiscogsReleaseDetails {
  genres?: string[]
  styles?: string[]
  images?: { uri?: string }[]
  tracklist?: DiscogsTrack[]
}

export async function fetchDiscogsReleaseDetails(id: number, token?: string, signal?: AbortSignal): Promise<DiscogsReleaseDetails> {
  const params = new URLSearchParams()
  if (token) params.set("token", token)
  const response = await fetch(`https://api.discogs.com/releases/${id}${params.size ? `?${params}` : ""}`, { signal })
  if (!response.ok) throw new Error(`Discogs release request failed (${response.status})`)
  return response.json()
}

export async function fetchRecordDetails(
  record: { artist: string; album: string; discogs_release_id?: number | null },
  token?: string,
  signal?: AbortSignal
): Promise<DiscogsReleaseDetails> {
  if (record.discogs_release_id != null) {
    return fetchDiscogsReleaseDetails(record.discogs_release_id, token, signal)
  }

  const searchUrl = buildDiscogsSearchUrl({ artist: record.artist, album: record.album, format: "Vinyl" }, token)
  const search = await fetch(searchUrl, { signal })
  if (!search.ok) throw new Error(`Discogs search failed (${search.status})`)
  const data = await search.json() as { results?: { id: number }[] }
  const release = data.results?.[0]
  if (release) return fetchDiscogsReleaseDetails(release.id, token, signal)

  const masterUrl = new URL(searchUrl)
  masterUrl.searchParams.set("type", "master")
  masterUrl.searchParams.delete("format")
  const fallback = await fetch(masterUrl.toString(), { signal })
  if (!fallback.ok) throw new Error(`Discogs master search failed (${fallback.status})`)
  const masters = await fallback.json() as { results?: { id: number }[] }
  const master = masters.results?.[0]
  if (!master) return {}
  const params = new URLSearchParams()
  if (token) params.set("token", token)
  const response = await fetch(`https://api.discogs.com/masters/${master.id}${params.size ? `?${params}` : ""}`, { signal })
  if (!response.ok) throw new Error(`Discogs master request failed (${response.status})`)
  return response.json()
}

export function buildDiscogsArtistSearchUrl(query: string, token?: string) {
  const params = new URLSearchParams({
    type: "artist",
    per_page: "10",
    q: query.trim(),
  })
  if (token) params.set("token", token)
  return `https://api.discogs.com/database/search?${params.toString()}`
}

export function buildDiscogsSearchUrl(criteria: DiscogsSearchCriteria, token?: string, page = 1) {
  const params = new URLSearchParams({
    type: "release",
    per_page: "20",
    page: page.toString(),
  })
  // Discogs search titles can omit the numeric suffix used to distinguish artists.
  const artist = criteria.artist.trim().replace(/\s+\(\d+\)$/, "")
  const album = criteria.album.trim()
  const format = criteria.format.trim()

  if (artist) params.set("artist", artist)
  if (album) params.set("release_title", album)
  if (format) params.set("format", format)
  if (token) params.set("token", token)

  return `https://api.discogs.com/database/search?${params.toString()}`
}

export function matchesDiscogsArtist(title: string, artistName: string) {
  const separator = title.indexOf(" - ")
  if (separator < 1) return false

  const listedArtist = title.slice(0, separator).split(" = ")[0].trim().replace(/\*$/, "").trim()
  const selectedArtist = artistName.trim()
  const comparisonArtist = /\s+\(\d+\)$/.test(listedArtist)
    ? selectedArtist
    : selectedArtist.replace(/\s+\(\d+\)$/, "")
  return listedArtist.localeCompare(comparisonArtist, undefined, { sensitivity: "accent" }) === 0
}

export function mapDiscogsRelease(release: DiscogsReleaseResult, fallbackArtist: string): Release {
  const separator = release.title.indexOf(" - ")
  const artist = separator > 0 ? release.title.slice(0, separator).trim() : fallbackArtist
  const album = separator > 0 ? release.title.slice(separator + 3).trim() : release.title.trim()
  const formats = Array.isArray(release.format)
    ? release.format
    : release.format ? [release.format] : []

  return {
    id: release.id,
    artist,
    album,
    year: release.year?.toString() ?? "",
    formats,
    coverUrl: release.cover_image || release.thumb || "",
  }
}