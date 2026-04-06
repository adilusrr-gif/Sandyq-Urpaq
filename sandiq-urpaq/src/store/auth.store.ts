import { create } from 'zustand'
import { User } from '@/types'

interface AuthState {
  user: User | null
  isPaid: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isPaid: false,
  isLoading: true,
  setUser: (user) => set({ user, isPaid: !!user?.paid_at, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}))
