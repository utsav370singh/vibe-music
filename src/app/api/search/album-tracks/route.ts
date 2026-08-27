import { NextRequest, NextResponse } from 'next/server'

const SAAVN_API = 'https://saavn-api-theta.vercel.app'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const albumName = searchParams.get('name')
    const albumId = searchParams.get('id')

    if (!albumName && !albumId) {
      return NextResponse.json({ error: 'Album name or ID is required' }, { status: 400 })
    }

    // Search for songs by album name to get album tracks
    const query = albumName || albumId
    const url = `${SAAVN_API}/search/songs?query=${encodeURIComponent(String(query))}&page=0`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch album tracks' }, { status: 502 })
    }

    const data = await response.json()

    if (data.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Failed to fetch album tracks', data: [] })
    }

    const results = data.data?.results || []
    // Filter to only songs from the same album if albumId is provided
    let tracks = results
    if (albumId) {
      tracks = results.filter((s: Record<string, unknown>) => {
        const album = s.album as Record<string, string> | undefined
        return album?.id === albumId
      })
      // If no matches by ID, return all results (search-based)
      if (tracks.length === 0) tracks = results
    }

    return NextResponse.json({ data: tracks, total: tracks.length })
  } catch (error) {
    console.error('Album tracks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
