import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'vibe_session'
const SESSION_DAYS = 180
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } })
  return { token, expiresAt }
}

export async function setSessionCookie(token: string, expiresAt: Date, secure: boolean) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    expires: expiresAt,
    maxAge: SESSION_MAX_AGE,
    priority: 'high',
  })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
  if (!session || session.expiresAt <= new Date() || session.user.isBlocked) return null
  await db.user.update({ where: { id: session.userId }, data: { lastSeenAt: new Date() } })
  return session.user
}

export function isAdminUsername(username: string) {
  return Boolean(process.env.ADMIN_USERNAME && username === process.env.ADMIN_USERNAME.trim().toLowerCase())
}
