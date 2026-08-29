import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api'

export async function GET() {
  const auth = await requireUser(); if (auth.error) return auth.error
  const include = { _count: { select: { songs: true } }, owner: { select: { username: true } } } as const
  const [owned, shared] = await Promise.all([
    db.playlist.findMany({ where: { userId: auth.user.id }, include, orderBy: { updatedAt: 'desc' } }),
    db.playlist.findMany({ where: { shares: { some: { userId: auth.user.id } } }, include, orderBy: { updatedAt: 'desc' } }),
  ])
  return NextResponse.json({ owned, shared })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(); if (auth.error) return auth.error
  const name = String((await req.json()).name || '').trim()
  if (name.length < 1 || name.length > 40) return NextResponse.json({ error: 'Playlist name must be 1-40 characters' }, { status: 400 })
  try { return NextResponse.json(await db.playlist.create({ data: { userId: auth.user.id, name } }), { status: 201 }) }
  catch { return NextResponse.json({ error: 'You already have a playlist with that name' }, { status: 409 }) }
}
