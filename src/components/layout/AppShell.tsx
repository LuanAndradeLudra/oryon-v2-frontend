import type { ReactNode } from 'react'
import { NavSidebar } from './NavSidebar'
import { TopBar } from './TopBar'
import { AppShellMobile } from './AppShellMobile'
import { TopBarActionsProvider } from '@/contexts/TopBarActionsContext'
import { WorkspaceNumberProvider } from '@/contexts/WorkspaceNumberContext'
import { useIsMobile } from '@/hooks/useIsMobile'

function ShellLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <AppShellMobile>{children}</AppShellMobile>
  }

  // SCRUM-1100 (Leva 2): o "canvas flutuante" saiu — sidebar e conteúdo
  // formam uma superfície única, sem margem/borda/raio ao redor do conteúdo.
  // `workspace-shell` (fundo profundo, sempre escuro) continua no wrapper
  // raiz só pela sidebar: como o `NavSidebar`/`.nav-sidebar` não tem fundo
  // próprio, é este gradiente que aparece atrás dela nos dois temas — não
  // mais como moldura em volta de um cartão de conteúdo (`--color-shell`
  // deixou de servir a essa função).
  return (
    <div className="workspace-shell flex h-screen w-screen overflow-hidden">
      {/* Navegação por teclado: pula os 15+ itens da sidebar direto ao conteúdo */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-brand-500 focus:text-surface-950 focus:text-sm focus:font-semibold"
      >
        Ir para o conteúdo principal
      </a>
      <NavSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-surface-950">
        <TopBar />
        {/* div (não <main>) — as páginas declaram seu próprio <main> interno */}
        <div id="main-content" className="flex flex-1 min-w-0 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceNumberProvider>
      <TopBarActionsProvider>
        <ShellLayout>{children}</ShellLayout>
      </TopBarActionsProvider>
    </WorkspaceNumberProvider>
  )
}
