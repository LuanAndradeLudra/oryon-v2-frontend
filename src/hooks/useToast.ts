import { useEffect, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

// ─── Global singleton store ──────────────────────────────────────────────────
// Antes cada chamada de useToast() criava state local e seu proprio
// ToastContainer. Com 2+ containers (ex.: ContactsPage + ContactDetailPanel)
// cada toast era renderizado por apenas UM dos containers — e se aquele
// container estivesse dentro de um motion.div com transform, o portal sumia
// do viewport visivel. Singleton desacopla quem dispara de quem renderiza.

let _toasts: Toast[] = []
const _listeners = new Set<(toasts: Toast[]) => void>()

function emit(): void {
  for (const l of _listeners) l(_toasts)
}

// crypto.randomUUID() so existe em secure context (HTTPS ou localhost). Em HTTP
// via LAN (dev mobile) o metodo nao existe e lanca TypeError. Fallback simples
// baseado em timestamp + counter — IDs unicos para o lifecycle de um toast.
let _toastCounter = 0
function genToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  _toastCounter++
  return `toast-${Date.now()}-${_toastCounter}`
}

export function showToast(message: string, type: ToastType = 'success'): string {
  const id = genToastId()
  _toasts = [..._toasts, { id, type, message }]
  emit()
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id)
    emit()
  }, 3500)
  return id
}

export function dismissToast(id: string): void {
  _toasts = _toasts.filter((t) => t.id !== id)
  emit()
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(_toasts)

  useEffect(() => {
    const listener = (next: Toast[]) => setToasts(next)
    _listeners.add(listener)
    // Sync with store on mount in case toasts were added before mount
    setToasts(_toasts)
    return () => {
      _listeners.delete(listener)
    }
  }, [])

  const toast = useCallback(showToast, [])
  const dismiss = useCallback(dismissToast, [])

  return { toasts, toast, dismiss }
}
