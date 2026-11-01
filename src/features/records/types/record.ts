export interface VinylRecord {
  id: string
  artist: string
  album: string
  year: string
  genre: string
  cover_url?: string
  cover_source?: "discogs" | "custom"
  custom_cover_path?: string | null
  // Signed URL resolved on the client; never persisted.
  custom_cover_url?: string
  discogs_release_id?: number | null
  favorite: boolean
  status: "owned" | "wishlist"
}

export interface PhotoSlot {
  kind: "front" | "back" | "disc"
  disc_number: number
  side: "" | "A" | "B"
}

export interface RecordPhoto extends PhotoSlot {
  id: string
  record_id: string
  path: string
  url?: string
}