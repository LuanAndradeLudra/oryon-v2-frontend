import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

type Ctx = {
  pageActions: ReactNode
  setPageActions: (node: ReactNode) => void
}

const TopBarActionsContext = createContext<Ctx>({
  pageActions: null,
  setPageActions: () => {},
})

export function TopBarActionsProvider({ children }: { children: ReactNode }) {
  const [pageActions, setPageActions] = useState<ReactNode>(null)
  return (
    <TopBarActionsContext.Provider value={{ pageActions, setPageActions }}>
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
