'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { usePlayerStore, type Track } from '@/stores/player-store'
import { TrackList } from './track-list'
import { Heart, Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LikedSongs() {
  const { user, requestAuth } = useAuthStore()
  const { setQueue, likedTrackIds, setLikedTrackIds } = usePlayerStore()
  const [songs, setSongs] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLikedSongs = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/likes', {
        headers: { 'x-username': user.username },
      })
      const data = await res.json()
      setSongs(data.map((s: Record<string, unknown>) => ({
        id: String(s.trackId),
        title: String(s.title),
        artist: String(s.artist),
        album: String(s.album),
        coverUrl: String(s.coverUrl || ''),
        previewUrl: String(s.previewUrl),
        duration: Number(s.duration) || 0,
      })))
      setLikedTrackIds(data.map((s: Record<string, unknown>) => String(s.trackId)))
    } catch (error) {
      console.error('Failed to fetch liked songs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLikedSongs()
  }, [user])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <LogIn className="w-16 h-16 mb-4 opacity-15" />
        <h3 className="text-lg font-medium mb-2 text-foreground/60">Sign in to see your playlist</h3>
        <p className="text-sm text-muted-foreground mb-4">Your liked songs will appear here</p>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          onClick={requestAuth}
        >
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Heart className="w-16 h-16 mb-4 opacity-15" />
        <h3 className="text-lg font-medium mb-1 text-foreground/60">No liked songs yet</h3>
        <p className="text-sm">Search for music and tap the heart icon to save songs</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{user.username}&apos;s Playlist</h2>
          <p className="text-sm text-muted-foreground">{songs.length} songs</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          onClick={() => setQueue(songs)}
        >
          Play All
        </Button>
      </div>
      <TrackList tracks={songs} showIndex />
    </div>
  )
}