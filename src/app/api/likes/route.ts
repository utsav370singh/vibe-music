import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, trackData } from '@/lib/api'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  return NextResponse.json(await db.likedSong.findMany({ where: { userId: auth.user.id }, orderBy: { createdAt: 'desc' } }))
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const track = trackData(await req.json())
  if (!track.trackId || !track.title || !track.previewUrl) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const song = await db.likedSong.upsert({ where: { userId_trackId: { userId: auth.user.id, trackId: track.trackId } }, create: { userId: auth.user.id, ...track }, update: track })
  return NextResponse.json(song, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const trackId = new URL(req.url).searchParams.get('trackId')
  if (!trackId) return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
  await db.likedSong.deleteMany({ where: { userId: auth.user.id, trackId } })
  return NextResponse.json({ success: true })
}
