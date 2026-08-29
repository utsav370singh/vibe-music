'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrackList } from './track-list'
import { useAuthStore } from '@/stores/auth-store'
import { usePlayerStore, type Track } from '@/stores/player-store'
import { ListMusic, Loader2, Play, Share2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Summary { id: string; name: string; owner: { username: string }; _count: { songs: number } }
interface Detail extends Summary { songs: Array<Track & { trackId: string }>; shares: Array<{ user: { username: string } }> }
const toTrack = (s: Track & { trackId: string }): Track => ({ ...s, id: s.trackId })

export function PlaylistLibrary() {
  const { user, requestAuth } = useAuthStore()
  const [owned, setOwned] = useState<Summary[]>([]), [shared, setShared] = useState<Summary[]>([])
  const [selected, setSelected] = useState<Detail | null>(null), [loading, setLoading] = useState(false), [shareName, setShareName] = useState('')
  const setQueue = usePlayerStore(s => s.setQueue), { toast } = useToast()
  const load = useCallback(async () => { if (!user) return; setLoading(true); const res = await fetch('/api/playlists'); if (res.ok) { const d = await res.json(); setOwned(d.owned); setShared(d.shared) } setLoading(false) }, [user])
  useEffect(() => { void load() }, [load])
  const open = useCallback(async (id: string) => { setLoading(true); const res = await fetch(`/api/playlists/${id}`); if (res.ok) setSelected(await res.json()); setLoading(false) }, [])
  const share = async () => { if (!selected || !shareName) return; const res = await fetch(`/api/playlists/${selected.id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: shareName }) }); const d = await res.json(); if (!res.ok) toast({ title: 'Could not share', description: d.error, variant: 'destructive' }); else { toast({ title: `Shared with ${shareName}` }); setShareName(''); void open(selected.id) } }
  if (!user) return <div className="text-center py-20"><ListMusic className="w-14 h-14 mx-auto opacity-20 mb-4"/><h2 className="text-xl font-semibold mb-2">Sign in to use playlists</h2><Button onClick={() => requestAuth()}>Sign in</Button></div>
  if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto my-20 text-primary" />
  if (selected) { const tracks = selected.songs.map(toTrack); const mine = selected.owner.username === user.username; return <div>
    <Button variant="ghost" onClick={() => setSelected(null)} className="mb-4">← All playlists</Button>
    <div className="flex flex-wrap justify-between gap-4 mb-6"><div><p className="text-sm text-muted-foreground">{mine ? 'Your playlist' : `Shared by ${selected.owner.username}`}</p><h2 className="text-3xl font-bold">{selected.name}</h2><p className="text-sm text-muted-foreground">{tracks.length} songs</p></div>{tracks.length > 0 && <Button onClick={() => setQueue(tracks)}><Play className="w-4 h-4 mr-2"/>Play all</Button>}</div>
    {mine && <div className="flex gap-2 max-w-md mb-6"><Input placeholder="Username to share with" value={shareName} onChange={e => setShareName(e.target.value)} /><Button onClick={() => void share()}><Share2 className="w-4 h-4 mr-1"/>Share</Button></div>}
    <TrackList tracks={tracks} showIndex />
  </div> }
  const section = (title: string, list: Summary[]) => <div className="mb-8"><h3 className="text-lg font-semibold mb-3">{title}</h3>{list.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{list.map(pl => <button key={pl.id} onClick={() => void open(pl.id)} className="rounded-xl bg-secondary/60 hover:bg-accent p-4 text-left cursor-pointer"><ListMusic className="w-7 h-7 text-primary mb-5"/><p className="font-semibold truncate">{pl.name}</p><p className="text-xs text-muted-foreground">{pl._count.songs} songs · {pl.owner.username}</p></button>)}</div>}</div>
  return <div><h2 className="text-3xl font-bold mb-1">Playlists</h2><p className="text-sm text-muted-foreground mb-7">Create playlists from any song&apos;s heart button.</p>{section('Your playlists', owned)}{section('Shared with you', shared)}</div>
}
