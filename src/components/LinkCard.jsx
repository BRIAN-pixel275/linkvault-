export default function LinkCard({ item, onEdit, onDelete, onCopy }) {
  return <article className="link-card"><div className="card-top"><span className="provider-chip">{item.provider}</span><span className="card-menu"><button className="icon-button" onClick={onEdit} aria-label="Edit link">✎</button><button className="icon-button danger" onClick={onDelete} aria-label="Delete link">×</button></span></div>
    <h3>{item.title || item.url}</h3>{item.note && <p className="note">{item.note}</p>}<div className="tag-row">{item.tags?.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
    <div className="card-bottom"><span className="domain">{domain(item.url)}</span><div><button className="text-button" onClick={onCopy}>Copy</button><a className="open-link" href={item.url} target="_blank" rel="noopener noreferrer">Open ↗</a></div></div>
  </article>
}

function domain(value) { try { return new URL(value).hostname } catch { return value } }
