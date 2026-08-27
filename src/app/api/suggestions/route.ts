import { NextResponse } from 'next/server'

interface ITunesTrack {
	trackId: number
	trackName: string
	artistName: string
	collectionName: string
	artworkUrl100: string
	previewUrl: string
	trackTimeMillis: number
}

const CURATED_PLAYLISTS = [
	{
		id: 'trending',
		name: 'Trending Now',
		description: 'What the world is listening to right now',
		emoji: '🔥',
		queries: ['top hits 2024', 'billboard hot', 'popular music'],
		bg: 'from-rose-500/20 via-transparent to-orange-500/20',
	},
	{
		id: 'chill',
		name: 'Chill Vibes',
		description: 'Relax and unwind with smooth tracks',
		emoji: '🌊',
		queries: ['chill lofi', 'relaxing music', 'ambient calm'],
		bg: 'from-cyan-500/20 via-transparent to-teal-500/20',
	},
	{
		id: 'workout',
		name: 'Workout Energy',
		description: 'High-energy tracks to push your limits',
		emoji: '⚡',
		queries: ['workout music', 'gym motivation', 'high energy'],
		bg: 'from-amber-500/20 via-transparent to-red-500/20',
	},
	{
		id: 'focus',
		name: 'Deep Focus',
		description: 'Concentrate with ambient and instrumental',
		emoji: '🎯',
		queries: ['instrumental focus', 'study music', 'ambient piano'],
		bg: 'from-violet-500/20 via-transparent to-purple-500/20',
	},
	{
		id: 'indie',
		name: 'Indie Discoveries',
		description: 'Hidden gems from independent artists',
		emoji: '✨',
		queries: ['indie alternative', 'indie pop rock', 'indie folk'],
		bg: 'from-emerald-500/20 via-transparent to-green-500/20',
	},
	{
		id: 'throwback',
		name: 'Throwback Hits',
		description: 'Classic tracks that never get old',
		emoji: '📻',
		queries: ['80s classic rock', '90s hits', '2000s pop'],
		bg: 'from-pink-500/20 via-transparent to-fuchsia-500/20',
	},
]

// In-memory cache
let cache: { data: Record<string, ITunesTrack[]>; timestamp: number } | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

async function fetchTracks(query: string, limit = 8): Promise<ITunesTrack[]> {
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`
	const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
	if (!res.ok) return []
	const data = await res.json()
	return (data.results || []).filter((t: ITunesTrack) => t.previewUrl)
}

export async function GET() {
	try {
		// Return cached if fresh
		if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
			return NextResponse.json({
				playlists: CURATED_PLAYLISTS,
				tracks: cache.data,
			})
		}

		// Fetch tracks for each playlist (one query per playlist)
		const tracksMap: Record<string, ITunesTrack[]> = {}
		const promises = CURATED_PLAYLISTS.map(async (pl) => {
			const query = pl.queries[Math.floor(Math.random() * pl.queries.length)]
			const tracks = await fetchTracks(query, 8)
			tracksMap[pl.id] = tracks
		})

		// Also fetch overall trending
		const trendingPromise = fetchTracks('top 50 global hits 2024', 12)

		await Promise.all([...promises, trendingPromise])
		tracksMap['hero'] = await trendingPromise

		cache = { data: tracksMap, timestamp: Date.now() }

		return NextResponse.json({
			playlists: CURATED_PLAYLISTS,
			tracks: tracksMap,
		})
	} catch (error) {
		console.error('Suggestions error:', error)
		// Return playlists even if tracks fail
		return NextResponse.json({
			playlists: CURATED_PLAYLISTS,
			tracks: cache?.data || {},
		})
	}
}
