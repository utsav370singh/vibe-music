import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { isAdminUsername } from '@/lib/auth'

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Sign in required or account blocked' }, { status: 401 }) }
  return { user, error: null }
}

export async function requireAdmin() {
  const auth = await requireUser()
  if (auth.error || !auth.user || !isAdminUsername(auth.user.username)) {
    return { user: null, error: NextResponse.json({ error: 'Administrator access required' }, { status: 403 }) }
  }
  return { user: auth.user, error: null }
}

export function trackData(body: Record<string, unknown>) {
  const source = body.source === 'podcast' ? 'podcast' : 'saavn'
  return {
    trackId: String(body.trackId || ''), title: String(body.title || ''), artist: String(body.artist || 'Unknown'),
    album: String(body.album || 'Unknown'), coverUrl: String(body.coverUrl || ''), previewUrl: String(body.previewUrl || ''),
    duration: Number(body.duration) || 0, source,
  }
}
