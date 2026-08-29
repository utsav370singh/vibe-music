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

    const url = albumId
      ? `${SAAVN_API}/albums?id=${encodeURIComponent(albumId)}`
      : `${SAAVN_API}/search/songs?query=${encodeURIComponent(String(albumName))}&page=0`
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

    const tracks = albumId ? (data.data?.songs || []) : (data.data?.results || [])

    return NextResponse.json({ data: tracks, total: tracks.length })
  } catch (error) {
    console.error('Album tracks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
