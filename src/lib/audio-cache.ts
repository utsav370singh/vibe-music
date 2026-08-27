interface CachedAudio {
  buffer: Buffer
  size: number
  timestamp: number
}

const cache = new Map<string, CachedAudio>()
const MAX_CACHE_ENTRIES = 15
const MAX_CACHE_AGE = 30 * 60 * 1000 // 30 minutes

function hashKey(url: string): string {
  let h = 0
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h + url.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

function evictOldest() {
  if (cache.size <= MAX_CACHE_ENTRIES) return
  let oldest: string | null = null
  let oldestTime = Infinity
  for (const [key, val] of cache) {
    if (val.timestamp < oldestTime) {
      oldestTime = val.timestamp
      oldest = key
    }
  }
  if (oldest) cache.delete(oldest)
}

// Clean expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of cache) {
    if (now - val.timestamp > MAX_CACHE_AGE) cache.delete(key)
  }
}, 60_000)

export async function getAudio(url: string): Promise<Buffer> {
  const key = hashKey(url)
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < MAX_CACHE_AGE) {
    // Refresh timestamp on access
    cached.timestamp = Date.now()
    return cached.buffer
  }

  // Fetch the FULL audio file from Saavn
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`Audio fetch failed: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Cache it
  evictOldest()
  cache.set(key, { buffer, size: buffer.length, timestamp: Date.now() })

  return buffer
}

export function getCachedAudio(url: string): Buffer | null {
  const key = hashKey(url)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < MAX_CACHE_AGE) {
    return cached.buffer
  }
  return null
}
