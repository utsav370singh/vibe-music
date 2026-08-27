'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { usePlayerStore } from '@/stores/player-store'
import { useAuthStore } from '@/stores/auth-store'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, Heart, Music, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStreamUrl } from './track-list'

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    likedTrackIds,
    togglePlay,
    next,
    previous,
    setCurrentTime,
    setVolume,
    toggleLike,
  } = usePlayerStore()

  const { user } = useAuthStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)
  const [buffering, setBuffering] = useState(false)
  const progressContainerRef = useRef<HTMLDivElement>(null)
  const previousTrackIdRef = useRef<string | null>(null)

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
    }

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleEnded = () => {
      next()
    }

    const handleWaiting = () => setBuffering(true)
    const handlePlaying = () => setBuffering(false)
    const handleCanPlay = () => setBuffering(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [next, setCurrentTime, isDragging])

  // Load a new track when it changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    // Only reload if the track actually changed
    if (previousTrackIdRef.current === currentTrack.id) return
    previousTrackIdRef.current = currentTrack.id

    // Build the stream proxy URL from the Saavn download URL
    const streamUrl = getStreamUrl(currentTrack.previewUrl)
    if (!streamUrl) return

    audio.src = streamUrl
    audio.volume = volume
    audio.load()

    if (isPlaying) {
      audio.play().catch((err) => {
        console.error('Play failed:', err)
      })
    }
  }, [currentTrack?.id, isPlaying, volume])

  // Handle play/pause changes for the SAME track
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (previousTrackIdRef.current !== currentTrack.id) return

    if (isPlaying) {
      audio.play().catch(console.error)
    } else {
      audio.pause()
    }
  }, [isPlaying])

  // Handle volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Drag-to-seek helpers
  const getTimeFromEvent = useCallback((e: React.MouseEvent | React.PointerEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const pct = x / rect.width
    return pct * (currentTrack?.duration || 30)
  }, [currentTrack?.duration])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!progressContainerRef.current || !currentTrack) return
    e.preventDefault()
    const time = getTimeFromEvent(e, progressContainerRef.current)
    setIsDragging(true)
    setDragTime(time)
    progressContainerRef.current.setPointerCapture(e.pointerId)
  }, [currentTrack, getTimeFromEvent])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !progressContainerRef.current) return
    const time = getTimeFromEvent(e, progressContainerRef.current)
    setDragTime(time)
  }, [isDragging, getTimeFromEvent])

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return
    const audio = audioRef.current
    if (audio && audio.readyState >= 1) {
      audio.currentTime = dragTime
      setCurrentTime(dragTime)
    }
    setIsDragging(false)
  }, [isDragging, dragTime, setCurrentTime])

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0])
  }, [setVolume])

  const handleLike = useCallback(async () => {
    if (!user || !currentTrack) return

    const isLiked = likedTrackIds.has(currentTrack.id)
    toggleLike(currentTrack.id)

    try {
      if (isLiked) {
        await fetch(`/api/likes?trackId=${encodeURIComponent(currentTrack.id)}`, {
          method: 'DELETE',
          headers: { 'x-user-id': user.id },
        })
      } else {
        await fetch('/api/likes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            trackId: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: currentTrack.album,
            coverUrl: currentTrack.coverUrl,
            previewUrl: currentTrack.previewUrl,
            duration: currentTrack.duration,
          }),
        })
      }
    } catch (error) {
      toggleLike(currentTrack.id)
    }
  }, [user, currentTrack, likedTrackIds, toggleLike])

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const duration = currentTrack?.duration || 0
  const displayTime = isDragging ? dragTime : currentTime
  const progress = duration > 0 ? Math.min((displayTime / duration) * 100, 100) : 0
  const isLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-xl border-t border-border z-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Music className="w-4 h-4" />
          <span>Search for a song to start playing</span>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentTrack.id}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-xl border-t border-border z-50"
      >
        <div className="h-full flex flex-col justify-center px-4 gap-1">
          {/* Draggable seek bar */}
          <div
            ref={progressContainerRef}
            className="absolute top-0 left-0 right-0 h-2 group cursor-pointer touch-none select-none z-10"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => { if (isDragging) handlePointerUp() }}
          >
            <div className="h-full bg-secondary/80 relative mx-0">
              <div
                className="h-full bg-primary group-hover:bg-primary/80 transition-none"
                style={{ width: `${progress}%` }}
              />
              {/* Drag handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-4">
            {/* Track info */}
            <div className="flex items-center gap-3 min-w-0 w-1/3">
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-secondary">
                {currentTrack.coverUrl ? (
                  <img src={currentTrack.coverUrl} alt={currentTrack.album} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {buffering && <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />}
                  {currentTrack.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={previous}
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/80 cursor-pointer"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={next}
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatTime(displayTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 w-1/3 justify-end">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 cursor-pointer ${isLiked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={handleLike}
                disabled={!user}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              >
                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <div className="w-20 hidden sm:block">
                <Slider
                  value={[volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={(v) => handleVolumeChange([v[0] / 100])}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
