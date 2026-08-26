import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'track'
    const page = parseInt(searchParams.get('page') || '0')

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    const limit = 25
    const offset = page * limit

    let entity = 'song'
    if (type === 'artist') entity = 'allArtist'
    else if (type === 'album') entity = 'album'

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${entity}&limit=${limit}&offset=${offset}`

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from music service' }, { status: 502 })
    }

    const data = await response.json()

    return NextResponse.json({
      data: data.results || [],
      total: data.resultCount || 0,
      page,
      hasMore: offset + limit < (data.resultCount || 0),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}