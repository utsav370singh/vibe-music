'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useToast } from '@/hooks/use-toast'
import { Music, UserPlus, LogIn, AtSign, Lock } from 'lucide-react'
import { usePlayerStore } from '@/stores/player-store'
import { usePlaylistDialogStore } from '@/stores/playlist-store'

export function AuthModal() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const { login, register, isLoading, authRequested, clearAuthRequest, takePendingAction, user } = useAuthStore()
  const { toast } = useToast()

  // Open modal when authRequested is true, or when manually opened
  const open = authRequested || false

  // Reset form when modal opens/closes is handled in handleOpenChange and switchMode

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setUsername('')
      setError('')
      setPassword('')
      setPasswordRequired(false)
      clearAuthRequest()
      return
    }
    // When opening, reset form if user just logged in
    if (user) {
      setUsername('')
      setError('')
      clearAuthRequest()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const normalizedUsername = username.trim().toLowerCase()

    try {
      if (mode === 'login') {
        await login(normalizedUsername, password || undefined)
        toast({ title: 'Welcome back!', description: `Logged in as ${normalizedUsername}` })
      } else {
        await register(normalizedUsername, password || undefined)
        toast({ title: 'Account created!', description: `Welcome, ${normalizedUsername}! Your playlist is ready.` })
      }
      const pending = takePendingAction()
      if (pending?.type === 'play') {
        if (pending.queue) usePlayerStore.getState().setQueue(pending.queue, Math.max(0, pending.queue.findIndex(t => t.id === pending.track.id)))
        else usePlayerStore.getState().playTrack(pending.track)
      } else if (pending?.type === 'playlist') {
        usePlaylistDialogStore.getState().openForTrack(pending.track)
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'ADMIN_PASSWORD_REQUIRED') {
        setPasswordRequired(true)
        setError('Enter the administrator password to continue.')
      } else if (err instanceof Error && err.message === 'INVALID_ADMIN_PASSWORD') {
        setPassword('')
        setPasswordRequired(true)
        setError('Incorrect administrator password. Please try again.')
      } else if (err instanceof Error && err.message === 'ADMIN_NOT_CONFIGURED') {
        setError('Administrator login is not configured. Add ADMIN_PASSWORD to the server environment.')
      } else if (err instanceof Error && err.message === 'DATABASE_UNAVAILABLE') {
        setError('The database is unavailable. Please check MongoDB Atlas Network Access and try again.')
      } else setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setUsername('')
    setError('')
    setPassword('')
    setPasswordRequired(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Music className="w-7 h-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            {mode === 'login' ? 'Welcome Back' : 'Join Vibe'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'Enter your username to continue'
              : 'Pick a unique username to get started'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={mode === 'login' ? 'Enter your username' : 'Choose a username'}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase())
                if (passwordRequired) {
                  setPassword('')
                  setPasswordRequired(false)
                  setError('')
                }
              }}
              required
              minLength={3}
              maxLength={80}
              className="pl-10 bg-secondary border-border h-11"
              autoFocus
              disabled={isLoading}
            />
          </div>

          {passwordRequired && <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" autoFocus placeholder="Administrator password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" />
          </div>}

          {mode === 'register' && (
            <p className="text-xs text-muted-foreground text-center">
              Usernames use letters, numbers, and underscores (3-20 characters).
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive text-center bg-destructive/10 py-2 px-3 rounded-lg">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer font-medium"
            disabled={isLoading || username.length < 3 || (passwordRequired && !password)}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Please wait...
              </span>
            ) : mode === 'login' ? (
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Sign In
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Create Account
              </span>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-primary hover:underline cursor-pointer font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-primary hover:underline cursor-pointer font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
