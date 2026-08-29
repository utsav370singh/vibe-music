'use client'

import { usePlayerStore, type Track } from '@/stores/player-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Play, Pause, Heart, Music } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePlaylistDialogStore } from '@/stores/playlist-store'

interface TrackListProps {
  tracks: Track[]
  showIndex?: boolean
}

// Parse a raw JioSaavn API song object into our Track format
export function parseSaavnTrack(raw: Record<string, unknown>): Track {
  const images = (raw.image as { quality: string; link: string }[]) || []
  const cover = images.find(i => i.quality === '500x500') || images[images.length - 1]

  const downloads = (raw.downloadUrl as { quality: string; link: string }[]) || []
  const dl320 = downloads.find(d => d.quality === '320kbps') || downloads[downloads.length - 1]

  // Decode HTML entities in song name
  const name = String(raw.name || 'Unknown')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  const albumObj = raw.album as { name?: string } | undefined

  return {
    id: String(raw.id || ''),
    title: name,
    artist: String(raw.primaryArtists || 'Unknown'),
    album: albumObj?.name || 'Unknown',
    coverUrl: cover?.link || '',
    previewUrl: dl320?.link || '',
    duration: parseInt(String(raw.duration || '0')) || 0,
  }
}

// Build the proxy stream URL from a Saavn download URL
export function getStreamUrl(saavnUrl: string): string {
  if (!saavnUrl) return ''
  // Use btoa (browser-native) + base64url encoding
  const encoded = btoa(saavnUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `/api/stream?url=${encoded}`
}

export function TrackList({ tracks, showIndex = false }: TrackListProps) {
  const { currentTrack, isPlaying, setQueue, togglePlay, likedTrackIds, toggleLike } = usePlayerStore()
  const { user, requestAuth } = useAuthStore()
  const openPlaylist = usePlaylistDialogStore(s => s.openForTrack)

  const handlePlay = (track: Track) => {
    const queueTracks = tracks.filter((t) => t.previewUrl)
    if (!user) { requestAuth({ type: 'play', track, queue: queueTracks }); return }
    const isCurrentTrack = currentTrack?.id === track.id
    if (isCurrentTrack) {
      togglePlay()
    } else {
      const queueIndex = queueTracks.findIndex((t) => t.id === track.id)
      if (queueIndex >= 0) {
        setQueue(queueTracks, queueIndex)
      } else {
        usePlayerStore.getState().playTrack(track)
      }
    }
  }

  const handleLike = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      requestAuth({ type: 'playlist', track })
      return
    }

    const isLiked = likedTrackIds.has(track.id)
    toggleLike(track.id)
    if (!isLiked) openPlaylist(track)

    try {
      if (isLiked) {
        await fetch(`/api/likes?trackId=${encodeURIComponent(track.id)}`, {
          method: 'DELETE',
        })
      } else {
        await fetch('/api/likes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trackId: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            coverUrl: track.coverUrl,
            previewUrl: track.previewUrl,
            duration: track.duration,
          }),
        })
      }
    } catch {
      toggleLike(track.id)
    }
  }

  const formatDuration = (sec: number) => {
    if (!sec || sec <= 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Music className="w-12 h-12 mb-3 opacity-30" />
        <p>No tracks found</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {tracks.map((track, index) => {
        const isCurrentTrack = currentTrack?.id === track.id
        const isCurrentPlaying = isCurrentTrack && isPlaying
        const isLiked = likedTrackIds.has(track.id)

        return (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02, duration: 0.2 }}
            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-accent ${
              isCurrentTrack ? 'bg-accent/80' : ''
            }`}
            onClick={() => handlePlay(track)}
          >
            {showIndex && (
              <span className={`w-6 text-center text-sm flex-shrink-0 ${isCurrentTrack ? 'text-primary' : 'text-muted-foreground'}`}>
                {isCurrentPlaying ? (
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse" />
                    <span className="w-0.5 h-4 bg-primary rounded-full animate-pulse [animation-delay:0.15s]" />
                    <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.3s]" />
                  </div>
                ) : (
                  index + 1
                )}
              </span>
            )}

            {/* Cover art */}
            <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-secondary">
              {track.coverUrl ? (
                <img src={track.coverUrl} alt={track.album} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                isCurrentPlaying ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
              }`}>
                {isCurrentPlaying ? null : (
                  isCurrentTrack ? (
                    <Pause className="w-4 h-4 text-white fill-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  )
                )}
              </div>
              {isCurrentPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-4">
                    <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
                    <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
                    <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
                    <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '80%', animationDelay: '450ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`}>
                {track.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
            </div>

            {/* Album name */}
            <p className="text-xs text-muted-foreground truncate max-w-[150px] hidden md:block">
              {track.album}
            </p>

            {/* Duration */}
            <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
              {formatDuration(track.duration)}
            </span>

            {/* Like button */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0 ${
                isLiked ? 'opacity-100 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={(e) => handleLike(track, e)}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          </motion.div>
        )
      })}
    </div>
  )
}
