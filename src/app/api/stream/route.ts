import { NextRequest, NextResponse } from 'next/server'
import { getAudio } from '@/lib/audio-cache'

// In-flight request dedup: if two requests ask for the same URL while it's downloading,
// the second one waits for the first instead of starting a duplicate download.
const inflight = new Map<string, Promise<Buffer>>()

async function getAudioDeduped(url: string): Promise<Buffer> {
  // Simple key for dedup
  let h = 0
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h + url.charCodeAt(i)) | 0
  }
  const key = (h >>> 0).toString(36)

  const existing = inflight.get(key)
  if (existing) return existing

  const promise = getAudio(url).finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const encodedUrl = searchParams.get('url')

    if (!encodedUrl) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    let url: string
    try {
      url = Buffer.from(encodedUrl, 'base64url').toString('utf-8')
    } catch {
      url = Buffer.from(encodedUrl, 'base64').toString('utf-8')
    }

    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const buffer = await getAudioDeduped(url)
    const totalSize = buffer.length

    const range = req.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10) || 0
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1

      if (start >= totalSize || end >= totalSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalSize}`,
          },
        })
      }

      const chunkSize = end - start + 1

      return new NextResponse(buffer.slice(start, end + 1), {
        status: 206,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    // Full file response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Stream error:', error)
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 })
  }
}
