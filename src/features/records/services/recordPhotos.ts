import { supabase } from "../../../services/supabase"
import type { PhotoSlot, RecordPhoto } from "../types/record"
import { buildPhotoPath } from "../utils/photos"

const BUCKET = "record-photos"
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7

async function getUserId() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const userId = data.session?.user.id
  if (!userId) throw new Error("You must be signed in to manage photos.")
  return userId
}

export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  const urls: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
  }
  return urls
}

export async function listRecordPhotos(recordId: string): Promise<RecordPhoto[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("record_photos")
    .select("id, record_id, kind, disc_number, side, path")
    .eq("user_id", userId)
    .eq("record_id", recordId)
  if (error) throw error
  const photos = (data ?? []) as RecordPhoto[]
  const urls = await signPaths(photos.map((photo) => photo.path))
  return photos.map((photo) => ({ ...photo, url: urls[photo.path] }))
}

export async function saveRecordPhoto(
  recordId: string,
  slot: PhotoSlot,
  image: Blob,
  previous?: RecordPhoto
): Promise<RecordPhoto> {
  const userId = await getUserId()
  const path = buildPhotoPath(userId, recordId, slot, image.type)

  const upload = await supabase.storage.from(BUCKET).upload(path, image, { contentType: image.type })
  if (upload.error) throw upload.error

  const { data, error } = await supabase
    .from("record_photos")
    .upsert(
      { user_id: userId, record_id: recordId, kind: slot.kind, disc_number: slot.disc_number, side: slot.side, path },
      { onConflict: "record_id,kind,disc_number,side" }
    )
    .select("id, record_id, kind, disc_number, side, path")
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }

  if (previous && previous.path !== path) await supabase.storage.from(BUCKET).remove([previous.path])
  const urls = await signPaths([path])
  return { ...(data as RecordPhoto), url: urls[path] }
}

export async function deleteRecordPhoto(photo: RecordPhoto) {
  const userId = await getUserId()
  const { error } = await supabase.from("record_photos").delete().eq("id", photo.id).eq("user_id", userId)
  if (error) throw error
  await supabase.storage.from(BUCKET).remove([photo.path])
}

export async function deleteAllRecordPhotos(recordId: string) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from("record_photos")
    .select("path")
    .eq("user_id", userId)
    .eq("record_id", recordId)
  if (error) throw error
  const paths = (data ?? []).map((row) => row.path as string)
  if (paths.length === 0) return
  const removal = await supabase.storage.from(BUCKET).remove(paths)
  if (removal.error) throw removal.error
  const { error: deleteError } = await supabase
    .from("record_photos")
    .delete()
    .eq("user_id", userId)
    .eq("record_id", recordId)
  if (deleteError) throw deleteError
}
