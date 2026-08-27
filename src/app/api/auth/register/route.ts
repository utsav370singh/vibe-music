import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const trimmed = username.trim().toLowerCase()
    if (trimmed.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    if (trimmed.length > 20) {
      return NextResponse.json({ error: 'Username must be at most 20 characters' }, { status: 400 })
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { username: trimmed } })
    if (existing) {
      return NextResponse.json({ error: 'Username already taken. Try another one!' }, { status: 409 })
    }

    const user = await db.user.create({
      data: { username: trimmed },
    })

    return NextResponse.json({
      id: user.id,
      username: user.username,
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
