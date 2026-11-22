import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 360, margin: '15vh auto', padding: 16 }}>
      <h2>Link Vault</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', marginBottom: 8, padding: 10 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 8, padding: 10 }}
      />
      <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: 10 }}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  )
}