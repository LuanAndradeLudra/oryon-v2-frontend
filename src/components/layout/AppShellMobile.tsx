import type { ReactNode } from 'react'
import { BottomTabBar } from './BottomTabBar'

/**
 * Mobile shell — layout vertical com conteudo crescendo + tab bar fixa no
 * rodape. Cada pagina renderiza seu proprio header (MobilePageHeader) no topo
 * em vez de depender de um TopBar global, pattern padrao em apps mobile de CRM.
 */
export function AppShellMobile({ children }: { children: ReactNode }) {
  return (
    // h-dvh (dynamic viewport height) em vez de h-screen — em mobile o address
    // bar do browser ocupa parte do 100vh, o que empurraria a BottomTabBar
    // para fora da area visivel. dvh acompanha o resize quando a barra
    // colapsa/expande.
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-black">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      <BottomTabBar />
    </div>
  )
}
