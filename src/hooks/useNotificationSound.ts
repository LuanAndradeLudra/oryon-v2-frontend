import { useState, useCallback, useRef } from 'react'

/** localStorage key for the user's sound preference. We check for the
 *  explicit string `'false'` so the default (missing key) is ON. */
const STORAGE_KEY = 'oryon:notification-sound'

/**
 * Phase 17: plays a short WAV when new notifications arrive. Preference
 * is persisted in localStorage so it survives refresh. A single <Audio>
 * element is reused across plays to avoid leaking elements on bursts.
 */
export function useNotificationSound() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(STORAGE_KEY) !== 'false'
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Accepts an optional forced value so it composes cleanly with
  // <Switch onChange={toggle} /> (which passes a boolean) as well as a
  // parameterless "flip" call site.
  const toggle = useCallback((value?: boolean) => {
    setEnabled((prev) => {
      const next = value ?? !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch { /* quota or private mode */ }
      return next
    })
  }, [])

  const play = useCallback(() => {
    if (!enabled) return
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/notification.wav')
      audioRef.current.volume = 0.5
    }
    // Reset so rapid bursts still audibly re-trigger instead of silently
    // waiting for the previous play to finish.
    audioRef.current.currentTime = 0
    // Browsers block autoplay before the first user gesture — the promise
    // rejection is expected and harmless on the very first notification
    // after a cold page load. Swallow to keep the console clean.
    audioRef.current.play().catch(() => { /* autoplay blocked */ })
  }, [enabled])

  return { enabled, toggle, play }
}
