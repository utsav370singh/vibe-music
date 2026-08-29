import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, isAdminUsername, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const trimmed = username.trim().toLowerCase()
    const adminLogin = isAdminUsername(trimmed)
    if (adminLogin) {
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
    const user = adminLogin
      ? await db.user.upsert({ where: { username: trimmed }, create: { username: trimmed }, update: {} })
      : await db.user.findUnique({ where: { username: trimmed } })
    if (!user) {
      return NextResponse.json({ error: 'Username not found. Please sign up first!' }, { status: 404 })
    }
    if (user.isBlocked) return NextResponse.json({ error: 'This username has been blocked by the administrator.' }, { status: 403 })

    const session = await createSession(user.id)
    const secureCookie = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
    await setSessionCookie(session.token, session.expiresAt, secureCookie)

    return NextResponse.json({
      id: user.id,
      username: user.username,
      isAdmin: adminLogin,
    })
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'The database is unavailable. Please check the MongoDB Atlas network access settings.', code: 'DATABASE_UNAVAILABLE' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
