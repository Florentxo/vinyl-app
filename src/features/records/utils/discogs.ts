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
  const artist = criteria.artist.trim()
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

  const listedArtist = title.slice(0, separator).split(" = ")[0].trim()
  return listedArtist.localeCompare(artistName.trim(), undefined, { sensitivity: "accent" }) === 0
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