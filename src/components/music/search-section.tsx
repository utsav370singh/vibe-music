'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrackList, parseSaavnTrack } from './track-list'
import { ArtistGrid } from './artist-grid'
import { AlbumGrid } from './album-grid'
import { PodcastGrid, type PodcastSummary } from './podcast-grid'
import { Search, Loader2, X, Mic2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Track } from '@/stores/player-store'
import type { SaavnArtist } from './artist-grid'
import type { SaavnAlbum } from './album-grid'

function appendUniqueById<T extends { id: string }>(current: T[], incoming: T[]) {
  const knownIds = new Set(current.map(item => item.id))
  return [...current, ...incoming.filter(item => item.id && !knownIds.has(item.id))]
}

type SearchType = 'track' | 'artist' | 'album' | 'podcast'

export function SearchSection() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<SearchType>('track')
  const [tracks, setTracks] = useState<Track[]>([])
  const [artists, setArtists] = useState<SaavnArtist[]>([])
  const [albums, setAlbums] = useState<SaavnAlbum[]>([])
  const [podcasts, setPodcasts] = useState<PodcastSummary[]>([])
  const [initialLoading, setInitialLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const requestIdRef = useRef(0)

  const performSearch = useCallback(async (searchQuery: string, searchType: SearchType, nextPage = 0, append = false) => {
    if (!searchQuery.trim()) {
      setSearched(false)
      return
    }

    const requestId = append ? requestIdRef.current : ++requestIdRef.current
    if (append) setLoadingMore(true)
    else {
      setInitialLoading(true)
      setLoadingMore(false)
      setTracks([])
      setArtists([])
      setAlbums([])
      setPodcasts([])
    }
    setError('')
    setSearched(true)

    try {
      const endpoint = searchType === 'podcast' ? '/api/search/podcasts' : '/api/search'
      const typeParam = searchType === 'podcast' ? '' : `&type=${searchType}`
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(searchQuery)}${typeParam}&page=${nextPage}`)
      const data = await res.json()
      if (requestId !== requestIdRef.current) return
      if (!res.ok) {
        setError(data.error || 'Search is temporarily unavailable')
        setHasMore(false)
        return
      }
      setPage(nextPage)
      setHasMore(Boolean(data.hasMore))

      if (searchType === 'track') {
        const parsed = (data.data || []).map(parseSaavnTrack)
        setTracks(prev => append ? appendUniqueById(prev, parsed) : parsed)
      } else if (searchType === 'artist') {
        const incoming = (data.data as SaavnArtist[] | undefined) || []
        setArtists(prev => append ? appendUniqueById(prev, incoming) : incoming)
      } else if (searchType === 'album') {
        const incoming = (data.data as SaavnAlbum[] | undefined) || []
        setAlbums(prev => append ? appendUniqueById(prev, incoming) : incoming)
      } else if (searchType === 'podcast') {
        setPodcasts((data.data as PodcastSummary[] | undefined) || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      if (requestId === requestIdRef.current) {
        setInitialLoading(false)
        setLoadingMore(false)
      }
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
    const nextType = newType as SearchType
    setType(nextType)
    if (query.trim()) {
      performSearch(query, nextType)
    }
  }

  const clearSearch = () => {
    requestIdRef.current += 1
    setQuery('')
    setTracks([])
    setArtists([])
    setAlbums([])
    setPodcasts([])
    setError('')
    setSearched(false)
    setInitialLoading(false)
    setLoadingMore(false)
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
        <TabsList className="h-auto max-w-full flex-wrap justify-start bg-secondary">
          <TabsTrigger value="track" className="cursor-pointer">Songs</TabsTrigger>
          <TabsTrigger value="artist" className="cursor-pointer">Artists</TabsTrigger>
          <TabsTrigger value="album" className="cursor-pointer">Albums</TabsTrigger>
          <TabsTrigger value="podcast" className="cursor-pointer"><Mic2 className="mr-1 h-3.5 w-3.5" />Podcasts</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results */}
      <div className="min-h-[300px]">
        {searched && !initialLoading && !error && type === 'podcast' && (
          <p className="mb-3 text-xs text-muted-foreground">Podcast discovery by Podcast Index; audio is delivered by each publisher.</p>
        )}
        {initialLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-destructive/10 px-4 py-10 text-center text-sm text-destructive">{error}</div>
        ) : searched ? (
          type === 'track' ? (
            <TrackList tracks={tracks} showIndex />
          ) : type === 'artist' ? (
            <ArtistGrid artists={artists} />
          ) : type === 'album' ? (
            <AlbumGrid albums={albums} />
          ) : (
            <PodcastGrid podcasts={podcasts} />
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="w-16 h-16 mb-4 opacity-15" />
            <h3 className="text-lg font-medium mb-1 text-foreground/60">Search for music</h3>
            <p className="text-sm">Find your favorite Bollywood, Punjabi, and Indian songs</p>
          </div>
        )}
      </div>
      {searched && !initialLoading && hasMore && <div className="flex justify-center pt-2">
        <Button variant="secondary" disabled={loadingMore} onClick={() => performSearch(query, type, page + 1, true)}>
          {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
          {loadingMore ? 'Loading next 10...' : 'Load next 10'}
        </Button>
      </div>}
    </div>
  )
}
