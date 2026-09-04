import { NextRequest, NextResponse } from 'next/server'
import { fetchPodcastIndex, PodcastIndexConfigurationError } from '@/lib/podcast-index'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()
  if (!query) return NextResponse.json({ error: 'Search query is required' }, { status: 400 })

  try {
    const response = await fetchPodcastIndex('/search/byterm', { q: query, max: '30', clean: '1' })
    if (!response.ok) return NextResponse.json({ error: 'Podcast search is temporarily unavailable' }, { status: 502 })
    const payload = await response.json()
    const podcasts = (payload.feeds || []).map((feed: Record<string, unknown>) => ({
      id: String(feed.id || ''),
      title: String(feed.title || 'Untitled podcast'),
      author: String(feed.author || feed.ownerName || 'Unknown publisher'),
      description: String(feed.description || ''),
      imageUrl: String(feed.image || feed.artwork || ''),
      episodeCount: Number(feed.episodeCount) || 0,
    })).filter((feed: { id: string }) => feed.id)
    return NextResponse.json({ data: podcasts })
  } catch (error) {
    if (error instanceof PodcastIndexConfigurationError) {
      return NextResponse.json(
        { error: 'Add PODCAST_INDEX_KEY and PODCAST_INDEX_SECRET to enable podcast search', code: 'PODCAST_NOT_CONFIGURED' },
        { status: 503 }
      )
    }
    console.error('Podcast search error:', error)
    return NextResponse.json({ error: 'Podcast search failed' }, { status: 500 })
  }
}
