export interface VinylRecord {
  id: string
  artist: string
  album: string
  year: string
  genre: string
  cover_url?: string
  discogs_release_id?: number | null
  favorite: boolean
  status: "owned" | "wishlist"
}