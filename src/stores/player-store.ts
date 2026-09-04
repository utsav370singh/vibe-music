import { create } from 'zustand'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  coverUrl: string
  previewUrl: string
  duration: number
  source?: 'saavn' | 'podcast'
}

interface PlayerState {
  // Queue
  queue: Track[]
  currentIndex: number

  // Playback
  isPlaying: boolean
  currentTime: number
  volume: number
  repeatMode: 'off' | 'all' | 'one'

  // Current track
  currentTrack: Track | null

  // Liked track IDs (optimistic)
  likedTrackIds: Set<string>

  // Actions
  setQueue: (tracks: Track[], startIndex?: number) => void
  addToQueue: (track: Track) => void
  playTrack: (track: Track, queue?: Track[]) => void
  togglePlay: () => void
  pause: () => void
  resume: () => void
  next: () => void
  previous: () => void
  setCurrentTime: (time: number) => void
  setVolume: (volume: number) => void
  cycleRepeat: () => void
  toggleLike: (trackId: string) => void
  setLikedTrackIds: (ids: string[]) => void
  clearQueue: () => void
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  volume: 0.8,
  repeatMode: 'off',
  currentTrack: null,
  likedTrackIds: new Set<string>(),

  setQueue: (tracks, startIndex = 0) => {
    const track = tracks[startIndex]
    set({
      queue: tracks,
      currentIndex: startIndex,
      currentTrack: track || null,
      isPlaying: track ? true : false,
      currentTime: 0,
    })
  },

  addToQueue: (track) => {
    const { queue } = get()
    set({ queue: [...queue, track] })
  },

  playTrack: (track, queue) => {
    if (queue) {
      const index = queue.findIndex((t) => t.id === track.id)
      set({
        queue,
        currentIndex: index >= 0 ? index : 0,
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
      })
    } else {
      const { queue: currentQueue } = get()
      const index = currentQueue.findIndex((t) => t.id === track.id)
      if (index >= 0) {
        set({
          currentIndex: index,
          currentTrack: track,
          isPlaying: true,
          currentTime: 0,
        })
      } else {
        set({
          queue: [track],
          currentIndex: 0,
          currentTrack: track,
          isPlaying: true,
          currentTime: 0,
        })
      }
    }
  },

  togglePlay: () => {
    const { isPlaying, currentTrack } = get()
    if (!currentTrack) return
    set({ isPlaying: !isPlaying })
  },

  pause: () => set({ isPlaying: false }),
  resume: () => {
    const { currentTrack } = get()
    if (currentTrack) set({ isPlaying: true })
  },

  next: () => {
    const { queue, currentIndex } = get()
    if (queue.length === 0) return
    const nextIndex = (currentIndex + 1) % queue.length
    set({
      currentIndex: nextIndex,
      currentTrack: queue[nextIndex],
      isPlaying: true,
      currentTime: 0,
    })
  },

  previous: () => {
    const { queue, currentIndex } = get()
    if (queue.length === 0) return
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length
    set({
      currentIndex: prevIndex,
      currentTrack: queue[prevIndex],
      isPlaying: true,
      currentTime: 0,
    })
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  cycleRepeat: () => set(({ repeatMode }) => ({ repeatMode: repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off' })),

  toggleLike: (trackId) => {
    const { likedTrackIds } = get()
    const newSet = new Set(likedTrackIds)
    if (newSet.has(trackId)) {
      newSet.delete(trackId)
    } else {
      newSet.add(trackId)
    }
    set({ likedTrackIds: newSet })
  },

  setLikedTrackIds: (ids) => set({ likedTrackIds: new Set(ids) }),

  clearQueue: () => set({ queue: [], currentIndex: 0 }),
}))
