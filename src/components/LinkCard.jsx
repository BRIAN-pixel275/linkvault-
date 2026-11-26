function domain(value) { try { return new URL(value).hostname } catch { return value } }

export default function LinkCard({ item, index = 0, onOpen, onEdit, onDelete, onCopy }) {
  const artTone = `art-tone-${index % 4}`
  return <article className="link-card painting-frame">
    <div className="painting-mount">
      <button className={`painting-art ${artTone}`} onClick={onOpen} aria-label={`View ${item.title || item.provider} artwork`}>
        <span className="painting-halo" aria-hidden="true" />
        <span className="painting-motif" aria-hidden="true"><i /><i /><i /></span>
        <span className="painting-copy"><span className="painting-provider">{item.provider || 'SAVED LINK'}</span><span className="painting-title">{item.title || item.url}</span>{item.note && <span className="painting-subtitle">{item.note}</span>}</span>
        <span className="painting-view-label">View artwork <span aria-hidden="true">↗</span></span>
      </button>
    </div>
    <div className="painting-meta"><span className="domain">{domain(item.url)}</span><span className="card-menu"><button className="icon-button" onClick={onCopy} aria-label="Copy link">⧉</button><button className="icon-button" onClick={onEdit} aria-label="Edit link">✎</button><button className="icon-button danger" onClick={onDelete} aria-label="Delete link">×</button></span></div>
  </article>
}
