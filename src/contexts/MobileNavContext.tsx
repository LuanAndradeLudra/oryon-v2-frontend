import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface MobileNavContextValue {
  open: boolean
  setOpen: (value: boolean) => void
  toggle: () => void
  close: () => void
}

const MobileNavContext = createContext<MobileNavContextValue | undefined>(undefined)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  const close = useCallback(() => setOpen(false), [])
  return (
    <MobileNavContext.Provider value={{ open, setOpen, toggle, close }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav(): MobileNavContextValue {
  const ctx = useContext(MobileNavContext)
  if (!ctx) throw new Error('useMobileNav must be used within MobileNavProvider')
  return ctx
}
