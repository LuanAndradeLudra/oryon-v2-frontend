import { useMemo, useState, type ReactNode } from 'react'
import { ModoFocoContext } from './modoFoco'

/** ORY-60 — o provedor do "modo foco" (o contexto e os hooks ficam em `modoFoco.ts`). */
export function ModoFocoProvider({ children }: { children: ReactNode }) {
  const [ativo, setAtivo] = useState(false)
  const value = useMemo(() => ({ ativo, setAtivo }), [ativo])
  return <ModoFocoContext.Provider value={value}>{children}</ModoFocoContext.Provider>
}
