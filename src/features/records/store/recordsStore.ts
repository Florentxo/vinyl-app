import { create } from "zustand"
import { supabase } from "../../../services/supabase"
import type { VinylRecord } from "../types/record"

interface RecordsStore {
  records: VinylRecord[]
  selectedRecord: VinylRecord | null
  loading: boolean
  error: string | null

  fetchRecords: () => Promise<boolean>
  setSelectedRecord: (record: VinylRecord | null) => void
  clearError: () => void
  addRecord: (record: Omit<VinylRecord, "id">) => Promise<boolean>
  deleteRecord: (id: string) => Promise<boolean>
  toggleFavorite: (id: string) => Promise<boolean>
  changeStatus: (id: string, status: "owned" | "wishlist") => Promise<boolean>
  moveToCollection: (id: string) => Promise<boolean>
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message)
  }
  return fallback
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const userId = data.session?.user.id
  if (!userId) throw new Error("You must be signed in to change your collection.")
  return userId
}

export const useRecordsStore = create<RecordsStore>((set, get) => ({
  records: [],
  selectedRecord: null,
  loading: false,
  error: null,

  fetchRecords: async () => {
    set({ loading: true, error: null, records: [], selectedRecord: null })
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", userId)
      if (error) throw error
      set({ records: (data ?? []) as VinylRecord[] })
      return true
    } catch (error) {
      set({ error: getErrorMessage(error, "Could not load your records.") })
      return false
    } finally {
      set({ loading: false })
    }
  },

  setSelectedRecord: (record) => set({ selectedRecord: record }),
  clearError: () => set({ error: null }),

  addRecord: async (record) => {
    const { records } = get()
    const alreadyExists = records.some(
      (r) =>
        r.artist.toLowerCase().trim() === record.artist.toLowerCase().trim() &&
        r.album.toLowerCase().trim() === record.album.toLowerCase().trim()
    )
    if (alreadyExists) {
      set({ error: "This record is already in your collection." })
      return false
    }

    set({ error: null })
    try {
      const user_id = await getCurrentUserId()
      const recordWithUser = { ...record, id: crypto.randomUUID(), user_id }
      const { error } = await supabase.from("records").insert(recordWithUser)
      if (error) throw error
      set((state) => ({ records: [...state.records, recordWithUser] }))
      return true
    } catch (error) {
      set({ error: getErrorMessage(error, "Could not add this record.") })
      return false
    }
  },

  deleteRecord: async (id) => {
    set({ error: null })
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from("records")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
      if (error) throw error
      set((state) => ({
        records: state.records.filter((record) => record.id !== id),
        selectedRecord: state.selectedRecord?.id === id ? null : state.selectedRecord,
      }))
      return true
    } catch (error) {
      set({ error: getErrorMessage(error, "Could not delete this record.") })
      return false
    }
  },

  toggleFavorite: async (id) => {
    const record = get().records.find((r) => r.id === id)
    if (!record) return false
    set({ error: null })
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from("records")
        .update({ favorite: !record.favorite })
        .eq("id", id)
        .eq("user_id", userId)
      if (error) throw error
      set((state) => ({
        records: state.records.map((item) =>
          item.id === id ? { ...item, favorite: !record.favorite } : item
        ),
      }))
      return true
    } catch (error) {
      set({ error: getErrorMessage(error, "Could not update this record.") })
      return false
    }
  },

  changeStatus: async (id, status) => {
    set({ error: null })
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from("records")
        .update({ status })
        .eq("id", id)
        .eq("user_id", userId)
      if (error) throw error
      set((state) => ({
        records: state.records.map((record) => record.id === id ? { ...record, status } : record),
      }))
      return true
    } catch (error) {
      set({ error: getErrorMessage(error, "Could not update this record.") })
      return false
    }
  },

  moveToCollection: (id) => get().changeStatus(id, "owned"),
}))