export interface VinylRecord {
  id: string
  artist: string
  album: string
  year: string
  genre: string
  cover_url?: string
  favorite: boolean
  status: "owned" | "wishlist"
}