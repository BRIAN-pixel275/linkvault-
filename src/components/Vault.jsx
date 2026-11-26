import { useCallback, useEffect, useMemo, useState } from 'react'
import { decrypt, encrypt } from '../crypto'
import { supabase } from '../supabase'
import ArtworkGallery from './ArtworkGallery'
import ArtworkModal from './ArtworkModal'
import LinkForm, { providerFor } from './LinkForm'

export default function Vault({ userId, email, settings, keyRef, onLock, onSignOut, countdown }) {
  const [links, setLinks] = useState([])
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [sort, setSort] = useState('newest')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [checkStatus, setCheckStatus] = useState('')
  const [viewing, setViewing] = useState(null)

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('vault_links').select('id,payload,iv,created_at').order('created_at', { ascending: false })
    if (loadError) { setError(loadError.message); return }
    try {
      const rows = await Promise.all(data.map(async (row) => ({ ...await decrypt(row.payload, row.iv, keyRef.current), id: row.id, created_at: row.created_at })))
      setLinks(rows)
    } catch { onLock() }
  }, [keyRef, onLock])

  useEffect(() => { load() }, [load])

  async function saveLink(value) {
    const duplicate = links.find((item) => item.id !== editing?.id && normalizeUrl(item.url) === normalizeUrl(value.url))
    if (duplicate) return false
    const encrypted = await encrypt({ ...value, provider: providerFor(value.url) }, keyRef.current)
    if (editing) {
      const { error: saveError } = await supabase.from('vault_links').update(encrypted).eq('id', editing.id)
      if (saveError) throw saveError
    } else {
      const { error: saveError } = await supabase.from('vault_links').insert({ ...encrypted, user_id: userId })
      if (saveError) throw saveError
    }
    setEditing(null); setAdding(false); setError(''); await load(); notify(editing ? 'Link updated.' : 'Link saved.')
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.title || item.url}”? This cannot be undone.`)) return
    const { error: deleteError } = await supabase.from('vault_links').delete().eq('id', item.id)
    if (deleteError) setError(deleteError.message)
    else { setLinks((current) => current.filter((link) => link.id !== item.id)); notify('Link deleted.') }
  }

  async function copy(item) {
    try { await navigator.clipboard.writeText(item.url); notify('Link copied to clipboard.') }
    catch { setError('Clipboard access was blocked. You can still open the link and copy it from the address bar.') }
  }
  async function runHealthCheck() {
    setCheckStatus('Checking…')
    try {
      const sample = { purpose: 'local-crypto-check', at: 'roundtrip' }
      const encrypted = await encrypt(sample, keyRef.current)
      const roundTrip = await decrypt(encrypted.payload, encrypted.iv, keyRef.current)
      if (roundTrip?.purpose !== sample.purpose) throw new Error('Local encryption round-trip failed.')
      const { error: settingsError } = await supabase.from('vault_settings').select('user_id').maybeSingle()
      if (settingsError) throw settingsError
      const { data: assurance, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (mfaError) throw mfaError
      if (assurance?.currentLevel !== 'aal2') throw new Error('This session is not at MFA assurance level AAL2.')
      setCheckStatus('Ready: local encryption, Supabase access, and AAL2 are working.')
    } catch (err) { setCheckStatus(`Check failed: ${err.message}`) }
  }
  const tags = useMemo(() => [...new Set(links.flatMap((item) => item.tags || []))].sort(), [links])
  const filtered = useMemo(() => links.filter((item) => {
    const text = `${item.title} ${item.note} ${item.url} ${(item.tags || []).join(' ')}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (!tagFilter || item.tags?.includes(tagFilter))
  }).sort((a, b) => {
    if (sort === 'title') return (a.title || '').localeCompare(b.title || '')
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sort === 'provider') return (a.provider || '').localeCompare(b.provider || '') || (a.title || '').localeCompare(b.title || '')
    return new Date(b.created_at) - new Date(a.created_at)
  }), [links, query, tagFilter, sort])

  return <main className="vault"><header className="vault-header"><a className="brand" href="#top"><span className="brand-mark">⌑</span> Link Vault</a><div className="header-actions"><span className="countdown"><i /> Locks in {countdown}</span><button className="quiet settings-button" onClick={() => { setSettingsOpen(true); setCheckStatus('') }}>Settings</button><button className="lock-button" onClick={onLock}>Lock vault</button></div></header>
    <section className="hero"><div><div className="eyebrow">YOUR PRIVATE LIBRARY</div><h1>Everything worth keeping.</h1><p className="muted">Encrypted links. Stored privately. Ready when you need them.</p></div><button className="primary add-button" onClick={() => { setEditing(null); setAdding(true) }}>＋ Add a link</button></section>
    {(adding || editing) && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { setAdding(false); setEditing(null) } }}><LinkForm initial={editing} onSave={saveLink} onCancel={() => { setAdding(false); setEditing(null) }} /></div>}
    {error && <p className="error notice">{error}</p>}
    <section className="controls"><label className="searchbox"><span>⌕</span><input aria-label="Search links" placeholder="Search your vault" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label className="filterbox"><span>Tag</span><select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}><option value="">All tags</option>{tags.map((tag) => <option key={tag}>{tag}</option>)}</select></label><label className="filterbox"><span>Sort</span><select aria-label="Sort links" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Title A–Z</option><option value="provider">Provider</option></select></label><span className="result-count">{filtered.length} {filtered.length === 1 ? 'link' : 'links'}</span></section>
    {filtered.length ? <ArtworkGallery items={filtered} onOpen={setViewing} onEdit={(item) => { setAdding(false); setEditing(item) }} onDelete={remove} onCopy={copy} /> : <section className="empty-state"><div className="empty-mark">⌑</div><h2>{links.length ? 'Nothing matches your search.' : 'Your gallery is ready.'}</h2><p className="muted">{links.length ? 'Try another search or clear the tag filter.' : 'Save the first link you want to hang in your gallery.'}</p>{!links.length && <button className="secondary" onClick={() => setAdding(true)}>Add your first link</button>}</section>}
    <ArtworkModal item={viewing} onClose={() => setViewing(null)} />
    {settingsOpen && <SettingsPanel email={email} settings={settings} onClose={() => setSettingsOpen(false)} onSignOut={onSignOut} onRunCheck={runHealthCheck} checkStatus={checkStatus} />}
    <div className="toast" aria-live="polite" aria-atomic="true">{toast}</div>
    <footer className="vault-footer"><span>Encrypted in this browser before syncing.</span><span>Google continues to host your files.</span></footer></main>
}

