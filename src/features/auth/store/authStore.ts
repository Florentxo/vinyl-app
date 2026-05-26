import { create } from "zustand"
import { supabase } from "../../../services/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthStore {
  user: User | null
  loading: boolean
  fetchUser: () => Promise<void>
  signUp: (email: string, password: string) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  fetchUser: async () => {
    const { data } = await supabase.auth.getSession()
    set({ user: data.session?.user ?? null, loading: false })
  },

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return error ? error.message : null
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    set({ user: data.user })
    return null
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))