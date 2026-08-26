'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrackList, parseITunesTrack } from './track-list'
import { ChevronLeft, Disc3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import type { Track } from '@/stores/player-store'

interface AlbumResult {
  collectionId: number
  collectionName: string
  artworkUrl100: string
  artistName: string
  trackCount: number
  releaseDate: string
}

interface AlbumGridProps {
  albums: AlbumResult[]
}

export function AlbumGrid({ albums }: AlbumGridProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumResult | null>(null)
  const [albumTracks, setAlbumTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)

  const handleSelectAlbum = async (album: AlbumResult) => {
    setSelectedAlbum(album)
    setLoading(true)
    try {
      const res = await fetch(`/api/search/album-tracks?id=${album.collectionId}`)
      const data = await res.json()
      if (data.data) {
        setAlbumTracks(data.data.map(parseITunesTrack))
      }
    } catch (error) {
      console.error('Failed to fetch album tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCoverUrl = (url: string) => {
    return url.replace(/\d+x\d+bb/, '300x300bb')
  }

  if (selectedAlbum) {
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
            {selectedAlbum.artworkUrl100 ? (
              <img src={getCoverUrl(selectedAlbum.artworkUrl100)} alt={selectedAlbum.collectionName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc3 className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Album</p>
            <h2 className="text-2xl font-bold">{selectedAlbum.collectionName}</h2>
            <p className="text-sm text-muted-foreground">{selectedAlbum.artistName} &middot; {selectedAlbum.trackCount} tracks</p>
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
      {albums.map((album, index) => (
        <motion.div
          key={album.collectionId}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03, duration: 0.2 }}
        >
          <Card
            className="bg-secondary/50 hover:bg-accent border-transparent cursor-pointer transition-all p-3 group"
            onClick={() => handleSelectAlbum(album)}
          >
            <div className="aspect-square rounded-md overflow-hidden bg-muted mb-3">
              {album.artworkUrl100 ? (
                <img
                  src={getCoverUrl(album.artworkUrl100)}
                  alt={album.collectionName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Disc3 className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-sm font-medium truncate">{album.collectionName}</p>
            <p className="text-xs text-muted-foreground truncate">{album.artistName}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}