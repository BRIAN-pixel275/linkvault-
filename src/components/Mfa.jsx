import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Mfa({ onDone }) {
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const verified = factors?.totp?.[0]
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
    }
    init()
  }, [])

  async function handleVerify() {
    setError('')
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
    if (cErr) return setError(cErr.message)
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })
    if (vErr) return setError(vErr.message)
    onDone()
  }

  return (
    <div style={{ maxWidth: 360, margin: '10vh auto', padding: 16 }}>
      <h2>Two-factor check</h2>
      {qr && (
        <>
          <p>Scan this with Google Authenticator, Authy or similar:</p>
          <img src={qr} alt="2FA QR code" style={{ width: 200 }} />
          <p style={{ fontSize: 12 }}>Or enter manually: {secret}</p>
        </>
      )}
      <input
        placeholder="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={6}
        style={{ width: '100%', marginBottom: 8, padding: 10 }}
      />
      <button onClick={handleVerify} style={{ width: '100%', padding: 10 }}>
        Verify
      </button>
      <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', padding: 10, marginTop: 8 }}>
        Cancel
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  )
}