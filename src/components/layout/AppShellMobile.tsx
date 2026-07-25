import type { ReactNode } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'

/**
 * Mobile shell â€” layout vertical com conteudo crescendo + tab bar fixa no
 * rodape. Cada pagina renderiza seu proprio header (MobilePageHeader) no topo
 * em vez de depender de um TopBar global, pattern padrao em apps mobile de CRM.
 *
 * Quando uma conversa esta aberta em fullscreen mobile (/conversations?id=...),
 * a BottomTabBar e' escondida para dar mais espaco vertical ao chat. O usuario
 * volta para a lista pelo botao "voltar" do ChatHeader, que limpa o ?id=.
 */
export function AppShellMobile({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isChatFullscreen =
    location.pathname === '/conversations' && searchParams.has('id')

  return (
    // h-dvh (dynamic viewport height) em vez de h-screen â€” em mobile o address
    // bar do browser ocupa parte do 100vh, o que empurraria a BottomTabBar
    // para fora da area visivel. dvh acompanha o resize quando a barra
    // colapsa/expande.
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-surface-950">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      {!isChatFullscreen && <BottomTabBar />}
    </div>
  )
}
