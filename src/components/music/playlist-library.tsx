'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrackList } from './track-list'
import { useAuthStore } from '@/stores/auth-store'
import { usePlayerStore, type Track } from '@/stores/player-store'
import { Heart, ListMusic, Loader2, Play, Plus, Share2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Summary {
  id: string
  name: string
  owner: { username: string }
  _count: { songs: number }
}

interface Detail extends Summary {
  songs: Array<Track & { trackId: string }>
  shares: Array<{ user: { username: string } }>
}

type SelectedPlaylist = Detail | 'liked' | null

const toTrack = (song: Track & { trackId: string }): Track => ({ ...song, id: song.trackId })
const toLikedTrack = (song: Record<string, unknown>): Track => ({
  id: String(song.trackId),
  title: String(song.title),
  artist: String(song.artist),
  album: String(song.album),
  coverUrl: String(song.coverUrl || ''),
  previewUrl: String(song.previewUrl || ''),
  duration: Number(song.duration) || 0,
})

export function PlaylistLibrary() {
  const { user, requestAuth } = useAuthStore()
  const [owned, setOwned] = useState<Summary[]>([])
  const [shared, setShared] = useState<Summary[]>([])
  const [likedSongs, setLikedSongs] = useState<Track[]>([])
  const [selected, setSelected] = useState<SelectedPlaylist>(null)
  const [loading, setLoading] = useState(false)
  const [shareName, setShareName] = useState('')
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creating, setCreating] = useState(false)
  const setQueue = usePlayerStore(state => state.setQueue)
  const { toast } = useToast()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [playlistResponse, likesResponse] = await Promise.all([
        fetch('/api/playlists', { cache: 'no-store' }),
        fetch('/api/likes', { cache: 'no-store' }),
      ])
      if (playlistResponse.ok) {
        const data = await playlistResponse.json()
        setOwned(data.owned || [])
        setShared(data.shared || [])
      }
      if (likesResponse.ok) {
        const data = await likesResponse.json()
        setLikedSongs(Array.isArray(data) ? data.map(toLikedTrack) : [])
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const open = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/playlists/${id}`, { cache: 'no-store' })
      if (response.ok) setSelected(await response.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const createPlaylist = async () => {
    const name = newPlaylistName.trim()
    if (!name) return
    setCreating(true)
    const response = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await response.json()
    setCreating(false)
    if (!response.ok) {
      toast({ title: 'Could not create playlist', description: data.error, variant: 'destructive' })
      return
    }
    setNewPlaylistName('')
    toast({ title: `${name} created` })
    await load()
  }

  const share = async () => {
    if (!selected || selected === 'liked' || !shareName.trim()) return
    const username = shareName.trim().toLowerCase()
    const response = await fetch(`/api/playlists/${selected.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const data = await response.json()
    if (!response.ok) {
      toast({ title: 'Could not share', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: `Shared with ${username}` })
    setShareName('')
    await open(selected.id)
  }

  if (!user) {
    return (
      <div className="py-20 text-center">
        <ListMusic className="mx-auto mb-4 h-14 w-14 opacity-20" />
        <h2 className="mb-2 text-xl font-semibold">Sign in to use playlists</h2>
        <Button onClick={() => requestAuth()}>Sign in</Button>
      </div>
    )
  }

  if (loading) return <Loader2 className="mx-auto my-20 h-8 w-8 animate-spin text-primary" />

  if (selected === 'liked') {
    return (
      <div>
        <Button variant="ghost" onClick={() => setSelected(null)} className="mb-4">← All playlists</Button>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Your automatic playlist</p>
            <h2 className="text-3xl font-bold">Liked Songs</h2>
            <p className="text-sm text-muted-foreground">{likedSongs.length} songs</p>
          </div>
          {likedSongs.length > 0 && (
            <Button onClick={() => setQueue(likedSongs)}><Play className="mr-2 h-4 w-4" />Play all</Button>
          )}
        </div>
        <TrackList tracks={likedSongs} showIndex />
      </div>
    )
  }

  if (selected) {
    const tracks = selected.songs.map(toTrack)
    const mine = selected.owner.username === user.username
    return (
      <div>
        <Button variant="ghost" onClick={() => setSelected(null)} className="mb-4">← All playlists</Button>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{mine ? 'Your playlist' : `Shared by ${selected.owner.username}`}</p>
            <h2 className="text-3xl font-bold">{selected.name}</h2>
            <p className="text-sm text-muted-foreground">{tracks.length} songs</p>
          </div>
          {tracks.length > 0 && (
            <Button onClick={() => setQueue(tracks)}><Play className="mr-2 h-4 w-4" />Play all</Button>
          )}
        </div>
        {mine && (
          <div className="mb-6 flex max-w-md gap-2">
            <Input placeholder="Username to share with" value={shareName} onChange={event => setShareName(event.target.value)} />
            <Button onClick={() => void share()}><Share2 className="mr-1 h-4 w-4" />Share</Button>
          </div>
        )}
        <TrackList tracks={tracks} showIndex />
      </div>
    )
  }

  const playlistCards = [
    ...owned.map(playlist => ({ ...playlist, access: 'Yours' })),
    ...shared.map(playlist => ({ ...playlist, access: `Shared by ${playlist.owner.username}` })),
  ]

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold">Playlists</h2>
          <p className="text-sm text-muted-foreground">Liked songs, your playlists, and shared playlists—all in one place.</p>
        </div>
        <div className="flex w-full gap-2 sm:max-w-sm">
          <Input
            value={newPlaylistName}
            onChange={event => setNewPlaylistName(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') void createPlaylist() }}
            placeholder="New playlist name"
            maxLength={40}
          />
          <Button onClick={() => void createPlaylist()} disabled={creating || !newPlaylistName.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="hidden sm:inline">Create</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => setSelected('liked')}
          className="cursor-pointer rounded-xl bg-gradient-to-br from-primary/20 to-secondary p-4 text-left transition-colors hover:bg-accent"
        >
          <Heart className="mb-5 h-7 w-7 fill-primary text-primary" />
          <p className="truncate font-semibold">Liked Songs</p>
          <p className="text-xs text-muted-foreground">{likedSongs.length} songs · Automatic</p>
        </button>
        {playlistCards.map(playlist => (
          <button
            key={`${playlist.access}-${playlist.id}`}
            onClick={() => void open(playlist.id)}
            className="cursor-pointer rounded-xl bg-secondary/60 p-4 text-left transition-colors hover:bg-accent"
          >
            <ListMusic className="mb-5 h-7 w-7 text-primary" />
            <p className="truncate font-semibold">{playlist.name}</p>
            <p className="text-xs text-muted-foreground">{playlist._count.songs} songs · {playlist.access}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
