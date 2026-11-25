import { useState } from 'react'
import { createKeyCheck, decrypt, deriveKey, verifyKeyCheck } from '../crypto'
import { supabase } from '../supabase'

export default function Unlock({ userId, settings, onUnlock, onRecovery, onSignOut }) {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const key = await deriveKey(passphrase, settings.kdf_salt)
      if (settings.key_check && settings.key_check_iv) {
        if (!await verifyKeyCheck(settings.key_check, settings.key_check_iv, key)) throw new Error('Passphrase did not match.')
      } else {
        const { data: sample, error: sampleError } = await supabase.from('vault_links').select('payload,iv').limit(1).maybeSingle()
        if (sampleError) throw sampleError
        if (!sample) throw new Error('Use the recovery key once to initialize verification for this existing empty vault.')
        await decrypt(sample.payload, sample.iv, key)
        const check = await createKeyCheck(key)
        const { error: migrationError } = await supabase.from('vault_settings').update({ key_check: check.payload, key_check_iv: check.iv }).eq('user_id', userId)
        if (migrationError) throw migrationError
      }
      onUnlock(key); setPassphrase('')
    }
    catch { setError('That passphrase did not unlock this vault. Try again or use your recovery key.') }
    finally { setBusy(false) }
  }
  return <section className="auth-panel"><div className="eyebrow">VAULT LOCKED</div><h1>Your links, secured.</h1><p className="muted">Enter your master passphrase to decrypt your saved links on this device.</p>
    <form onSubmit={submit} className="stack"><label>Master passphrase<input type="password" autoComplete="off" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Deriving key…' : 'Unlock vault'}</button>
      <button type="button" className="quiet" onClick={onRecovery}>Use recovery key</button><button type="button" className="quiet" onClick={onSignOut}>Sign out</button></form>
  </section>
}
