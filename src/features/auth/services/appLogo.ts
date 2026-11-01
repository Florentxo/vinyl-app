import type { User } from "@supabase/supabase-js"
import { supabase } from "../../../services/supabase"

const BUCKET = "record-photos"

export function getAppLogoPath(user: User | null): string | null {
  const path = user?.user_metadata?.app_logo_path
  return typeof path === "string" && path ? path : null
}

// The logo path lives in the user's auth metadata, so it needs no database migration.
export async function saveAppLogo(userId: string, image: Blob, previousPath: string | null): Promise<User> {
  const extension = image.type === "image/webp" ? "webp" : image.type === "image/png" ? "png" : "jpg"
  const path = `${userId}/app/logo-${Date.now()}.${extension}`

  const upload = await supabase.storage.from(BUCKET).upload(path, image, { contentType: image.type })
  if (upload.error) throw upload.error

  const { data, error } = await supabase.auth.updateUser({ data: { app_logo_path: path } })
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath])
  return data.user
}

export async function resetAppLogo(previousPath: string | null): Promise<User> {
  const { data, error } = await supabase.auth.updateUser({ data: { app_logo_path: null } })
  if (error) throw error
  if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath])
  return data.user
}
