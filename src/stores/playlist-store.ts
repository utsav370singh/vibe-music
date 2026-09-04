import { create } from 'zustand'
import type { Track } from './player-store'

interface PlaylistDialogState {
  open: boolean
  track: Track | null
  tracks: Track[]
  openForTrack: (track: Track) => void
  openForTracks: (tracks: Track[]) => void
  close: () => void
}

export const usePlaylistDialogStore = create<PlaylistDialogState>((set) => ({
  open: false,
  track: null,
  tracks: [],
  openForTrack: (track) => set({ open: true, track, tracks: [track] }),
  openForTracks: (tracks) => set({ open: true, track: tracks[0] || null, tracks }),
  close: () => set({ open: false, track: null, tracks: [] }),
}))
