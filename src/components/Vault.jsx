import { useCallback, useEffect, useMemo, useState } from 'react'
import { decrypt, encrypt } from '../crypto'
import { supabase } from '../supabase'
import LinkCard from './LinkCard'
import LinkForm, { providerFor } from './LinkForm'

export default function Vault({ userId, keyRef, onLock, countdown }) {
  const [links, setLinks] = useState([])
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

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
    const encrypted = await encrypt({ ...value, provider: providerFor(value.url) }, keyRef.current)
    if (editing) {
      const { error: saveError } = await supabase.from('vault_links').update(encrypted).eq('id', editing.id)
      if (saveError) throw saveError
    } else {
      const { error: saveError } = await supabase.from('vault_links').insert({ ...encrypted, user_id: userId })
      if (saveError) throw saveError
    }
    setEditing(null); setAdding(false); setError(''); await load()
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.title || item.url}”? This cannot be undone.`)) return
    const { error: deleteError } = await supabase.from('vault_links').delete().eq('id', item.id)
    if (deleteError) setError(deleteError.message)
    else setLinks((current) => current.filter((link) => link.id !== item.id))
  }

  async function copy(item) { await navigator.clipboard.writeText(item.url) }
  const tags = useMemo(() => [...new Set(links.flatMap((item) => item.tags || []))].sort(), [links])
  const filtered = useMemo(() => links.filter((item) => {
    const text = `${item.title} ${item.note} ${item.url} ${(item.tags || []).join(' ')}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (!tagFilter || item.tags?.includes(tagFilter))
  }), [links, query, tagFilter])

  return <main className="vault"><header className="vault-header"><a className="brand" href="#top"><span className="brand-mark">⌑</span> Link Vault</a><div className="header-actions"><span className="countdown"><i /> Locks in {countdown}</span><button className="lock-button" onClick={onLock}>Lock vault</button></div></header>
    <section className="hero"><div><div className="eyebrow">YOUR PRIVATE LIBRARY</div><h1>Everything worth keeping.</h1><p className="muted">Encrypted links. Stored privately. Ready when you need them.</p></div><button className="primary add-button" onClick={() => { setEditing(null); setAdding(true) }}>＋ Add a link</button></section>
    {(adding || editing) && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { setAdding(false); setEditing(null) } }}><LinkForm initial={editing} onSave={saveLink} onCancel={() => { setAdding(false); setEditing(null) }} /></div>}
    {error && <p className="error notice">{error}</p>}
    <section className="controls"><label className="searchbox"><span>⌕</span><input aria-label="Search links" placeholder="Search your vault" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label className="filterbox"><span>Tag</span><select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}><option value="">All tags</option>{tags.map((tag) => <option key={tag}>{tag}</option>)}</select></label><span className="result-count">{filtered.length} {filtered.length === 1 ? 'link' : 'links'}</span></section>
    {filtered.length ? <section className="link-grid">{filtered.map((item) => <LinkCard key={item.id} item={item} onEdit={() => { setAdding(false); setEditing(item) }} onDelete={() => remove(item)} onCopy={() => copy(item)} />)}</section> : <section className="empty-state"><div className="empty-mark">⌑</div><h2>{links.length ? 'Nothing matches your search.' : 'Your vault is ready.'}</h2><p className="muted">{links.length ? 'Try another search or clear the tag filter.' : 'Save the first link you want to keep close.'}</p>{!links.length && <button className="secondary" onClick={() => setAdding(true)}>Add your first link</button>}</section>}
    <footer className="vault-footer"><span>Encrypted in this browser before syncing.</span><span>Google continues to host your files.</span></footer></main>
}
