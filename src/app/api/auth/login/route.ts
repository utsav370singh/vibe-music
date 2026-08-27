import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const trimmed = username.trim().toLowerCase()
    const user = await db.user.findUnique({ where: { username: trimmed } })
    if (!user) {
      return NextResponse.json({ error: 'Username not found. Please sign up first!' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
