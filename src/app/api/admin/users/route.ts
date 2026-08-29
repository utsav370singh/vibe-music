import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api'

export async function GET() {
  const auth = await requireAdmin(); if (auth.error) return auth.error
  const users = await db.user.findMany({ select: { id: true, username: true, isBlocked: true, createdAt: true, lastSeenAt: true, _count: { select: { likedSongs: true, playlists: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(); if (auth.error) return auth.error
  const { id, isBlocked } = await req.json()
  if (!id || typeof isBlocked !== 'boolean') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  if (id === auth.user.id) return NextResponse.json({ error: 'You cannot block your own admin account' }, { status: 400 })
  const user = await db.user.update({ where: { id }, data: { isBlocked } })
  if (isBlocked) await db.session.deleteMany({ where: { userId: id } })
  return NextResponse.json({ id: user.id, username: user.username, isBlocked: user.isBlocked })
}
