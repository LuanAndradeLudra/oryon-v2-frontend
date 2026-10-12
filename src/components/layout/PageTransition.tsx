import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

/** Seção da rota: 1º segmento da URL. Exceção: o perfil do contato
 *  (/contacts/:id) ganha chave própria para que o drawer aberto na lista faça
 *  crossfade suave ao "Expandir" para a página — e vice-versa no voltar. */
export function sectionKeyOf(pathname: string): string {
  const segments = pathname.split('/')
  return segments[1] === 'contacts' && segments[2] ? '/contacts/:id' : '/' + segments[1]
}

/**
 * Transição do CONTEÚDO da página — a sidebar e a TopBar (AppShell) ficam
 * montadas ao trocar de seção, só a página nova é renderizada.
 *
 * Antes a chave por seção ficava num wrapper em volta de TODAS as rotas
 * (inclusive do AppShell): cada clique na sidebar desmontava a sidebar + TopBar
 * + página e fazia crossfade da tela inteira, e o Suspense de tela cheia
 * cobria o shell enquanto o chunk lazy carregava — daí "a tela recarrega e
 * fica sem conteúdo".
 *
 * `mode="wait"` (a página antiga sai ANTES da nova montar) é obrigatório, não
 * estético: `useRegisterTopBarActions` limpa as ações da TopBar no cleanup sem
 * checar de quem são — com as duas páginas montadas ao mesmo tempo, o cleanup
 * da antiga apagaria as ações que a nova acabou de registrar.
 *
 * Vive em arquivo próprio para o documento de demonstração da landing
 * (`src/demo/`) montar as páginas exatamente como o app monta.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  // O wrapper reproduz a geometria do contêiner que o AppShell dá à página:
  // linha no desktop (#main-content é `flex`), coluna no mobile (AppShellMobile).
  // Sem espelhar a direção, uma página mobile sem `w-full`/`flex-1` encolheria
  // para a largura do conteúdo.
  const isMobile = useIsMobile()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={sectionKeyOf(pathname)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className={cn('flex flex-1 min-w-0 min-h-0 overflow-hidden', isMobile && 'flex-col')}
      >
        {/* Chunk lazy da página: o spinner fica SÓ na área de conteúdo — o
            Suspense de tela cheia (abaixo) cobria o shell inteiro. */}
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center bg-surface-950">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          {children}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}
