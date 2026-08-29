'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AdminUser {
  id: string
  username: string
  isBlocked: boolean
  createdAt: string
  lastSeenAt: string
  _count: { likedSongs: number; playlists: number }
}

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return toast({ title: 'Access denied', description: data.error, variant: 'destructive' })
    setUsers(data)
  }, [toast])

  useEffect(() => { void load() }, [load])

  const moderate = async (user: AdminUser) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, isBlocked: !user.isBlocked }),
    })
    const data = await res.json()
    if (!res.ok) return toast({ title: 'Could not update user', description: data.error, variant: 'destructive' })
    setUsers(list => list.map(item => item.id === user.id ? { ...item, isBlocked: !item.isBlocked } : item))
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return <div>
    <div className="flex items-center justify-between mb-6">
      <div><h2 className="text-2xl sm:text-3xl font-bold">Users</h2><p className="text-sm text-muted-foreground">{users.length} registered usernames</p></div>
      <Users className="w-8 h-8 text-primary" />
    </div>
    <div className="space-y-3 md:hidden">
      {users.map(user => <div key={user.id} className="rounded-xl border bg-card p-4">
        <div className="flex justify-between gap-3 mb-3"><div><p className="font-semibold">@{user.username}</p><p className="text-xs text-muted-foreground">Last active {new Date(user.lastSeenAt).toLocaleString()}</p></div><Badge variant={user.isBlocked ? 'destructive' : 'secondary'}>{user.isBlocked ? 'Blocked' : 'Allowed'}</Badge></div>
        <p className="text-xs text-muted-foreground mb-3">{user._count.likedSongs} likes · {user._count.playlists} playlists · joined {new Date(user.createdAt).toLocaleDateString()}</p>
        <Button className="w-full" size="sm" variant={user.isBlocked ? 'default' : 'destructive'} onClick={() => void moderate(user)}>{user.isBlocked ? 'Allow username' : 'Block username'}</Button>
      </div>)}
    </div>
    <div className="hidden md:block overflow-x-auto rounded-xl border">
      <table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="text-left p-3">Username</th><th className="text-left p-3">Joined</th><th className="text-left p-3">Last active</th><th className="text-left p-3">Library</th><th className="text-right p-3">Access</th></tr></thead>
      <tbody>{users.map(user => <tr key={user.id} className="border-t"><td className="p-3 font-medium">@{user.username}</td><td className="p-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td><td className="p-3 text-muted-foreground">{new Date(user.lastSeenAt).toLocaleString()}</td><td className="p-3 text-muted-foreground">{user._count.likedSongs} likes · {user._count.playlists} playlists</td><td className="p-3 text-right"><Button size="sm" variant={user.isBlocked ? 'default' : 'destructive'} onClick={() => void moderate(user)}>{user.isBlocked ? 'Allow' : 'Block'}</Button></td></tr>)}</tbody></table>
    </div>
  </div>
}
