import { create } from "zustand"
import { supabase } from "../../../services/supabase"
import type { VinylRecord } from "../types/record"

interface RecordsStore {
  records: VinylRecord[]
  selectedRecord: VinylRecord | null
  loading: boolean

  fetchRecords: () => Promise<void>
  setSelectedRecord: (record: VinylRecord | null) => void
  addRecord: (record: VinylRecord) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  changeStatus: (id: string, status: "owned" | "wishlist") => Promise<void>
  moveToCollection: (id: string) => Promise<void>
}

export const useRecordsStore = create<RecordsStore>((set, get) => ({
  records: [],
  selectedRecord: null,
  loading: false,

  fetchRecords: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from("records")
      .select("*")
    if (!error && data) set({ records: data as VinylRecord[] })
    set({ loading: false })
  },

  setSelectedRecord: (record) => set({ selectedRecord: record }),

  addRecord: async (record) => {
    const { records } = get()
    const alreadyExists = records.some(
      (r) =>
        r.artist.toLowerCase().trim() === record.artist.toLowerCase().trim() &&
        r.album.toLowerCase().trim() === record.album.toLowerCase().trim()
    )
    if (alreadyExists) return

    const { data: { session } } = await supabase.auth.getSession()
    const user_id = session?.user.id
    if (!user_id) return

    const recordWithUser = { ...record, user_id }
    const { error } = await supabase.from("records").insert(recordWithUser)
    if (!error) set((state) => ({ records: [...state.records, recordWithUser] }))
  },

  deleteRecord: async (id) => {
    const { error } = await supabase.from("records").delete().eq("id", id)
    if (!error) set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      selectedRecord: state.selectedRecord?.id === id ? null : state.selectedRecord,
    }))
  },

  toggleFavorite: async (id) => {
    const record = get().records.find((r) => r.id === id)
    if (!record) return
    const { error } = await supabase
      .from("records")
      .update({ favorite: !record.favorite })
      .eq("id", id)
    if (!error) set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, favorite: !r.favorite } : r
      ),
    }))
  },

  changeStatus: async (id, status) => {
    const { error } = await supabase
      .from("records")
      .update({ status })
      .eq("id", id)
    if (!error) set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, status } : r
      ),
    }))
  },


  moveToCollection: async (id: string) => {
    const { error } = await supabase
      .from("records")
      .update({ status: "owned" })
      .eq("id", id)
    if (!error) set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, status: "owned" } : r
      ),
    }))
  },
}))