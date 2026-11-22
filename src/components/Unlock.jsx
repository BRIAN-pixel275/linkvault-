import { useState } from 'react'
import { deriveKey } from '../crypto'

export default function Unlock({ salt, onUnlock, onRecovery, onSignOut }) {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { onUnlock(await deriveKey(passphrase, salt)); setPassphrase('') }
    catch { setError('Could not unlock the vault. Check your passphrase and try again.') }
    finally { setBusy(false) }
  }
  return <section className="auth-panel"><div className="eyebrow">VAULT LOCKED</div><h1>Your links, secured.</h1><p className="muted">Enter your master passphrase to decrypt your saved links on this device.</p>
    <form onSubmit={submit} className="stack"><label>Master passphrase<input type="password" autoComplete="off" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Deriving key…' : 'Unlock vault'}</button>
      <button type="button" className="quiet" onClick={onRecovery}>Use recovery key</button><button type="button" className="quiet" onClick={onSignOut}>Sign out</button></form>
  </section>
}
