import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const likedSongs = await db.likedSong.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(likedSongs)
  } catch (error) {
    console.error('Get likes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { trackId, title, artist, album, coverUrl, previewUrl, duration } = await req.json()

    if (!trackId || !title || !previewUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const likedSong = await db.likedSong.create({
      data: {
        userId,
        trackId,
        title,
        artist: artist || 'Unknown',
        album: album || 'Unknown',
        coverUrl: coverUrl || '',
        previewUrl,
        duration: duration || 30,
      },
    })

    return NextResponse.json(likedSong, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Already liked' }, { status: 409 })
    }
    console.error('Like error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    await db.likedSong.deleteMany({
      where: { userId, trackId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unlike error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
