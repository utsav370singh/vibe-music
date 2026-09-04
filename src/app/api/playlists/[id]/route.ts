import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, trackData } from '@/lib/api'

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(); if (auth.error) return auth.error
  const { id } = await ctx.params
  const playlist = await db.playlist.findFirst({ where: { id, OR: [{ userId: auth.user.id }, { shares: { some: { userId: auth.user.id } } }] }, include: { songs: { orderBy: { createdAt: 'desc' } }, owner: { select: { username: true } }, shares: { include: { user: { select: { username: true } } } } } })
  return playlist ? NextResponse.json(playlist) : NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(); if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!await db.playlist.findFirst({ where: { id, userId: auth.user.id } })) return NextResponse.json({ error: 'Only the owner can add songs' }, { status: 403 })
  const body = await req.json() as Record<string, unknown>
  const rawTracks = Array.isArray(body.tracks) ? body.tracks.slice(0, 200) : [body]
  const uniqueTracks = [...new Map(
    rawTracks
      .map(item => trackData((item || {}) as Record<string, unknown>))
      .filter(track => track.trackId && track.previewUrl)
      .map(track => [track.trackId, track])
  ).values()]
  if (uniqueTracks.length === 0) return NextResponse.json({ error: 'No playable tracks were provided' }, { status: 400 })
  const songs = await Promise.all(uniqueTracks.map(track => db.playlistSong.upsert({
    where: { playlistId_trackId: { playlistId: id, trackId: track.trackId } },
    create: { playlistId: id, ...track },
    update: track,
  })))
  return NextResponse.json({ songs, count: songs.length }, { status: 201 })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(); if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!await db.playlist.findFirst({ where: { id, userId: auth.user.id } })) return NextResponse.json({ error: 'Only the owner can edit this playlist' }, { status: 403 })
  const trackId = new URL(req.url).searchParams.get('trackId')
  if (trackId) await db.playlistSong.deleteMany({ where: { playlistId: id, trackId } }); else await db.playlist.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
