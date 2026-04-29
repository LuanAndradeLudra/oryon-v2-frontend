// ─── Advanced Mode (per-user UI toggle) ────────────────────────────────────
// Local-only preference that reveals power-user surfaces normal customers
// don't need to see (e.g. the legacy "Ferramentas" tab on AgentDetail). Lives
// in localStorage so it persists across reloads but never leaves the device
// — no backend column, no migration. Customers can flip it themselves from
// account settings later.

import { useEffect, useState, useCallback } from 'react'

const KEY = 'oryon:advancedMode'

function readInitial(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

/** Read the current value without subscribing. Useful in non-React paths. */
export function getAdvancedMode(): boolean {
  return readInitial()
}

export function useAdvancedMode(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(() => readInitial())

  // Sync across tabs / windows so toggling in one place reflects everywhere.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEnabledState(e.newValue === 'true')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    try { localStorage.setItem(KEY, next ? 'true' : 'false') } catch { /* ignore */ }
    setEnabledState(next)
  }, [])

  return [enabled, setEnabled]
}
