'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrackList, parseSaavnTrack } from './track-list'
import { ArtistGrid } from './artist-grid'
import { AlbumGrid } from './album-grid'
import { Search, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Track } from '@/stores/player-store'

export function SearchSection() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'track' | 'artist' | 'album'>('track')
  const [tracks, setTracks] = useState<Track[]>([])
  const [artists, setArtists] = useState<Record<string, unknown>[]>([])
  const [albums, setAlbums] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const performSearch = useCallback(async (searchQuery: string, searchType: string) => {
    if (!searchQuery.trim()) {
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`)
      const data = await res.json()

      if (searchType === 'track') {
        setTracks((data.data || []).map(parseSaavnTrack))
      } else if (searchType === 'artist') {
        setArtists(data.data || [])
      } else if (searchType === 'album') {
        setAlbums(data.data || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      performSearch(value, type)
    }, 400)
  }

  const handleTypeChange = (newType: string) => {
    setType(newType as 'track' | 'artist' | 'album')
    if (query.trim()) {
      performSearch(query, newType)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setTracks([])
    setArtists([])
    setAlbums([])
    setSearched(false)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search songs, artists, or albums..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          className="pl-10 pr-10 bg-secondary border-border h-11 text-sm"
          autoFocus
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 cursor-pointer"
            onClick={clearSearch}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Type tabs */}
      <Tabs value={type} onValueChange={handleTypeChange}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="track" className="cursor-pointer">Songs</TabsTrigger>
          <TabsTrigger value="artist" className="cursor-pointer">Artists</TabsTrigger>
          <TabsTrigger value="album" className="cursor-pointer">Albums</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : searched ? (
          type === 'track' ? (
            <TrackList tracks={tracks} showIndex />
          ) : type === 'artist' ? (
            <ArtistGrid artists={artists} />
          ) : (
            <AlbumGrid albums={albums} />
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="w-16 h-16 mb-4 opacity-15" />
            <h3 className="text-lg font-medium mb-1 text-foreground/60">Search for music</h3>
            <p className="text-sm">Find your favorite Bollywood, Punjabi, and Indian songs</p>
          </div>
        )}
      </div>
    </div>
  )
}
