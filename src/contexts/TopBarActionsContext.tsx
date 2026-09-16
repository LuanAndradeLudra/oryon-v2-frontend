import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'

type Ctx = {
  pageActions: ReactNode
  setPageActions: (node: ReactNode) => void
  /** Subtítulo dinâmico da página (spec shell.md TOPBAR-02 / 1b DASH-HEADER-01:
   *  "atualizado há 20s"). `null` = a TopBar usa o subtítulo fixo da rota. */
  pageSubtitle: string | null
  setPageSubtitle: (text: string | null) => void
}

const TopBarActionsContext = createContext<Ctx>({
  pageActions: null,
  setPageActions: () => {},
  pageSubtitle: null,
  setPageSubtitle: () => {},
})

export function TopBarActionsProvider({ children }: { children: ReactNode }) {
  const [pageActions, setPageActions] = useState<ReactNode>(null)
  const [pageSubtitle, setPageSubtitle] = useState<string | null>(null)
  const value = useMemo(
    () => ({ pageActions, setPageActions, pageSubtitle, setPageSubtitle }),
    [pageActions, pageSubtitle],
  )
  return (
    <TopBarActionsContext.Provider value={value}>
      {children}
    </TopBarActionsContext.Provider>
  )
}

export function useTopBarActions() {
  return useContext(TopBarActionsContext)
}

/**
 * Hook for pages to register their TopBar action buttons.
 * Uses useLayoutEffect to avoid a one-frame flash on navigation.
 * @param actions - ReactNode to render in the TopBar right slot
 * @param deps    - Dependency array; actions re-register when deps change
 */
export function useRegisterTopBarActions(actions: ReactNode, deps: unknown[]) {
  const { setPageActions } = useTopBarActions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    setPageActions(actions)
    return () => setPageActions(null)
  }, deps)
}

/**
 * Irmão do `useRegisterTopBarActions` para o subtítulo da página: a TopBar
 * mostra `subtitle` no lugar do texto fixo de `PAGE_SUBTITLES` enquanto a
 * página estiver montada. Passe `null` para voltar ao fixo.
 */
export function useRegisterTopBarSubtitle(subtitle: string | null, deps: unknown[]) {
  const { setPageSubtitle } = useTopBarActions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    setPageSubtitle(subtitle)
    return () => setPageSubtitle(null)
  }, deps)
}
