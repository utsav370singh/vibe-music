import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const albumId = searchParams.get('id')

    if (!albumId) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 })
    }

    const url = `https://itunes.apple.com/lookup?id=${albumId}&entity=song&limit=50`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch album tracks' }, { status: 502 })
    }

    const data = await response.json()
    // First result is the album, rest are tracks
    const tracks = (data.results || []).filter((r: any) => r.wrapperType === 'track')

    return NextResponse.json({ data: tracks, total: tracks.length })
  } catch (error) {
    console.error('Album tracks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
