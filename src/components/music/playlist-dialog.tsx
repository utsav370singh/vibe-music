'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListMusic, Loader2, Plus } from 'lucide-react'
import { usePlaylistDialogStore } from '@/stores/playlist-store'
import { useAuthStore } from '@/stores/auth-store'
import { useToast } from '@/hooks/use-toast'

interface PlaylistSummary {
  id: string
  name: string
  _count?: { songs: number }
}

export function PlaylistDialog() {
  const { open, track, tracks, close } = usePlaylistDialogStore()
  const user = useAuthStore(state => state.user)
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    const response = await fetch('/api/playlists')
    if (response.ok) setPlaylists((await response.json()).owned || [])
  }, [])

  useEffect(() => {
    if (open && user) void load()
  }, [open, user, load])

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    const response = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      toast({ title: 'Could not create playlist', description: data.error, variant: 'destructive' })
      return
    }
    setName('')
    await load()
  }

  const add = async (playlist: PlaylistSummary) => {
    if (!track) return
    setLoading(true)
    const payload = tracks.length > 1
      ? { tracks: tracks.map(item => ({ ...item, trackId: item.id })) }
      : { ...track, trackId: track.id }
    const response = await fetch(`/api/playlists/${playlist.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      toast({ title: 'Could not add music', description: data.error, variant: 'destructive' })
      return
    }
    toast({
      title: `Added to ${playlist.name}`,
      description: tracks.length > 1 ? `${data.count || tracks.length} album songs added` : track.title,
    })
    close()
  }

  const isAlbum = tracks.length > 1

  return (
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isAlbum ? 'Add album to a playlist' : 'Add to a playlist'}</DialogTitle>
          <DialogDescription>
            {user?.username}&apos;s playlists · {isAlbum ? `${tracks.length} songs from ${track?.album}` : track?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Create a new playlist"
            maxLength={40}
            onKeyDown={event => { if (event.key === 'Enter') void create() }}
          />
          <Button onClick={create} disabled={loading || !name.trim()}>
            <Plus className="mr-1 h-4 w-4" />Create
          </Button>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
          {!loading && playlists.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Create your first playlist above.</p>
          )}
          {playlists.map(playlist => (
            <button
              key={playlist.id}
              onClick={() => void add(playlist)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-secondary/60 p-3 text-left hover:bg-accent"
            >
              <ListMusic className="h-5 w-5 text-primary" />
              <span className="flex-1 truncate font-medium">{playlist.name}</span>
              <span className="text-xs text-muted-foreground">{playlist._count?.songs || 0} songs</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
