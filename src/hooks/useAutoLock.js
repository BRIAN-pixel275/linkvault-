import { useEffect, useRef, useState } from 'react'

const TIMEOUT_MS = 5 * 60 * 1000

export function useAutoLock(onLock, enabled) {
  const callback = useRef(onLock)
  const lastActivity = useRef(Date.now())
  const hiddenAt = useRef(null)
  const [remaining, setRemaining] = useState(TIMEOUT_MS)
  callback.current = onLock

  useEffect(() => {
    if (!enabled) return undefined
    // Start a fresh idle window when the user unlocks the vault. Time spent
    // on the login or unlock screen should not lock it immediately afterward.
    lastActivity.current = Date.now()
    hiddenAt.current = document.hidden ? Date.now() : null
    setRemaining(TIMEOUT_MS)
    let didLock = false
    const activity = () => { lastActivity.current = Date.now() }
    const events = ['pointerdown', 'keydown', 'touchstart', 'mousemove']
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }))
    const tick = window.setInterval(() => {
      const left = Math.max(0, TIMEOUT_MS - (Date.now() - lastActivity.current))
      setRemaining(left)
      if (left === 0 && !didLock) { didLock = true; callback.current() }
    }, 1000)
    const visibility = () => {
      if (document.hidden) hiddenAt.current = Date.now()
      else if (hiddenAt.current !== null) {
        if (Date.now() - hiddenAt.current >= TIMEOUT_MS) callback.current()
        hiddenAt.current = null
      }
    }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      events.forEach((event) => window.removeEventListener(event, activity))
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [enabled])

  const minutes = Math.floor(remaining / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
