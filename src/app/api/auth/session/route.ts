import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { isAdminUsername } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No active session' }, { status: 401 })
  return NextResponse.json({ id: user.id, username: user.username, isAdmin: isAdminUsername(user.username) })
}
