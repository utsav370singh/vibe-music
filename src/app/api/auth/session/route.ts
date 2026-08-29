import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { isAdminUsername } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({
    user: { id: user.id, username: user.username, isAdmin: isAdminUsername(user.username) },
  })
}
