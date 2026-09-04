'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TrackList } from './track-list'
import type { Track } from '@/stores/player-store'
import { ChevronLeft, Loader2, Mic2 } from 'lucide-react'
import { motion } from 'framer-motion'

export interface PodcastSummary {
  id: string
  title: string
  author: string
  description: string
  imageUrl: string
  episodeCount: number
}

export function PodcastGrid({ podcasts }: { podcasts: PodcastSummary[] }) {
  const [selected, setSelected] = useState<PodcastSummary | null>(null)
  const [episodes, setEpisodes] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const openPodcast = async (podcast: PodcastSummary) => {
    setSelected(podcast)
    setEpisodes([])
    setError('')
    setLoading(true)
    try {
      const response = await fetch(`/api/search/podcast-episodes?id=${encodeURIComponent(podcast.id)}`)
      const data = await response.json()
      if (!response.ok) setError(data.error || 'Could not load episodes')
      else setEpisodes(data.data || [])
    } catch {
      setError('Could not load episodes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (selected) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setSelected(null)}>
          <ChevronLeft className="mr-1 h-4 w-4" />Back to podcasts
        </Button>
        <div className="mb-6 flex items-center gap-4">
          <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-secondary shadow-xl">
            {selected.imageUrl ? (
              <img src={selected.imageUrl} alt={selected.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center"><Mic2 className="h-10 w-10 text-primary" /></div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Podcast</p>
            <h2 className="line-clamp-2 text-2xl font-bold">{selected.title}</h2>
            <p className="truncate text-sm text-muted-foreground">{selected.author}</p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="mx-auto my-16 h-8 w-8 animate-spin text-primary" />
        ) : error ? (
          <p className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">{error}</p>
        ) : (
          <TrackList tracks={episodes} showIndex />
        )}
      </div>
    )
  }

  if (podcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Mic2 className="mb-3 h-12 w-12 opacity-30" />
        <p>No podcasts found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {podcasts.map((podcast, index) => (
        <motion.div key={podcast.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.025 }}>
          <Card className="cursor-pointer border-transparent bg-secondary/50 p-3 transition-colors hover:bg-accent" onClick={() => void openPodcast(podcast)}>
            <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-muted">
              {podcast.imageUrl ? (
                <img src={podcast.imageUrl} alt={podcast.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Mic2 className="h-12 w-12 text-primary/60" /></div>
              )}
            </div>
            <p className="truncate text-sm font-medium">{podcast.title}</p>
            <p className="truncate text-xs text-muted-foreground">{podcast.author}</p>
            {podcast.episodeCount > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{podcast.episodeCount} episodes</p>}
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