function normalizeUrl(value) {
  try { const url = new URL(value.trim()); url.hash = ''; url.hostname = url.hostname.toLowerCase(); return url.href.replace(/\/$/, '') }
  catch { return value.trim().toLowerCase() }
}

function SettingsPanel({ email, settings, onClose, onSignOut, onRunCheck, checkStatus }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div className="form-heading"><div><div className="eyebrow">VAULT STATUS</div><h2 id="settings-title">Security & settings</h2></div><button className="icon-button" onClick={onClose} aria-label="Close settings">×</button></div>
    <dl className="status-list"><div><dt>Account</dt><dd>{email || 'Signed in'}</dd></div><div><dt>Authentication</dt><dd><span className="status-good">● AAL2 verified</span></dd></div><div><dt>Encryption</dt><dd>AES-256-GCM · PBKDF2-SHA-256 · 600,000 rounds</dd></div><div><dt>Auto-lock</dt><dd>5 minutes idle · immediate manual lock</dd></div><div><dt>Recovery</dt><dd>{settings?.wrapped_key ? 'Recovery key is configured. Keep your offline copy safe.' : 'Recovery key not configured.'}</dd></div></dl>
    <div className="health-check"><button className="secondary" onClick={onRunCheck}>Run connection & encryption check</button>{checkStatus && <p className={checkStatus.startsWith('Check failed') ? 'error' : 'check-result'} role="status">{checkStatus}</p>}</div>
    <div className="settings-actions"><button className="quiet" onClick={onSignOut}>Sign out</button><button className="primary" onClick={onClose}>Done</button></div>
  </section></div>
}
