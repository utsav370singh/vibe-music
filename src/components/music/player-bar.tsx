'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { usePlayerStore } from '@/stores/player-store'
import { useAuthStore } from '@/stores/auth-store'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, Heart, Music, Loader2, Repeat2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStreamUrl } from './track-list'
import { usePlaylistDialogStore } from '@/stores/playlist-store'

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    repeatMode,
    likedTrackIds,
    togglePlay,
    next,
    previous,
    setCurrentTime,
    setVolume,
    cycleRepeat,
    toggleLike,
  } = usePlayerStore()

  const { user, requestAuth } = useAuthStore()
  const openPlaylist = usePlaylistDialogStore(s => s.openForTrack)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)
  const [buffering, setBuffering] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const progressContainerRef = useRef<HTMLDivElement>(null)
  const previousTrackIdRef = useRef<string | null>(null)
  const duration = currentTrack?.duration || 0
  const displayTime = isDragging ? dragTime : currentTime

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
      audioRef.current.setAttribute('playsinline', '')
    }

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0
        void audio.play()
        return
      }
      const player = usePlayerStore.getState()
      if (repeatMode === 'off' && player.currentIndex >= player.queue.length - 1) {
        player.pause()
        player.setCurrentTime(audio.duration || player.currentTrack?.duration || 0)
        return
      }
      player.next()
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
  }, [next, setCurrentTime, isDragging, repeatMode])

  // Load a new track when it changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    // Only reload if the track actually changed
    if (previousTrackIdRef.current === currentTrack.id) return
    previousTrackIdRef.current = currentTrack.id

    // Build the stream proxy URL from the Saavn download URL
    const streamUrl = getStreamUrl(currentTrack)
    if (!streamUrl) return

    audio.src = streamUrl
    audio.volume = volume
    audio.load()

    if (isPlaying) {
      audio.play().catch((err) => {
        console.error('Play failed:', err)
      })
    }
  }, [currentTrack, isPlaying, volume])

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
  }, [isPlaying, currentTrack])

  // Handle volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Expose playback controls and song details to browser/OS lock screens.
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: currentTrack.coverUrl ? [{ src: currentTrack.coverUrl }] : [],
    })

    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { navigator.mediaSession.setActionHandler(action, handler) } catch {}
    }
    const seek = (time: number) => {
      const audio = audioRef.current
      if (!audio || !Number.isFinite(time)) return
      const nextTime = Math.max(0, Math.min(time, audio.duration || currentTrack.duration || time))
      audio.currentTime = nextTime
      usePlayerStore.getState().setCurrentTime(nextTime)
    }

    setHandler('play', () => usePlayerStore.getState().resume())
    setHandler('pause', () => usePlayerStore.getState().pause())
    setHandler('nexttrack', () => usePlayerStore.getState().next())
    setHandler('previoustrack', () => usePlayerStore.getState().previous())
    setHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') seek(details.seekTime)
    })
    setHandler('seekbackward', (details) => {
      const audio = audioRef.current
      seek((audio?.currentTime || 0) - (details.seekOffset || 10))
    })
    setHandler('seekforward', (details) => {
      const audio = audioRef.current
      seek((audio?.currentTime || 0) + (details.seekOffset || 10))
    })

    return () => {
      setHandler('play', null)
      setHandler('pause', null)
      setHandler('nexttrack', null)
      setHandler('previoustrack', null)
      setHandler('seekto', null)
      setHandler('seekbackward', null)
      setHandler('seekforward', null)
    }
  }, [currentTrack])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState || duration <= 0) return
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current?.playbackRate || 1,
        position: Math.max(0, Math.min(displayTime, duration)),
      })
    } catch {}
  }, [displayTime, duration])

  useEffect(() => {
    if (!mobileDrawerOpen) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileDrawerOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileDrawerOpen])

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

  const handleDrawerSeek = useCallback((time: number) => {
    const audio = audioRef.current
    if (audio && audio.readyState >= 1) audio.currentTime = time
    setCurrentTime(time)
  }, [setCurrentTime])

  const openMobileDrawer = useCallback(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setMobileDrawerOpen(true)
  }, [])

  const handleLike = useCallback(async () => {
    if (!currentTrack) return
    if (!user) {
      setMobileDrawerOpen(false)
      requestAuth({ type: 'playlist', track: currentTrack })
      return
    }

    const isLiked = likedTrackIds.has(currentTrack.id)
    toggleLike(currentTrack.id)
    if (!isLiked) {
      setMobileDrawerOpen(false)
      openPlaylist(currentTrack)
    }

    try {
      if (isLiked) {
        await fetch(`/api/likes?trackId=${encodeURIComponent(currentTrack.id)}`, {
          method: 'DELETE',
        })
      } else {
        await fetch('/api/likes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
    } catch {
      toggleLike(currentTrack.id)
    }
  }, [user, currentTrack, likedTrackIds, toggleLike, requestAuth, openPlaylist])

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

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
    <>
    <AnimatePresence mode="wait">
      <motion.div
        key={currentTrack.id}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-xl border-t border-border z-50 md:cursor-default cursor-pointer"
        onClick={openMobileDrawer}
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
            onClick={(event) => event.stopPropagation()}
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
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-[42%] sm:w-1/3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden flex-shrink-0 bg-secondary">
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
            <div className="flex flex-col items-center gap-1 flex-1" onClick={(event) => event.stopPropagation()}>
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
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatTime(displayTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-0 sm:gap-2 w-auto sm:w-1/3 justify-end" onClick={(event) => event.stopPropagation()}>
              <Button variant="ghost" size="icon" title={`Repeat: ${repeatMode}`} className={`h-8 w-8 cursor-pointer relative ${repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground'}`} onClick={cycleRepeat}>
                <Repeat2 className="w-4 h-4" />{repeatMode === 'one' && <span className="absolute text-[8px] font-bold">1</span>}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 cursor-pointer ${isLiked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={handleLike}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
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
    <AnimatePresence>
      {mobileDrawerOpen && (
        <motion.div
          className="fixed inset-0 z-[60] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Now playing ${currentTrack.title}`}
        >
          <button
            type="button"
            aria-label="Close now playing"
            className="absolute inset-0 h-full w-full cursor-default bg-black/65 touch-none"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <motion.section
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 h-[50dvh] overflow-hidden rounded-t-3xl border-t border-border bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Now playing</p>
                <p className="max-w-[70vw] truncate text-sm font-semibold">{currentTrack.title}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setMobileDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-3 flex min-h-0 items-center gap-4">
              <div className="aspect-square w-[min(28vw,7rem)] flex-shrink-0 overflow-hidden rounded-2xl bg-secondary shadow-lg">
                {currentTrack.coverUrl ? (
                  <img src={currentTrack.coverUrl} alt={currentTrack.album} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Music className="h-8 w-8 text-muted-foreground" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{currentTrack.title}</p>
                <p className="truncate text-sm text-muted-foreground">{currentTrack.artist}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground/70">{currentTrack.album}</p>
              </div>
            </div>

            <div className="mt-4">
              <input
                type="range"
                min={0}
                max={Math.max(duration, 1)}
                step={1}
                value={Math.min(displayTime, Math.max(duration, 1))}
                onChange={(event) => handleDrawerSeek(Number(event.target.value))}
                aria-label="Song progress"
                className="h-1.5 w-full cursor-pointer accent-primary"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>{formatTime(displayTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between px-2">
              <Button variant="ghost" size="icon" title={`Repeat: ${repeatMode}`} className={repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground'} onClick={cycleRepeat}>
                <Repeat2 className="h-5 w-5" />
                {repeatMode === 'one' && <span className="absolute text-[8px] font-bold">1</span>}
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={previous}><SkipBack className="h-6 w-6 fill-current" /></Button>
              <Button variant="default" size="icon" className="h-14 w-14 rounded-full" onClick={togglePlay}>
                {buffering ? <Loader2 className="h-6 w-6 animate-spin" /> : isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={next}><SkipForward className="h-6 w-6 fill-current" /></Button>
              <Button variant="ghost" size="icon" className={isLiked ? 'text-primary' : 'text-muted-foreground'} onClick={handleLike}>
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
