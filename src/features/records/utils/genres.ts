export interface GenreOption {
  key: string
  label: string
  count: number
}

// Stored as "Genre / Style"; each part is an independent filter value.
// "Funk / Soul" is a single Discogs genre whose name contains the separator.
export function genreTokens(genre: string) {
  const parts = genre.split(" / ").map((part) => part.trim()).filter(Boolean)
  if (parts[0]?.toLowerCase() === "funk" && parts[1]?.toLowerCase() === "soul") {
    return ["Funk / Soul", ...parts.slice(2)]
  }
  return parts
}

// Case, accents, hyphens and spacing must not create duplicate entries ("Hip Hop" / "Hip-Hop").
export function genreKey(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function recordGenreKeys(genre: string) {
  return [...new Set(genreTokens(genre).map(genreKey).filter(Boolean))]
}

export function buildGenreOptions(genres: string[]): GenreOption[] {
  const entries = new Map<string, { count: number; labels: Map<string, number> }>()
  for (const genre of genres) {
    const seen = new Set<string>()
    for (const label of genreTokens(genre)) {
      const key = genreKey(label)
      if (!key) continue
      const entry = entries.get(key) ?? { count: 0, labels: new Map<string, number>() }
      entry.labels.set(label, (entry.labels.get(label) ?? 0) + 1)
      if (!seen.has(key)) {
        entry.count += 1
        seen.add(key)
      }
      entries.set(key, entry)
    }
  }
  return [...entries.entries()]
    .map(([key, { count, labels }]) => {
      const label = [...labels.entries()].sort((a, b) => b[1] - a[1])[0][0]
      return { key, label, count }
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
}
