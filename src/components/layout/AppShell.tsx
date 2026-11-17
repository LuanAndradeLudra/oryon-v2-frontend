import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { NavSidebar } from './NavSidebar'
import { TopBar } from './TopBar'
import { AppShellMobile } from './AppShellMobile'
import { TopBarActionsProvider } from '@/contexts/TopBarActionsContext'
import { ModoFocoProvider } from '@/contexts/ModoFocoContext'
import { useModoFocoAtivo } from '@/contexts/modoFoco'
import { WorkspaceNumberProvider } from '@/contexts/WorkspaceNumberContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { OuvinteDoTempoReal } from './OuvinteDoTempoReal'
import { registrarTela } from '@/lib/atividadeRecente'
import { areaDaRota } from '@/components/support/supportModel'

/** Saída e volta do menu e da barra no modo foco: rápida no começo, assenta devagar. */
const TRANSICAO_DO_FOCO = { duration: 0.34, ease: [0.32, 0.72, 0, 1] } as const

function ShellLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const modoFoco = useModoFocoAtivo()
  const reduzirMovimento = useReducedMotion()
  // Enquanto o menu e a barra encolhem ou crescem, o que passa da caixa fica
  // cortado; parados e visíveis, nada é cortado (menus e dicas podem vazar).
  const [animandoFoco, setAnimandoFoco] = useState(false)

  if (isMobile) {
    return <AppShellMobile>{children}</AppShellMobile>
  }

  // ORY-60: modo foco (editor de Jornadas). O menu lateral e a barra do topo
  // deslizam para fora e voltam ao sair, na MESMA árvore: a página não remonta
  // (trocar de árvore montava o editor duas vezes e fazia tudo sumir de uma vez).
  const transicao = reduzirMovimento ? { duration: 0 } : TRANSICAO_DO_FOCO
  const recolhido = modoFoco || animandoFoco
  const aoComecar = () => setAnimandoFoco(true)
  const aoTerminar = () => setAnimandoFoco(false)

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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-[10px] focus:bg-brand-500 focus:text-surface-950 focus:text-sm focus:font-semibold"
      >
        Ir para o conteúdo principal
      </a>
      <motion.div
        className="flex shrink-0 [&>*]:shrink-0"
        initial={false}
        animate={modoFoco ? { width: 0, opacity: 0 } : { width: 'auto', opacity: 1 }}
        transition={transicao}
        onAnimationStart={aoComecar}
        onAnimationComplete={aoTerminar}
        style={{ overflow: recolhido ? 'hidden' : undefined }}
        inert={modoFoco || undefined}
      >
        <NavSidebar />
      </motion.div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-surface-950">
        <motion.div
          className="shrink-0"
          initial={false}
          animate={modoFoco ? { height: 0, opacity: 0 } : { height: 'auto', opacity: 1 }}
          transition={transicao}
          style={{ overflow: recolhido ? 'hidden' : undefined }}
          inert={modoFoco || undefined}
        >
          <TopBar />
        </motion.div>
        {/* div (não <main>) — as páginas declaram seu próprio <main> interno */}
        <div id="main-content" className="flex flex-1 min-w-0 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  // SCRUM-1390: a trilha de telas (só em memória) que um chamado de suporte pode levar junto.
  const { pathname } = useLocation()
  useEffect(() => { registrarTela(pathname, areaDaRota(pathname) ?? 'tela não identificada') }, [pathname])
  return (
    <WorkspaceNumberProvider>
      <TopBarActionsProvider>
        <ModoFocoProvider>
          <OuvinteDoTempoReal />
          <ShellLayout>{children}</ShellLayout>
        </ModoFocoProvider>
      </TopBarActionsProvider>
    </WorkspaceNumberProvider>
  )
}
