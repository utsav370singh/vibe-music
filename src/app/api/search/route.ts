import { NextRequest, NextResponse } from 'next/server'

const SAAVN_API = 'https://saavn-api-theta.vercel.app'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'track'
    const page = parseInt(searchParams.get('page') || '0')

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    let endpoint = `${SAAVN_API}/search/songs`
    if (type === 'artist') endpoint = `${SAAVN_API}/search/artists`
    else if (type === 'album') endpoint = `${SAAVN_API}/search/albums`

    const url = `${endpoint}?query=${encodeURIComponent(query)}&page=${page}`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from JioSaavn' }, { status: 502 })
    }

    const data = await response.json()

    if (data.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Search failed', data: [] })
    }

    const results = data.data?.results || []
    const total = data.data?.total || results.length
    const hasMore = data.data?.lastPage === false || (page + 1) * 25 < total

    return NextResponse.json({
      data: results,
      total,
      page,
      hasMore,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
