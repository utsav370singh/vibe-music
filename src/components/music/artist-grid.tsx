'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrackList, parseSaavnTrack } from './track-list'
import { ChevronLeft, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import type { Track } from '@/stores/player-store'

interface SaavnArtist {
  id: string
  name: string
  url?: string
  role?: string
  image?: { quality: string; link: string }[]
}

interface ArtistGridProps {
  artists: SaavnArtist[]
}

function getArtistImage(artist: SaavnArtist): string {
 const images = artist.image || []
 const img = images.find(i => i.quality === '500x500') || images[images.length - 1]
 return img?.link || ''
}

export function ArtistGrid({ artists }: ArtistGridProps) {
  const [selectedArtist, setSelectedArtist] = useState<SaavnArtist | null>(null)
  const [topTracks, setTopTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)

  const handleSelectArtist = async (artist: SaavnArtist) => {
    setSelectedArtist(artist)
    setLoading(true)
    try {
      const res = await fetch(`/api/search/artist-top-tracks?id=${artist.id}`)
      const data = await res.json()
      if (data.data) {
        setTopTracks(data.data.map(parseSaavnTrack))
      }
    } catch (error) {
      console.error('Failed to fetch artist tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (selectedArtist) {
    const imgUrl = getArtistImage(selectedArtist)
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-muted-foreground hover:text-foreground -ml-2 cursor-pointer"
          onClick={() => setSelectedArtist(null)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to artists
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center flex-shrink-0">
            {imgUrl ? (
              <img src={imgUrl} alt={selectedArtist.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{selectedArtist.name}</h2>
            <p className="text-sm text-muted-foreground">Artist</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="animate-pulse">Loading tracks...</div>
          </div>
        ) : (
          <TrackList tracks={topTracks} showIndex />
        )}
      </div>
    )
  }

  if (artists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <User className="w-12 h-12 mb-3 opacity-30" />
        <p>No artists found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {artists.map((artist, index) => {
        const imgUrl = getArtistImage(artist)
        return (
          <motion.div
            key={artist.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
            <Card
              className="bg-secondary/50 hover:bg-accent border-transparent cursor-pointer transition-all p-4 group"
              onClick={() => handleSelectArtist(artist)}
            >
              <div className="aspect-square rounded-full bg-primary/15 flex items-center justify-center mb-3 mx-auto overflow-hidden">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <User className="w-12 h-12 text-primary/60 group-hover:text-primary transition-colors" />
                )}
              </div>
              <p className="text-sm font-medium truncate text-center">{artist.name}</p>
              <p className="text-xs text-muted-foreground text-center">Artist</p>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
