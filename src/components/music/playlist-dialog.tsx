'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListMusic, Loader2, Plus } from 'lucide-react'
import { usePlaylistDialogStore } from '@/stores/playlist-store'
import { useAuthStore } from '@/stores/auth-store'
import { useToast } from '@/hooks/use-toast'

interface PlaylistSummary { id: string; name: string; _count?: { songs: number } }

export function PlaylistDialog() {
  const { open, track, close } = usePlaylistDialogStore()
  const user = useAuthStore(s => s.user)
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    const res = await fetch('/api/playlists')
    if (res.ok) setPlaylists((await res.json()).owned || [])
  }, [])
  useEffect(() => { if (open && user) void load() }, [open, user, load])

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return toast({ title: 'Could not create playlist', description: data.error, variant: 'destructive' })
    setName(''); await load()
  }

  const add = async (playlist: PlaylistSummary) => {
    if (!track) return
    setLoading(true)
    const res = await fetch(`/api/playlists/${playlist.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...track, trackId: track.id }) })
    const data = await res.json(); setLoading(false)
    if (!res.ok) return toast({ title: 'Could not add song', description: data.error, variant: 'destructive' })
    toast({ title: `Added to ${playlist.name}`, description: track.title }); close()
  }

  return <Dialog open={open} onOpenChange={v => { if (!v) close() }}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Add to a playlist</DialogTitle><DialogDescription>{user?.username}&apos;s playlists · {track?.title}</DialogDescription></DialogHeader>
      <div className="flex gap-2"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Create a new playlist" maxLength={40} onKeyDown={e => { if (e.key === 'Enter') void create() }} /><Button onClick={create} disabled={loading || !name.trim()}><Plus className="w-4 h-4 mr-1" />Create</Button></div>
      <div className="max-h-72 overflow-y-auto space-y-2">
        {loading && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
        {!loading && playlists.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Create your first playlist above.</p>}
        {playlists.map(pl => <button key={pl.id} onClick={() => void add(pl)} className="w-full flex items-center gap-3 rounded-lg bg-secondary/60 hover:bg-accent p-3 text-left cursor-pointer">
          <ListMusic className="w-5 h-5 text-primary" /><span className="flex-1 truncate font-medium">{pl.name}</span><span className="text-xs text-muted-foreground">{pl._count?.songs || 0} songs</span>
        </button>)}
      </div>
    </DialogContent>
  </Dialog>
}
