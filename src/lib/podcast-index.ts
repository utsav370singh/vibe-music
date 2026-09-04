import { createHash } from 'crypto'

const PODCAST_INDEX_API = 'https://api.podcastindex.org/api/1.0'

export class PodcastIndexConfigurationError extends Error {}

export async function fetchPodcastIndex(path: string, searchParams: Record<string, string>) {
  const key = process.env.PODCAST_INDEX_KEY?.trim()
  const secret = process.env.PODCAST_INDEX_SECRET?.trim()
  if (!key || !secret) throw new PodcastIndexConfigurationError('Podcast Index credentials are not configured')

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const authorization = createHash('sha1').update(`${key}${secret}${timestamp}`).digest('hex')
  const url = new URL(`${PODCAST_INDEX_API}${path}`)
  Object.entries(searchParams).forEach(([name, value]) => url.searchParams.set(name, value))

  return fetch(url, {
    headers: {
      'User-Agent': 'HiddenVibes/1.0',
      'X-Auth-Key': key,
      'X-Auth-Date': timestamp,
      Authorization: authorization,
    },
    next: { revalidate: 300 },
  })
}
