import { useEffect, useState } from 'react'

export function providerFor(value) {
  try {
    const host = new URL(value).hostname.toLowerCase()
    if (host === 'photos.app.goo.gl' || host.endsWith('.photos.google.com') || host === 'photos.google.com') return 'Google Photos'
    if (host === 'drive.google.com' || host.endsWith('.drive.google.com') || host === 'docs.google.com') return 'Google Drive'
  } catch { /* invalid URL is handled by form validation */ }
  return 'Web link'
}

export default function LinkForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { url: '', title: '', note: '', tags: [] })
  const [tagText, setTagText] = useState((initial?.tags || []).join(', '))
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial || { url: '', title: '', note: '', tags: [] }); setTagText((initial?.tags || []).join(', ')) }, [initial])
  async function submit(event) {
    event.preventDefault(); setBusy(true)
    const tags = [...new Set(tagText.split(',').map((tag) => tag.trim()).filter(Boolean))]
    try { await onSave({ ...form, url: form.url.trim(), title: form.title.trim() || form.url.trim(), tags }) }
    finally { setBusy(false) }
  }
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return <form className="form-card stack" onSubmit={submit}><div className="form-heading"><div><div className="eyebrow">{initial ? 'EDIT LINK' : 'NEW LINK'}</div><h2>{initial ? 'Update details' : 'Save a link'}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close">×</button></div>
    <label>Link URL<input type="url" placeholder="https://…" value={form.url} onChange={update('url')} required /></label>
    {form.url && <span className="provider-chip">{providerFor(form.url)}</span>}
    <label>Title<input value={form.title} onChange={update('title')} placeholder="A clear name" /></label>
    <label>Note<textarea rows="3" value={form.note} onChange={update('note')} placeholder="Optional details" /></label>
    <label>Tags<input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="work, reference, family" /><small>Separate tags with commas.</small></label>
    <div className="form-actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Encrypting…' : 'Save link'}</button></div></form>
}
