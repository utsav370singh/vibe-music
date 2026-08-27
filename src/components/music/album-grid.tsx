'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrackList, parseSaavnTrack } from './track-list'
import { ChevronLeft, Disc3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import type { Track } from '@/stores/player-store'

interface SaavnAlbum {
  id: string
  name: string
  year?: string
  songCount?: string
  language?: string
  image?: { quality: string; link: string }[]
  primaryArtists?: { id: string; name: string; image?: boolean | { quality: string; link: string }[] }[]
  artists?: { id: string; name: string; image?: boolean | { quality: string; link: string }[] }[]
}

interface AlbumGridProps {
  albums: SaavnAlbum[]
}

function getAlbumCover(album: SaavnAlbum): string {
  const images = album.image || []
  const img = images.find(i => i.quality === '500x500') || images[images.length - 1]
  return img?.link || ''
}

function getAlbumArtist(album: SaavnAlbum): string {
  if (album.primaryArtists?.length) {
    return album.primaryArtists.map(a => a.name).join(', ')
  }
  if (album.artists?.length) {
    return album.artists.map(a => a.name).join(', ')
  }
  return 'Various Artists'
}

export function AlbumGrid({ albums }: AlbumGridProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<SaavnAlbum | null>(null)
  const [albumTracks, setAlbumTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)

  const handleSelectAlbum = async (album: SaavnAlbum) => {
    setSelectedAlbum(album)
    setLoading(true)
    try {
      const res = await fetch(`/api/search/album-tracks?id=${album.id}&name=${encodeURIComponent(album.name)}`)
      const data = await res.json()
      if (data.data) {
        setAlbumTracks(data.data.map(parseSaavnTrack))
      }
    } catch (error) {
      console.error('Failed to fetch album tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (selectedAlbum) {
    const coverUrl = getAlbumCover(selectedAlbum)
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-muted-foreground hover:text-foreground -ml-2 cursor-pointer"
          onClick={() => setSelectedAlbum(null)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to albums
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-secondary flex-shrink-0 shadow-xl">
            {coverUrl ? (
              <img src={coverUrl} alt={selectedAlbum.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc3 className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Album</p>
            <h2 className="text-2xl font-bold">{selectedAlbum.name}</h2>
            <p className="text-sm text-muted-foreground">
              {getAlbumArtist(selectedAlbum)}
              {selectedAlbum.songCount ? ` · ${selectedAlbum.songCount} tracks` : ''}
              {selectedAlbum.year ? ` · ${selectedAlbum.year}` : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="animate-pulse">Loading tracks...</div>
          </div>
        ) : (
          <TrackList tracks={albumTracks} showIndex />
        )}
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Disc3 className="w-12 h-12 mb-3 opacity-30" />
        <p>No albums found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {albums.map((album, index) => {
        const coverUrl = getAlbumCover(album)
        return (
          <motion.div
            key={album.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
            <Card
              className="bg-secondary/50 hover:bg-accent border-transparent cursor-pointer transition-all p-3 group"
              onClick={() => handleSelectAlbum(album)}
            >
              <div className="aspect-square rounded-md overflow-hidden bg-muted mb-3">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={album.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc3 className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-sm font-medium truncate">{album.name}</p>
              <p className="text-xs text-muted-foreground truncate">{getAlbumArtist(album)}</p>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
