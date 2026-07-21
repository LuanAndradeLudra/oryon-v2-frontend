import { createContext, useContext, type ElementType } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContextMenuItemDef {
  label: string
  icon?: ElementType
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
  children?: ContextMenuEntry[]
}
export interface ContextMenuSeparatorDef {
  separator: true
}
export type ContextMenuEntry = ContextMenuItemDef | ContextMenuSeparatorDef

export interface ContextMenuState {
  open: (x: number, y: number, items: ContextMenuEntry[]) => void
  close: () => void
}

// ── Context ───────────────────────────────────────────────────────────────────
// Este módulo é uma FOLHA de propósito: importa só o React, nada mais. O motivo
// é sutil e importante. `createContext()` PRECISA rodar exatamente uma vez na
// vida do app. Se ele morasse junto do Provider/componentes em ContextMenu.tsx,
// qualquer atualização de HMR que chegasse àquele arquivo (por ex. uma troca de
// ícone — ContextMenu.tsx importa lucide-react, aliasado para lib/icons.tsx, que
// não é elegível para Fast Refresh) reexecutaria createContext() e criaria um
// SEGUNDO objeto de contexto. O <Provider> já montado seguiria com o objeto
// antigo, enquanto uma página lazy recém-navegada leria o novo → useContext
// devolve null → "useContextMenuCtx must be used within <ContextMenuProvider>".
// Uma folha sem dependências de projeto nunca é reavaliada em edições alheias,
// então o objeto permanece estável e Provider/consumidor sempre batem.
export const ContextMenuCtx = createContext<ContextMenuState | null>(null)

export function useContextMenuCtx(): ContextMenuState {
  const c = useContext(ContextMenuCtx)
  if (!c) throw new Error('useContextMenuCtx must be used within <ContextMenuProvider>')
  return c
}
