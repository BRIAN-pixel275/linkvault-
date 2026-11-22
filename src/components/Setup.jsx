import { useState } from 'react'
import { createRecoveryKey, createSalt, deriveKey, wrapKey } from '../crypto'
import { supabase } from '../supabase'

export default function Setup({ userId, onComplete }) {
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [recovery, setRecovery] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError('')
    if (passphrase.length < 14) return setError('Use at least 14 characters for your master passphrase.')
    if (passphrase !== confirm) return setError('The passphrases do not match.')
    setBusy(true)
    try {
      const salt = createSalt()
      const key = await deriveKey(passphrase, salt)
      const recoveryKey = createRecoveryKey()
      const wrapped = await wrapKey(key, recoveryKey)
      const { error: saveError } = await supabase.from('vault_settings').insert({ user_id: userId, kdf_salt: salt, ...wrapped })
      if (saveError) throw saveError
      setPassphrase(''); setConfirm(''); setRecovery(recoveryKey); onComplete(key, recoveryKey)
    } catch (err) { setError(err.message || 'Setup could not be completed.') }
    finally { setBusy(false) }
  }
  if (recovery) return <section className="auth-panel wide"><div className="eyebrow">SAVE THIS OFFLINE</div><h1>Your recovery key</h1>
    <p className="warning">This key is shown once. Save it somewhere secure and offline. If you forget both your master passphrase and recovery key, your data is unrecoverable.</p>
    <code className="recovery-key">{recovery}</code><button className="primary" onClick={() => onComplete(null, null)}>I saved my recovery key</button></section>
  return <section className="auth-panel"><div className="eyebrow">FIRST-TIME SETUP</div><h1>Create your vault.</h1><p className="muted">Choose a long, unique master passphrase. It never leaves this browser.</p>
    <form onSubmit={submit} className="stack"><label>Master passphrase<input type="password" autoComplete="new-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required /></label>
      <label>Confirm passphrase<input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Securing your vault…' : 'Create vault'}</button></form></section>
}
