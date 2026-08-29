import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { isAdminUsername } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  const response = !user ? NextResponse.json({ user: null }) : NextResponse.json({
    user: { id: user.id, username: user.username, isAdmin: isAdminUsername(user.username) },
  })
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}
