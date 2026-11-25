import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Mfa({ onDone }) {
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isNewFactor, setIsNewFactor] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const verified = factors?.totp?.find((factor) => factor.status === 'verified')
      if (verified) {
        // Already set up: just ask for the code
        setFactorId(verified.id)
        return
      }
      // First time: enroll a new authenticator
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'vault-' + Date.now(),
      })
      if (error) return setError(error.message)
      setFactorId(data.id)
      setQr(data.totp.qr_code)
      setSecret(data.totp.secret)
      setIsNewFactor(true)
    }
    init()
  }, [])

  async function handleVerify(event) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      if (isNewFactor) {
        const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
        if (verifyError) throw verifyError
      } else {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
        if (challengeError) throw challengeError
        const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
        if (verifyError) throw verifyError
      }
      onDone()
    } catch (err) { setError(err.message || 'Could not verify this code.') }
    finally { setBusy(false) }
  }

  return (
    <section className="auth-panel mfa-panel">
      <div className="eyebrow">TWO-FACTOR AUTHENTICATION</div><h1>Verify it’s you.</h1>
      <p className="muted">{isNewFactor ? 'Scan with an authenticator app, then enter its current code.' : 'Enter the current code from your authenticator app.'}</p>
      {qr && (
        <div className="totp-setup"><img src={qr} alt="Scan this QR code to add Link Vault to your authenticator app" /><p>Or enter this setup key manually</p><code>{secret}</code></div>
      )}
      <form className="stack" onSubmit={handleVerify}>
        <label>6-digit code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy || !factorId}>{busy ? 'Verifying…' : isNewFactor ? 'Verify and enable MFA' : 'Verify and continue'}</button>
        <button type="button" className="quiet" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </form>
    </section>
  )
}
