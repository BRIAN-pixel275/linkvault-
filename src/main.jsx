import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Login from './components/Login'
import Mfa from './components/Mfa'
import Setup from './components/Setup'
import Unlock from './components/Unlock'
import Vault from './components/Vault'
import RecoveryReset from './components/RecoveryReset'
import DemoPreview from './components/DemoPreview'
import { createKeyCheck, verifyKeyCheck, unwrapKey } from './crypto'
import { useAutoLock } from './hooks/useAutoLock'
import { isSupabaseConfigured, supabase } from './supabase'
import './styles.css'

function App() {
  const previewMode = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1'
  const [session, setSession] = useState(null)
  const [aal2, setAal2] = useState(false)
  const [settings, setSettings] = useState(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [ready, setReady] = useState(false)
  const [, setUnlockVersion] = useState(0)
  const keyRef = useRef(null)
  const [recoveryKey, setRecoveryKey] = useState(null)
  const recoveredKeyRef = useRef(null)
  const [recoveryReset, setRecoveryReset] = useState(false)

  const wipe = useCallback(() => {
    keyRef.current = null
    setUnlockVersion((n) => n + 1)
  }, [])
  const countdown = useAutoLock(wipe, Boolean(session && aal2 && keyRef.current))

 const runId = useRef(0)

const inspect = useCallback(async (activeSession) => {
  const myRun = ++runId.current
  const stale = () => myRun !== runId.current
  try {
    setSession(activeSession)
    if (!activeSession) {
      setAal2(false); setSettings(null); setSettingsError(''); wipe()
      return
    }
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (stale()) return
    const isAal2 = assurance?.currentLevel === 'aal2'
    setAal2(isAal2)
    if (!isAal2) { wipe(); return }

    const { data, error } = await supabase
      .from('vault_settings')
      .select('kdf_salt,wrapped_key,wrapped_key_iv,key_check,key_check_iv')
      .maybeSingle()
    if (stale()) return
    if (error) { setSettings(null); setNeedsSetup(false); setSettingsError(error.message) }
    else if (!data) { setSettingsError(''); setNeedsSetup(true) }
    else { setSettings(data); setSettingsError(''); setNeedsSetup(false) }
  } catch (err) {
    if (!stale()) setSettingsError(err?.message || 'Could not reach the vault.')
  } finally {
    if (!stale()) setReady(true)
  }
}, [wipe])

  useEffect(() => {
    let alive = true
    if (!supabase || previewMode) { setReady(true); return undefined }
    supabase.auth.getSession().then(({ data }) => { if (alive) inspect(data.session) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { window.setTimeout(() => inspect(next), 0) })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [inspect, previewMode])

  async function recoveryUnlock(value) {
    try {
      const key = await unwrapKey(settings.wrapped_key, settings.wrapped_key_iv, value)
      if (settings.key_check && settings.key_check_iv && !await verifyKeyCheck(settings.key_check, settings.key_check_iv, key)) throw new Error('Recovery key did not match')
      if (!settings.key_check || !settings.key_check_iv) {
        const check = await createKeyCheck(key)
        const { error } = await supabase.from('vault_settings').update({ key_check: check.payload, key_check_iv: check.iv }).eq('user_id', session.user.id)
        if (error) throw error
      }
      setRecoveryKey(null); recoveredKeyRef.current = key; setRecoveryReset(true); setUnlockVersion((n) => n + 1)
    } catch { window.alert('That recovery key could not unlock this vault.') }
  }

  if (previewMode) return <DemoPreview />
  if (!isSupabaseConfigured) return <main className="auth-shell"><section className="auth-panel"><div className="eyebrow">SETUP REQUIRED</div><h1>Connect your vault.</h1><p className="muted">Create a Supabase project, run the schema in <code>supabase/schema.sql</code>, and add its project URL and anon key to <code>.env</code>.</p></section></main>
  if (!ready) return <main className="auth-shell"><div className="loading-mark">⌑</div></main>
  if (!session) return <main className="auth-shell"><Login onMfaRequired={(nextSession) => inspect(nextSession)} /></main>
  if (!aal2) return <main className="auth-shell"><Mfa onDone={() => inspect(session)} /></main>
  if (settingsError) return <main className="auth-shell"><section className="auth-panel"><div className="eyebrow">VAULT UNAVAILABLE</div><h1>Could not load vault settings.</h1><p className="error">{settingsError}</p><p className="muted">Check the Supabase schema and connection, then sign in again.</p><button className="quiet" onClick={() => supabase.auth.signOut()}>Sign out</button></section></main>
  if (needsSetup) return <main className="auth-shell"><Setup userId={session.user.id} onComplete={(key, oneTimeRecovery, savedSettings) => { if (key) keyRef.current = key; if (savedSettings) setSettings(savedSettings); if (oneTimeRecovery) setRecoveryKey('pending'); else { setNeedsSetup(false); setUnlockVersion((n) => n + 1) } }} /></main>
  if (recoveryReset) return <main className="auth-shell"><RecoveryReset userId={session.user.id} oldKey={recoveredKeyRef.current} onCancel={() => { recoveredKeyRef.current = null; setRecoveryReset(false); wipe() }} onComplete={(key, next) => { setSettings({ ...settings, kdf_salt: next.salt, wrapped_key: next.wrapped_key, wrapped_key_iv: next.wrapped_key_iv, key_check: next.key_check, key_check_iv: next.key_check_iv }); setRecoveryKey(null); recoveredKeyRef.current = null; setRecoveryReset(false); keyRef.current = key; setUnlockVersion((n) => n + 1) }} /></main>
  if (!keyRef.current) return <main className="auth-shell">{recoveryKey ? <section className="auth-panel"><div className="eyebrow">RECOVERY</div><h1>Recover your vault.</h1><p className="muted">Enter the offline recovery key you saved during setup.</p><RecoveryForm onSubmit={recoveryUnlock} /></section> : <Unlock userId={session.user.id} settings={settings} onUnlock={(key) => { keyRef.current = key; setUnlockVersion((n) => n + 1) }} onRecovery={() => setRecoveryKey('pending')} onSignOut={() => supabase.auth.signOut()} />}</main>
  if (recoveryKey === 'pending') return <main className="auth-shell"><section className="auth-panel"><div className="eyebrow">RECOVERY</div><h1>Recover your vault.</h1><p className="muted">Enter the offline recovery key you saved during setup.</p><RecoveryForm onSubmit={recoveryUnlock} /></section></main>
  return <Vault userId={session.user.id} email={session.user.email} settings={settings} keyRef={keyRef} countdown={countdown} onLock={wipe} onSignOut={() => supabase.auth.signOut()} />
}

function RecoveryForm({ onSubmit }) {
  const [value, setValue] = useState('')
  return <form className="stack" onSubmit={(e) => { e.preventDefault(); onSubmit(value) }}><label>Recovery key<input autoComplete="off" value={value} onChange={(e) => setValue(e.target.value.toUpperCase())} required /></label><button className="primary">Recover vault</button></form>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
