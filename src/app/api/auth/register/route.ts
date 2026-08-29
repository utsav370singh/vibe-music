import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, isAdminUsername, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const trimmed = username.trim().toLowerCase()
    const adminRegistration = isAdminUsername(trimmed)
    if (adminRegistration) {
      const adminPassword = process.env.ADMIN_PASSWORD
      if (!adminPassword) {
        return NextResponse.json(
          { error: 'Administrator login is not configured', code: 'ADMIN_NOT_CONFIGURED' },
          { status: 503 }
        )
      }
      if (typeof password !== 'string' || password.length === 0) {
        return NextResponse.json({ requiresPassword: true, code: 'ADMIN_PASSWORD_REQUIRED' })
      }
      if (password !== adminPassword) {
        return NextResponse.json(
          { error: 'Incorrect administrator password', code: 'INVALID_ADMIN_PASSWORD' },
          { status: 401 }
        )
      }
    }
    if (!adminRegistration && trimmed.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    if (!adminRegistration && trimmed.length > 20) {
      return NextResponse.json({ error: 'Username must be at most 20 characters' }, { status: 400 })
    }
    if (!adminRegistration && !/^[a-z0-9_]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { username: trimmed } })
    if (existing) {
      if (adminRegistration) {
        if (existing.isBlocked) {
          return NextResponse.json({ error: 'This username has been blocked by the administrator.' }, { status: 403 })
        }
        const session = await createSession(existing.id)
        const secureCookie = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
        await setSessionCookie(session.token, session.expiresAt, secureCookie)
        return NextResponse.json({ id: existing.id, username: existing.username, isAdmin: true })
      }
      return NextResponse.json({ error: 'Username already taken. Try another one!' }, { status: 409 })
    }

    const user = await db.user.create({
      data: { username: trimmed },
    })
    const session = await createSession(user.id)
    const secureCookie = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
    await setSessionCookie(session.token, session.expiresAt, secureCookie)

    return NextResponse.json({
      id: user.id,
      username: user.username,
      isAdmin: adminRegistration,
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
