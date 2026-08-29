import { NextResponse } from 'next/server'

const SAAVN_API = 'https://saavn-api-theta.vercel.app'

const CURATED_PLAYLISTS = [
  {
    id: 'trending',
    name: 'Trending Now',
    description: 'Most popular songs across India right now',
    emoji: '🔥',
    queries: ['trending hindi songs 2025', 'bollywood top hits', 'latest bollywood songs'],
  },
  {
    id: 'romantic',
    name: 'Romantic Hits',
    description: 'Love songs that touch your heart',
    emoji: '❤️',
    queries: ['romantic hindi songs', 'love songs arijit', 'bollywood love'],
  },
  {
    id: 'punjabi',
    name: 'Punjabi Beats',
    description: 'High-energy Punjabi music to groove to',
    emoji: '🎵',
    queries: ['punjabi songs', 'diljit dosanjh', 'ap dhillon'],
  },
  {
    id: 'sad',
    name: 'Sad Songs',
    description: 'Heartbreak and emotional melodies',
    emoji: '🌜',
    queries: ['sad hindi songs', 'heartbreak songs', 'arijit sad songs'],
  },
  {
    id: 'party',
    name: 'Party Anthems',
    description: 'Turn up the volume with these bangers',
    emoji: '🎉',
    queries: ['party songs hindi', 'bollywood dance', 'club songs india'],
  },
  {
    id: 'oldies',
    name: 'Bollywood Classics',
    description: 'Timeless gems from the golden era',
    emoji: '📺',
    queries: ['old bollywood songs', 'kishore kumar', 'lata mangeshkar hits'],
  },
]

interface SaavnSong {
  id: string
  name: string
  duration: string
  primaryArtists: string
  album: { id: string; name: string; url?: string }
  image: { quality: string; link: string }[]
  downloadUrl: { quality: string; link: string }[]
}

interface CachedSuggestions {
  tracks: Record<string, SaavnSong[]>
  timestamp: number
}

let cache: CachedSuggestions | null = null
const CACHE_TTL = 10 * 60 * 1000

async function fetchSongs(query: string, limit = 8): Promise<SaavnSong[]> {
  const url = `${SAAVN_API}/search/songs?query=${encodeURIComponent(query)}&page=0`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  if (data.status !== 'SUCCESS') return []
  return (data.data?.results || []).slice(0, limit)
}

async function fetchTrendingSongs(): Promise<SaavnSong[]> {
  const url = `${SAAVN_API}/modules`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  if (data.status !== 'SUCCESS') return []
  return data.data?.trending?.songs || []
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        playlists: CURATED_PLAYLISTS,
        tracks: cache.tracks,
      })
    }

    const tracksMap: Record<string, SaavnSong[]> = {}

    // Fetch trending from modules endpoint
    const trendingPromise = fetchTrendingSongs()

    // Fetch tracks for each playlist
    const playlistPromises = CURATED_PLAYLISTS.map(async (pl) => {
      const query = pl.queries[Math.floor(Math.random() * pl.queries.length)]
      const songs = await fetchSongs(query, 8)
      tracksMap[pl.id] = songs
    })

    const [trendingSongs] = await Promise.all([trendingPromise, ...playlistPromises])
    tracksMap['hero'] = trendingSongs.slice(0, 12)

    cache = { tracks: tracksMap, timestamp: Date.now() }

    return NextResponse.json({
      playlists: CURATED_PLAYLISTS,
      tracks: tracksMap,
    })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({
      playlists: CURATED_PLAYLISTS,
      tracks: cache?.tracks || {},
    })
  }
}
