import { create } from 'zustand'
import type { Track } from './player-store'

interface PlaylistDialogState {
  open: boolean
  track: Track | null
  openForTrack: (track: Track) => void
  close: () => void
}

export const usePlaylistDialogStore = create<PlaylistDialogState>((set) => ({
  open: false,
  track: null,
  openForTrack: (track) => set({ open: true, track }),
  close: () => set({ open: false, track: null }),
}))
