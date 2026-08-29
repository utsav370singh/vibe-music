import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(); if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!await db.playlist.findFirst({ where: { id, userId: auth.user.id } })) return NextResponse.json({ error: 'Only the owner can share this playlist' }, { status: 403 })
  const username = String((await req.json()).username || '').trim().toLowerCase()
  const recipient = await db.user.findUnique({ where: { username } })
  if (!recipient || recipient.isBlocked) return NextResponse.json({ error: 'Active username not found' }, { status: 404 })
  if (recipient.id === auth.user.id) return NextResponse.json({ error: 'This playlist already belongs to you' }, { status: 400 })
  await db.playlistShare.upsert({ where: { playlistId_userId: { playlistId: id, userId: recipient.id } }, create: { playlistId: id, userId: recipient.id }, update: {} })
  return NextResponse.json({ success: true, username })
}
