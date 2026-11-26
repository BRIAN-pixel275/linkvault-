function directImage(url = '') {
  try {
    const host = new URL(url).hostname.toLowerCase()
    const googleHost = host === 'googleusercontent.com' || host.endsWith('.googleusercontent.com')
    return googleHost
  } catch { return false }
}

function drivePreview(url = '') {
  if (!/drive\.google\.com$/i.test(new URL(url).hostname)) return ''
  const match = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/)
  return match ? `https://drive.google.com/file/d/${encodeURIComponent(match[1])}/preview` : ''
}

export default function ArtworkModal({ item, onClose }) {
  if (!item) return null
  let isImage = false
  let preview = ''
  try {
    isImage = directImage(item.url)
    preview = drivePreview(item.url)
  } catch { /* malformed or unsupported URL */ }
  return <div className="modal-backdrop artwork-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="artwork-panel" role="dialog" aria-modal="true" aria-labelledby="artwork-title">
      <div className="artwork-viewer">
        <div className="viewer-canvas">
          {isImage ? <img src={item.url} alt={item.title || 'Linked image'} referrerPolicy="no-referrer" /> : preview ? <iframe src={preview} title={`Preview of ${item.title || 'Google Drive item'}`} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /> : <div className="viewer-placeholder"><span className="viewer-orb" /><span className="viewer-caption">{item.title || item.provider}</span><span className="viewer-note">{item.note || 'Open the original to view the hosted item.'}</span></div>}
        </div>
        <span className="viewer-frame-edge" aria-hidden="true" />
      </div>
      <div className="artwork-details">
        <div className="form-heading"><div><div className="eyebrow">{item.provider || 'SAVED LINK'}</div><h2 id="artwork-title">{item.title || item.url}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close artwork">×</button></div>
        {item.note && <p className="artwork-note">{item.note}</p>}
        {!!item.tags?.length && <div className="tag-row artwork-tags">{item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>}
        <div className="artwork-actions"><a className="primary open-original" href={item.url} target="_blank" rel="noopener noreferrer">Open original ↗</a><span className="artwork-host">Hosted by Google · Link only</span></div>
      </div>
    </section>
  </div>
}
