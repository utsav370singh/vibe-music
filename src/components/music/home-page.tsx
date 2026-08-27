'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePlayerStore, type Track } from '@/stores/player-store'
import { TrackList, parseITunesTrack } from './track-list'
import { Button } from '@/components/ui/button'
import { Play, ChevronRight, Loader2, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

interface Playlist {
  id: string
  name: string
  description: string
  emoji: string
  bg: string
}

function HeroSection({ tracks, onPlayAll }: { tracks: Track[]; onPlayAll: (tracks: Track[]) => void }) {
  const [currentBg, setCurrentBg] = useState(0)

  useEffect(() => {
    if (tracks.length === 0) return
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % Math.min(tracks.length, 5))
    }, 5000)
    return () => clearInterval(interval)
  }, [tracks.length])

  const heroTrack = tracks[currentBg]
  if (!heroTrack) return null

  return (
    <motion.div
      key={heroTrack.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-2xl overflow-hidden mb-8"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
      {heroTrack.coverUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 blur-sm scale-105"
          style={{ backgroundImage: `url(${heroTrack.coverUrl})` }}
        />
      )}

      <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-end gap-6 min-h-[200px]">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Trending Now</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold mb-2">Discover Music</h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-md">
            Search for any song, artist, or album. Like your favorites to build your personal playlist.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block w-20 h-20 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
            {heroTrack.coverUrl ? (
              <img src={heroTrack.coverUrl} alt={heroTrack.title} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{heroTrack.title}</p>
            <p className="text-xs text-muted-foreground">{heroTrack.artist}</p>
          </div>
        </div>

        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex-shrink-0"
          onClick={() => onPlayAll(tracks)}
        >
          <Play className="w-4 h-4 mr-2 fill-current" />
          Play Trending
        </Button>
      </div>
    </motion.div>
  )
}

function PlaylistRow({ playlist, tracks, onPlayAll }: { playlist: Playlist; tracks: Track[]; onPlayAll: (tracks: Track[]) => void }) {
  if (tracks.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">{playlist.emoji} {playlist.name}</h3>
          <p className="text-xs text-muted-foreground">{playlist.description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => onPlayAll(tracks)}
        >
          Play All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tracks.slice(0, 4).map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
    </motion.div>
  )
}

function TrackCard({ track }: { track: Track }) {
  const { playTrack } = usePlayerStore()

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => playTrack(track)}
      className={`bg-gradient-to-br ${'from-primary/10 to-secondary'} hover:from-primary/20 hover:to-accent rounded-xl p-3 text-left transition-all cursor-pointer group border border-transparent hover:border-border/50`}
    >
      <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2.5 relative">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
          </div>
        </div>
      </div>
      <p className="text-sm font-medium truncate">{track.title}</p>
      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
    </motion.button>
  )
}

export function HomePage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [trackMap, setTrackMap] = useState<Record<string, Track[]>>({})
  const [loading, setLoading] = useState(true)
  const { setQueue } = usePlayerStore()

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/suggestions')
      const data = await res.json()

      if (data.playlists) setPlaylists(data.playlists)

      // Parse all track arrays
      const parsed: Record<string, Track[]> = {}
      for (const [key, rawTracks] of Object.entries(data.tracks || {})) {
        parsed[key] = (rawTracks as any[]).map(parseITunesTrack).filter((t) => t.previewUrl)
      }
      setTrackMap(parsed)
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const handlePlayAll = (tracks: Track[]) => {
    const playable = tracks.filter((t) => t.previewUrl)
    if (playable.length > 0) setQueue(playable)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <HeroSection tracks={trackMap['hero'] || []} onPlayAll={handlePlayAll} />

      {playlists.map((pl) => (
        <PlaylistRow
          key={pl.id}
          playlist={pl}
          tracks={trackMap[pl.id] || []}
          onPlayAll={handlePlayAll}
        />
      ))}
    </div>
  )
}
