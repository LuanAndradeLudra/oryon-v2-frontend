import { motion } from 'framer-motion'
import { Home, MessageSquare, Users, KanbanSquare, Send, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A CASCA DO APP dentro da janela âncora.
 *
 * Por que existe: o diagnóstico desta rodada foi que as janelas do Hero
 * pareciam "fragmentos com três pontos e um rótulo", não um software. A
 * referência mostra a casca — menu lateral com o item ativo e migalhas no
 * cabeçalho —, e é isso que diz "sistema completo" antes de qualquer conteúdo.
 *
 * Não é o `NavSidebar` de produção: ele monta `conversationsApi`,
 * `useSetupChecklist`, `useAuth` e `useInternalChat`, ou seja, busca na
 * montagem e exige sessão. O que se reaproveita aqui é a LINGUAGEM do menu —
 * os mesmos ícones, os mesmos rótulos e a mesma ordem da barra real — numa
 * casca inerte. A lista de módulos foi copiada de `NavSidebar` para não
 * divergir: Home, Conversas, Leads, Funis, Disparos, Agentes IA.
 *
 * O item ativo desliza entre os módulos com `layoutId`: é o único movimento do
 * menu, e é o que amarra a troca de cena ao produto.
 */

export type HeroModule = 'home' | 'conversas' | 'leads' | 'funis' | 'disparos' | 'agentes'

const MODULOS: { id: HeroModule; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'conversas', label: 'Conversas', icon: MessageSquare },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'funis', label: 'Funis', icon: KanbanSquare },
  { id: 'disparos', label: 'Disparos', icon: Send },
  { id: 'agentes', label: 'Agentes IA', icon: Bot },
]

/** Migalha do cabeçalho, por módulo — o que a `TopBar` real mostraria. */
const TITULO: Record<HeroModule, { titulo: string; sub?: string }> = {
  home: { titulo: 'Home' },
  conversas: { titulo: 'Conversas', sub: 'Todas · Comercial' },
  leads: { titulo: 'Leads' },
  funis: { titulo: 'Funis', sub: 'Vendas' },
  disparos: { titulo: 'Disparos', sub: 'Renovação Pro' },
  agentes: { titulo: 'Agentes IA', sub: 'Agente Vendas' },
}

export function HeroShell({
  modulo,
  children,
  compacto = false,
}: {
  modulo: HeroModule
  children: React.ReactNode
  /** Celular: sem menu lateral, como o app faz. */
  compacto?: boolean
}) {
  const t = TITULO[modulo]

  return (
    <div className="flex h-full w-full min-h-0 bg-surface-950">
      {!compacto && (
        <nav className="flex-none w-[188px] flex flex-col gap-0.5 border-r border-surface-800 bg-surface-900 px-2 py-3">
          <div className="flex items-center gap-2 px-2 pb-3">
            <span className="w-5 h-5 rounded-full bg-[conic-gradient(from_140deg,var(--color-brand-400),var(--color-brand-600))]" />
            <span className="text-[13px] font-display font-bold text-surface-100">Oryon</span>
          </div>
          {MODULOS.map(({ id, label, icon: Icone }) => {
            const ativo = id === modulo
            return (
              <span
                key={id}
                className={cn(
                  'relative flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[12.5px] font-medium',
                  ativo ? 'text-surface-50' : 'text-surface-400',
                )}
              >
                {ativo && (
                  <motion.span
                    layoutId="hero-menu-ativo"
                    className="absolute inset-0 rounded-md bg-[var(--sf2)] border border-surface-700"
                    transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                  />
                )}
                <Icone className={cn('relative w-[16.5px] h-[16.5px]', ativo && 'text-brand-400')} />
                <span className="relative">{label}</span>
              </span>
            )
          })}
        </nav>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex-none h-11 flex items-center gap-2 border-b border-surface-800 px-4">
          <span className="text-[13px] font-semibold text-surface-100">{t.titulo}</span>
          {t.sub && (
            <>
              <span className="text-surface-600">/</span>
              <span className="text-[12.5px] text-surface-400">{t.sub}</span>
            </>
          )}
        </header>
        <div className="flex-1 min-h-0 flex overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
