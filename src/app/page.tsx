'use client'

import { useState, useEffect } from 'react'
import { AuthModal } from '@/components/music/auth-modal'
import { PlayerBar } from '@/components/music/player-bar'
import { SearchSection } from '@/components/music/search-section'
import { LikedSongs } from '@/components/music/liked-songs'
import { HomePage } from '@/components/music/home-page'
import { useAuthStore } from '@/stores/auth-store'
import { usePlayerStore } from '@/stores/player-store'
import { Button } from '@/components/ui/button'
import { Heart, Home, LogOut, LogIn, Menu, X, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { PlaylistDialog } from '@/components/music/playlist-dialog'
import { PlaylistLibrary } from '@/components/music/playlist-library'
import { AdminDashboard } from '@/components/music/admin-dashboard'
import { ListMusic, Shield } from 'lucide-react'

export default function MusicPage() {
  const { user, logout, requestAuth, validateSession } = useAuthStore()
  const [view, setView] = useState<'home' | 'search' | 'liked' | 'playlists' | 'admin'>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { setLikedTrackIds, clearQueue } = usePlayerStore()
  const { toast } = useToast()

  useEffect(() => { void validateSession() }, [validateSession])

  // Load liked track IDs when user logs in
  useEffect(() => {
    if (!user) {
      setLikedTrackIds([])
      return
    }
    fetch('/api/likes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLikedTrackIds(data.map((s: Record<string, unknown>) => String(s.trackId)))
        }
      })
      .catch(() => {})
  }, [user, setLikedTrackIds])

  const handleLogout = async () => {
    await logout()
    clearQueue()
    setView('home')
    toast({ title: 'Signed out', description: 'See you next time!' })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Vibe" className="w-6 h-6 rounded-md" />
            <span className="font-bold">Vibe</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => setView('search')}
          >
            <Search className="w-4 h-4" />
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => requestAuth()}
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar overlay for mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-5 pt-6 hidden lg:block">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Vibe" className="w-9 h-9 rounded-lg" />
              <div>
                <h1 className="font-bold text-lg leading-tight">Vibe</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ad-Free Music</p>
              </div>
            </div>
          </div>

          {/* Search in sidebar (desktop) */}
          <div className="px-3 mb-2 hidden lg:block">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search songs, artists..."
                className="pl-9 bg-secondary/50 border-border h-9 text-sm"
                onFocus={() => setView('search')}
              />
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            <button
              onClick={() => { setView('home'); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                view === 'home' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => { setView('search'); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                view === 'search' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={() => { setView('liked'); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                view === 'liked' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Heart className="w-4 h-4" />
              My Playlist
            </button>
            <button onClick={() => { setView('playlists'); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${view === 'playlists' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}>
              <ListMusic className="w-4 h-4" />Playlists
            </button>
            {user?.isAdmin && <button onClick={() => { setView('admin'); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${view === 'admin' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}>
              <Shield className="w-4 h-4" />Admin
            </button>}
          </nav>

          {/* User section at bottom */}
          <div className="p-3 border-t border-sidebar-border">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{user.username[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium truncate">{user.username}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full cursor-pointer"
                onClick={() => { requestAuth(); setSidebarOpen(false) }}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full"
            >
              {view === 'home' && <HomePage />}
              {view === 'search' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold mb-1">Search</h2>
                    <p className="text-muted-foreground text-sm">Find your favorite songs, artists, and albums</p>
                  </div>
                  <SearchSection />
                </div>
              )}
              {view === 'liked' && <LikedSongs />}
              {view === 'playlists' && <PlaylistLibrary />}
              {view === 'admin' && user?.isAdmin && <AdminDashboard />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Player bar */}
      <PlayerBar />

      {/* Auth modal (self-managed via store) */}
      <AuthModal />
      <PlaylistDialog />
    </div>
  )
}
