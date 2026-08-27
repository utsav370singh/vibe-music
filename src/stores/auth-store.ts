import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  username: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  authRequested: boolean // flag to open the auth modal

  login: (username: string) => Promise<void>
  register: (username: string) => Promise<void>
  logout: () => void
  requestAuth: () => void
  clearAuthRequest: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      authRequested: false,

      login: async (username: string) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          set({ user: data, isLoading: false, authRequested: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (username: string) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          set({ user: data, isLoading: false, authRequested: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({ user: null })
      },

      requestAuth: () => set({ authRequested: true }),
      clearAuthRequest: () => set({ authRequested: false }),
    }),
    {
      name: 'music-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)