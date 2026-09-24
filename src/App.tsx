import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Home from './pages/Home'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Session error:', error)
      }

      setSession(data.session)

      if (data.session?.user) {
        await createProfile(data.session.user)
      }

      setLoading(false)
    }

    initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)

      if (session?.user) {
        await createProfile(session.user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const createProfile = async (user: User) => {
    const displayName =
      user.user_metadata?.display_name ??
      user.email?.split('@')[0] ??
      'User'

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          display_name: displayName,
        },
        {
          onConflict: 'id',
        }
      )

    if (error) {
      console.error('Profile creation error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5F0] text-sm text-stone-400">
        Loading...
      </div>
    )
  }

  return session ? <Home /> : <Login />
}

export default App
