import { NextRequest, NextResponse } from 'next/server'

const SAAVN_API = 'https://saavn-api-theta.vercel.app'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const artistId = searchParams.get('id')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))

    if (!artistId) {
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 })
    }

    const url = `${SAAVN_API}/artists/${artistId}/songs?page=${page}`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch artist tracks' }, { status: 502 })
    }

    const data = await response.json()

    if (data.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Failed to fetch artist tracks', data: [] })
    }

    const results = data.data?.results || []
    const total = data.data?.total || results.length

    return NextResponse.json({ data: results, total, page, hasMore: data.data?.lastPage === false })
  } catch (error) {
    console.error('Artist tracks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
