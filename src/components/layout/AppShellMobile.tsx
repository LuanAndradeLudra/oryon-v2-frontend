import type { ReactNode } from 'react'
import { BottomTabBar } from './BottomTabBar'

/**
 * Mobile shell — layout vertical com conteudo crescendo + tab bar fixa no
 * rodape. Cada pagina renderiza seu proprio header (MobilePageHeader) no topo
 * em vez de depender de um TopBar global, pattern padrao em apps mobile de CRM.
 */
export function AppShellMobile({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      <BottomTabBar />
    </div>
  )
}
