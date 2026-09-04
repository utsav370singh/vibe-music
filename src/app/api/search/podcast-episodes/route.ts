import { NextRequest, NextResponse } from 'next/server'
import { fetchPodcastIndex, PodcastIndexConfigurationError } from '@/lib/podcast-index'

export async function GET(request: NextRequest) {
  const feedId = request.nextUrl.searchParams.get('id')?.trim()
  if (!feedId || !/^\d+$/.test(feedId)) return NextResponse.json({ error: 'Valid podcast ID is required' }, { status: 400 })

  try {
    const response = await fetchPodcastIndex('/episodes/byfeedid', { id: feedId, max: '100', fulltext: '1' })
    if (!response.ok) return NextResponse.json({ error: 'Podcast episodes are temporarily unavailable' }, { status: 502 })
    const payload = await response.json()
    const episodes = (payload.items || []).map((episode: Record<string, unknown>) => ({
      id: `podcast:${String(episode.id || episode.guid || '')}`,
      title: String(episode.title || 'Untitled episode'),
      artist: String(episode.feedTitle || 'Podcast'),
      album: String(episode.feedTitle || 'Podcast'),
      coverUrl: String(episode.image || episode.feedImage || ''),
      previewUrl: String(episode.enclosureUrl || ''),
      duration: Number(episode.duration) || 0,
      source: 'podcast' as const,
      datePublished: Number(episode.datePublished) || 0,
    })).filter((episode: { id: string; previewUrl: string }) => episode.id !== 'podcast:' && episode.previewUrl.startsWith('https://'))
    return NextResponse.json({ data: episodes })
  } catch (error) {
    if (error instanceof PodcastIndexConfigurationError) {
      return NextResponse.json({ error: 'Podcast Index credentials are not configured', code: 'PODCAST_NOT_CONFIGURED' }, { status: 503 })
    }
    console.error('Podcast episodes error:', error)
    return NextResponse.json({ error: 'Could not load podcast episodes' }, { status: 500 })
  }
}
