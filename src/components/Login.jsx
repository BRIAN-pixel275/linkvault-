import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setBusy(false)
  }

  return <main className="auth-shell"><section className="auth-panel"><div className="eyebrow">PRIVATE LINK STORAGE</div><h1>Welcome back.</h1><p className="muted">Sign in to continue to your encrypted vault.</p>
    <form onSubmit={submit} className="stack"><label>Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <p className="login-footnote">This vault is private. Only the owner account can sign in.</p>
    </form></section></main>
}
