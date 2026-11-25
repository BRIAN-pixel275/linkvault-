import { useMemo, useState } from 'react'
import LinkCard from './LinkCard'
import LinkForm, { providerFor } from './LinkForm'

const examples = [
  { id: 'demo-1', url: 'https://photos.google.com/share/demo-album', title: 'Weekend in the hills', note: 'A shared album from the hiking trip.', tags: ['personal', 'photos'], provider: 'Google Photos', created_at: '2026-11-24T10:00:00Z' },
  { id: 'demo-2', url: 'https://drive.google.com/file/d/demo-document/view', title: 'Project brief', note: 'Current draft from the team.', tags: ['work', 'reference'], provider: 'Google Drive', created_at: '2026-11-22T10:00:00Z' },
  { id: 'demo-3', url: 'https://photos.app.goo.gl/demo-family', title: 'Family celebration', note: 'Shared photos to revisit.', tags: ['personal', 'family'], provider: 'Google Photos', created_at: '2026-11-20T10:00:00Z' },
]

export default function DemoPreview() {
  const [links, setLinks] = useState(examples)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState('newest')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [settings, setSettings] = useState(false)
  const [locked, setLocked] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [check, setCheck] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [newPassphrase, setNewPassphrase] = useState('')
  const [resetDone, setResetDone] = useState(false)

  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 2400) }
  async function save(value) {
    const duplicate = links.find((item) => item.id !== editing?.id && normalize(item.url) === normalize(value.url))
    if (duplicate) return false
    if (editing) setLinks((current) => current.map((item) => item.id === editing.id ? { ...item, ...value, provider: providerFor(value.url) } : item))
    else setLinks((current) => [{ ...value, provider: providerFor(value.url), id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...current])
    setEditing(null); setAdding(false); notify('Demo link saved. No data was sent or stored.'); return true
  }
  async function remove(item) {
    if (!window.confirm(`Remove demo link “${item.title}”?`)) return
    setLinks((current) => current.filter((link) => link.id !== item.id)); notify('Demo link removed.')
  }

  const tags = [...new Set(links.flatMap((item) => item.tags || []))].sort()
  const filtered = useMemo(() => links.filter((item) => `${item.title} ${item.note} ${item.url} ${(item.tags || []).join(' ')}`.toLowerCase().includes(query.toLowerCase()) && (!tag || item.tags?.includes(tag))).sort((a, b) => {
    if (sort === 'title') return (a.title || '').localeCompare(b.title || '')
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sort === 'provider') return (a.provider || '').localeCompare(b.provider || '')
    return new Date(b.created_at) - new Date(a.created_at)
  }), [links, query, tag, sort])

  if (locked) return <main className="auth-shell"><section className="auth-panel"><div className="eyebrow">PREVIEW LOCKED</div><h1>Try the unlock check.</h1><p className="muted">This demo simulates wrong-passphrase rejection. Use the sample-only passphrase <code>vault-demo</code>.</p><form className="stack" onSubmit={(e) => { e.preventDefault(); if (passphrase === 'vault-demo') { setLocked(false); setPassphrase(''); setError('') } else setError('That passphrase did not unlock the preview vault.') }}><label>Demo passphrase<input type="password" autoComplete="off" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required /></label>{error && <p className="error">{error}</p>}<button className="primary">Unlock preview</button><button className="quiet" type="button" onClick={() => { setLocked(false); setPassphrase(''); setError('') }}>Skip demo lock</button></form></section></main>

  return <main className="vault"><div className="preview-banner"><span><strong>LOCAL PREVIEW</strong> Sample links stay in memory only. Supabase, login, and encryption are simulated here.</span><a href="/" className="text-button">Exit preview</a></div>
    <header className="vault-header"><a className="brand" href="#top"><span className="brand-mark">⌑</span> Link Vault</a><div className="header-actions"><span className="countdown"><i /> Locks in 5:00</span><button className="quiet settings-button" onClick={() => { setSettings(true); setCheck('') }}>Settings</button><button className="lock-button" onClick={() => setLocked(true)}>Lock demo</button></div></header>
    <section className="hero"><div><div className="eyebrow">YOUR PRIVATE LIBRARY · DEMO</div><h1>Everything worth keeping.</h1><p className="muted">Try sorting, duplicate warnings, settings, and recovery here.</p></div><button className="primary add-button" onClick={() => { setEditing(null); setAdding(true) }}>＋ Add a link</button></section>
    {(adding || editing) && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { setAdding(false); setEditing(null) } }}><LinkForm initial={editing} onSave={save} onCancel={() => { setAdding(false); setEditing(null) }} /></div>}
    <section className="controls"><label className="searchbox"><span>⌕</span><input aria-label="Search links" placeholder="Search your vault" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label className="filterbox"><span>Tag</span><select value={tag} onChange={(e) => setTag(e.target.value)}><option value="">All tags</option>{tags.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filterbox"><span>Sort</span><select aria-label="Sort links" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Title A–Z</option><option value="provider">Provider</option></select></label><span className="result-count">{filtered.length} links</span></section>
    {filtered.length ? <section className="link-grid">{filtered.map((item) => <LinkCard key={item.id} item={item} onEdit={() => { setAdding(false); setEditing(item) }} onDelete={() => remove(item)} onCopy={() => notify('Demo link copied (simulated).')} />)}</section> : <section className="empty-state"><div className="empty-mark">⌑</div><h2>No links match.</h2><p className="muted">Clear your search or tag filter.</p></section>}
    {settings && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSettings(false) }}><section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="demo-settings-title"><div className="form-heading"><div><div className="eyebrow">VAULT STATUS</div><h2 id="demo-settings-title">Security & settings</h2></div><button className="icon-button" aria-label="Close settings" onClick={() => setSettings(false)}>×</button></div><dl className="status-list"><div><dt>Authentication</dt><dd><span className="status-good">● AAL2 verified (simulated)</span></dd></div><div><dt>Encryption</dt><dd>AES-256-GCM · PBKDF2-SHA-256 · 600,000 rounds</dd></div><div><dt>Auto-lock</dt><dd>5 minutes idle</dd></div><div><dt>Recovery</dt><dd>Offline key is configured (simulated)</dd></div></dl><div className="health-check"><button className="secondary" onClick={() => setCheck('Preview check passed. The real app checks browser encryption, Supabase access, and AAL2.')}>Run connection & encryption check</button>{check && <p className="check-result" role="status">{check}</p>}</div><div className="settings-actions"><button className="quiet" onClick={() => setRecovery(true)}>Preview passphrase recovery</button><button className="primary" onClick={() => setSettings(false)}>Done</button></div></section></div>}
    {recovery && <div className="modal-backdrop"><section className="auth-panel"><div className="eyebrow">RECOVERY · PREVIEW ONLY</div><h1>{resetDone ? 'Passphrase reset.' : 'Set a new passphrase.'}</h1>{resetDone ? <><p className="warning">The real app re-encrypts all links and gives you a replacement recovery key.</p><code className="recovery-key">DEMO-ONLY-1234-5678</code><button className="primary full-width" onClick={() => { setRecovery(false); setResetDone(false); setNewPassphrase('') }}>I saved the demo key</button></> : <form className="stack" onSubmit={(e) => { e.preventDefault(); if (newPassphrase.length < 14) setError('Use at least 14 characters.'); else { setResetDone(true); setError('') } }}><p className="muted">Recovery rotates the encryption key and re-encrypts records before replacing the old recovery key.</p><label>New master passphrase<input type="password" autoComplete="new-password" value={newPassphrase} onChange={(e) => setNewPassphrase(e.target.value)} required /></label>{error && <p className="error">{error}</p>}<button className="primary">Preview reset flow</button><button className="quiet" type="button" onClick={() => { setRecovery(false); setError('') }}>Cancel</button></form>}</section></div>}
    <div className="toast" aria-live="polite">{toast}</div><footer className="vault-footer"><span>Encrypted in this browser before syncing.</span><span>Google continues to host your files.</span></footer></main>
}

function normalize(value) { try { const url = new URL(value.trim()); url.hash = ''; return url.href.replace(/\/$/, '') } catch { return value.trim().toLowerCase() } }
