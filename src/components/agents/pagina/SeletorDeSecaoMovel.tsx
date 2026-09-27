import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { GRUPOS, secaoPorId, type SecaoId } from './secoesDoAgente'
import { NavegacaoDoAgente } from './NavegacaoDoAgente'
import { IndicadorDeSalvamento } from './SalvamentoDoAgente'
import type { ResumoDoAgente } from './useResumoDoAgente'

/**
 * No celular a navegação vertical vira uma barra: a seção atual (com o grupo
 * dela) e o estado de salvamento. Tocar abre as oito seções numa folha
 * inferior — a mesma navegação do desktop, com alvos de 44 px.
 */
export function SeletorDeSecaoMovel({ agentId, ativa, resumo, testeAberto }: {
  agentId: string
  ativa: SecaoId
  resumo: ResumoDoAgente
  testeAberto: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const s = secaoPorId(ativa)
  const grupo = GRUPOS.find((g) => g.id === s.grupo)!
  const Icone = s.icone

  return (
    <>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 flex flex-shrink-0 items-center gap-2 border-b border-surface-700 bg-surface-950 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-sm px-2 text-left hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Icone className="h-4 w-4 flex-shrink-0 text-accent-dark" strokeWidth={1.8} aria-hidden />
          <span className="min-w-0">
            <span className="block text-3xs font-bold uppercase tracking-[.14em] text-surface-500">{grupo.rotulo}</span>
            <span className="block truncate text-sm font-semibold text-surface-100">{s.rotulo}</span>
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-surface-400" aria-hidden />
          <span className="sr-only">Trocar de seção</span>
        </button>
        <IndicadorDeSalvamento curto className="pr-2" />
      </div>

      <BottomSheet open={aberto} onClose={() => setAberto(false)} size="tall" ariaLabel="Seções do agente">
        <NavegacaoDoAgente
          agentId={agentId}
          ativa={ativa}
          resumo={resumo}
          testeAberto={testeAberto}
          movel
          aoEscolher={() => setAberto(false)}
          className="min-h-full"
        />
      </BottomSheet>
    </>
  )
}
