import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Track } from './player-store'

interface User {
  id: string
  username: string
  isAdmin: boolean
}

interface AuthState {
  user: User | null
  isLoading: boolean
  authRequested: boolean // flag to open the auth modal

  login: (username: string, password?: string) => Promise<void>
  register: (username: string, password?: string) => Promise<void>
  pendingAction: { type: 'play' | 'playlist'; track: Track; queue?: Track[] } | null
  logout: () => Promise<void>
  validateSession: () => Promise<void>
  requestAuth: (action?: { type: 'play' | 'playlist'; track: Track; queue?: Track[] }) => void
  clearAuthRequest: () => void
  takePendingAction: () => AuthState['pendingAction']
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      authRequested: false,
      pendingAction: null,

      login: async (username: string, password?: string) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })
          const data = await res.json()
          if (data.requiresPassword) throw new Error('ADMIN_PASSWORD_REQUIRED')
          if (!res.ok) throw new Error(data.code || data.error)
          set({ user: data, isLoading: false, authRequested: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (username: string, password?: string) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })
          const data = await res.json()
          if (data.requiresPassword) throw new Error('ADMIN_PASSWORD_REQUIRED')
          if (!res.ok) throw new Error(data.code || data.error)
          set({ user: data, isLoading: false, authRequested: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
        set({ user: null })
      },

      validateSession: async () => {
        try {
          const res = await fetch('/api/auth/session', { cache: 'no-store' })
          if (!res.ok) {
            return
          }
          const data = await res.json()
          set({ user: data.user ?? null })
        } catch {}
      },

      requestAuth: (pendingAction) => set({ authRequested: true, pendingAction: pendingAction || null }),
      clearAuthRequest: () => set({ authRequested: false }),
      takePendingAction: () => {
        const action = get().pendingAction
        set({ pendingAction: null })
        return action
      },
    }),
    {
      name: 'music-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
