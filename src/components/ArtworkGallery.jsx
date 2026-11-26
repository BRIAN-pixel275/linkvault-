import { useRef, useState } from 'react'
import LinkCard from './LinkCard'

const walls = [
  { id: 'back', label: 'North gallery wall' },
  { id: 'left', label: 'West gallery wall' },
  { id: 'right', label: 'East gallery wall' },
  { id: 'front', label: 'Entrance gallery wall' },
]

export default function ArtworkGallery({ items, onOpen, onEdit, onDelete, onCopy }) {
  const [yaw, setYaw] = useState(0)
  const [zoom, setZoom] = useState(2)
  const drag = useRef(null)
  const suppressClickUntil = useRef(0)

  function turn(steps) {
    setYaw((current) => (current + steps + 72) % 72)
  }

  function zoomBy(steps) {
    setZoom((current) => Math.max(0, Math.min(6, current + steps)))
  }

  function onPointerDown(event) {
    if (event.button !== 0) return
    drag.current = { x: event.clientX, originX: event.clientX, carry: 0, moved: false }
  }

  function onPointerMove(event) {
    if (!drag.current) return
    const delta = (drag.current.x - event.clientX) / 7 + drag.current.carry
    const steps = Math.trunc(delta)
    drag.current = { ...drag.current, x: event.clientX, carry: delta - steps, moved: drag.current.moved || Math.abs(event.clientX - drag.current.originX) > 8 }
    if (steps) turn(steps)
  }

  function endDrag() {
    if (drag.current?.moved) suppressClickUntil.current = Date.now() + 280
    drag.current = null
  }

  function onClickCapture(event) {
    if (Date.now() < suppressClickUntil.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClickUntil.current = 0
    }
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); turn(3) }
    if (event.key === 'ArrowRight') { event.preventDefault(); turn(-3) }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomBy(1) }
    if (event.key === '-') { event.preventDefault(); zoomBy(-1) }
  }

  const itemsByWall = walls.map(() => [])
  items.forEach((item, index) => itemsByWall[index % walls.length].push({ item, index }))

  return <section className={`museum-viewport museum-yaw-${yaw} museum-zoom-${zoom}`} aria-label="Interactive Nairobi heritage museum gallery" tabIndex={0} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={endDrag} onClickCapture={onClickCapture} onKeyDown={onKeyDown}>
    <div className="museum-heading"><div><span className="eyebrow">LINK VAULT · MUSEUM VIEW</span><span className="museum-subtitle">A quiet gallery for the things you keep.</span></div><div className="museum-actions"><button className="museum-turn" onClick={() => turn(3)} aria-label="Turn left 15 degrees">←</button><span className="museum-turn-label">360°</span><button className="museum-turn" onClick={() => turn(-3)} aria-label="Turn right 15 degrees">→</button><span className="museum-control-divider" /><button className="museum-turn" onClick={() => zoomBy(-1)} aria-label="Zoom out" disabled={zoom === 0}>−</button><span className="museum-turn-label museum-zoom-label">{Math.round((0.8 + zoom * 0.1) * 100)}%</span><button className="museum-turn" onClick={() => zoomBy(1)} aria-label="Zoom in" disabled={zoom === 6}>＋</button></div></div>
    <div className="museum-world" aria-label="Museum room">
      <div className="museum-ceiling" aria-hidden="true" />
      <div className="museum-floor" aria-hidden="true" />
      {walls.map((wall, wallIndex) => <div key={wall.id} className={`museum-wall-face museum-face-${wall.id}`} aria-label={wall.label}>
        <div className="museum-wall-grid">
          {itemsByWall[wallIndex].map(({ item, index }) => <LinkCard key={item.id} item={item} index={index} onOpen={() => onOpen(item)} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} onCopy={() => onCopy(item)} />)}
        </div>
      </div>)}
    </div>
    <div className="museum-hint"><span className="drag-indicator" aria-hidden="true">↔</span> Drag to look · ← → rotate · +/− zoom</div>
  </section>
}
