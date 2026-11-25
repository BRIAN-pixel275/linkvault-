import { useRef, useState } from 'react'
import { createKeyCheck, createRecoveryKey, createSalt, decrypt, deriveKey, encrypt, wrapKey } from '../crypto'
import { supabase } from '../supabase'

export default function RecoveryReset({ userId, oldKey, onComplete, onCancel }) {
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const newKeyRef = useRef(null)

  async function submit(event) {
    event.preventDefault(); setError('')
    if (passphrase.length < 14) return setError('Use at least 14 characters for your new master passphrase.')
    if (passphrase !== confirm) return setError('The passphrases do not match.')
    setBusy(true)
    let staged = false
    try {
      const salt = createSalt()
      const newKey = await deriveKey(passphrase, salt)
      const recoveryKey = createRecoveryKey()
      const rowsResult = await supabase.from('vault_links').select('id,payload,iv')
      if (rowsResult.error) throw rowsResult.error
      for (const row of rowsResult.data || []) {
        const clearRecord = await decrypt(row.payload, row.iv, oldKey)
        const next = await encrypt(clearRecord, newKey)
        staged = true
        const { error: stageError } = await supabase.from('vault_links').update({ next_payload: next.payload, next_iv: next.iv }).eq('id', row.id).eq('user_id', userId)
        if (stageError) throw stageError
      }
      const check = await createKeyCheck(newKey)
      const wrapped = await wrapKey(newKey, recoveryKey)
      const { error: commitError } = await supabase.rpc('finish_vault_key_rotation', {
        p_kdf_salt: salt, p_wrapped_key: wrapped.wrapped_key, p_wrapped_key_iv: wrapped.wrapped_key_iv,
        p_key_check: check.payload, p_key_check_iv: check.iv,
      })
      if (commitError) throw commitError
      newKeyRef.current = newKey
      setResult({ recoveryKey, salt, ...wrapped, key_check: check.payload, key_check_iv: check.iv })
      setPassphrase(''); setConfirm('')
    } catch (err) {
      if (staged) await supabase.from('vault_links').update({ next_payload: null, next_iv: null }).eq('user_id', userId)
      setError(err.message || 'The passphrase reset failed. The existing vault is still encrypted with its previous key.')
    } finally { setBusy(false) }
  }

  if (result) return <section className="auth-panel wide"><div className="eyebrow">SAVE YOUR NEW RECOVERY KEY</div><h1>Passphrase reset.</h1>
    <p className="warning">Your old passphrase and old recovery key are no longer valid. Save this new recovery key offline before continuing.</p>
    <code className="recovery-key">{result.recoveryKey}</code><button className="primary full-width" onClick={() => onComplete(newKeyRef.current, result)}>I saved the new key</button></section>

  return <section className="auth-panel"><div className="eyebrow">RECOVERY</div><h1>Set a new passphrase.</h1>
    <p className="muted">Your links will be re-encrypted under the new passphrase. A new recovery key will replace the old one.</p>
    <form onSubmit={submit} className="stack"><label>New master passphrase<input type="password" autoComplete="new-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required /></label>
      <label>Confirm new passphrase<input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Re-encrypting links…' : 'Reset passphrase'}</button>
      <button type="button" className="quiet" onClick={onCancel} disabled={busy}>Cancel and lock</button></form></section>
}
