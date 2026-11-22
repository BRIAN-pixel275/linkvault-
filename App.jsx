import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import Mfa from './components/Mfa'

export default function App() {
  const [session, setSession] = useState(null)
  const [aal, setAal] = useState(null)
  const [ready, setReady] = useState(false)

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    if (session) {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      setAal(data)
    } else {
      setAal(null)
    }
    setReady(true)
  }

  useEffect(() => {
    refresh()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setTimeout(refresh, 0) // avoids calling Supabase inside its own callback
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return <p style={{ padding: 16 }}>Loading...</p>
  if (!session) return <Login />
  if (aal?.currentLevel !== 'aal2') return <Mfa onDone={refresh} />

  return (
    <div style={{ padding: 16 }}>
      <h2>Vault unlocked (login + 2FA passed)</h2>
      <button onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}