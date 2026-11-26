import LinkCard from './LinkCard'

export default function ArtworkGallery({ items, onOpen, onEdit, onDelete, onCopy }) {
  return <section className="gallery-room" aria-label="Link Vault gallery">
    <div className="hall-architecture" aria-hidden="true">
      <div className="hall-backwall" />
      <div className="hall-leftwall" />
      <div className="hall-rightwall" />
      <div className="hall-ceiling" />
      <div className="hall-floor" />
      <div className="hall-light" />
      <div className="hall-visitor"><i className="visitor-head" /><i className="visitor-body" /><i className="visitor-arm" /><i className="visitor-leg leg-left" /><i className="visitor-leg leg-right" /></div>
    </div>
    <div className="gallery-intro"><span className="eyebrow">THE LINK GALLERY</span><span>Choose a frame to view its details</span></div>
    <div className="gallery-wall">
      {items.map((item, index) => <LinkCard key={item.id} item={item} index={index} onOpen={() => onOpen(item)} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} onCopy={() => onCopy(item)} />)}
    </div>
  </section>
}
