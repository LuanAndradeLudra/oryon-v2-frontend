import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GRUPOS, SECOES, rotaDoAgente, type SecaoId } from './secoesDoAgente'
import type { ResumoDoAgente } from './useResumoDoAgente'

/**
 * Navegação vertical da página do agente — três perguntas em vez de dez abas
 * soltas. Os links carregam a seção na URL; a bancada de teste, se aberta,
 * continua aberta (o `?teste=1` viaja junto).
 */
export function NavegacaoDoAgente({
  agentId, ativa, resumo, testeAberto, className,
}: {
  agentId: string
  ativa: SecaoId
  resumo: ResumoDoAgente
  testeAberto: boolean
  className?: string
}) {
  const contagem: Partial<Record<SecaoId, string>> = {
    conhecimento: resumo.documentos != null ? String(resumo.documentos) : undefined,
    catalogo: resumo.produtosAtivos != null ? String(resumo.produtosAtivos) : undefined,
    capacidades: String(resumo.capacidadesLigadas),
    transferencia: String(resumo.regrasAtivas),
  }

  return (
    <nav aria-label="Seções do agente" className={cn('flex flex-col min-h-0', className)}>
      <Link
        to="/agents"
        className="mx-2 mb-2 inline-flex items-center gap-1 h-7 px-2 rounded-sm text-xs font-semibold text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
        Todos os agentes
      </Link>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
        {GRUPOS.map((g, gi) => (
          <div key={g.id} className={cn(gi > 0 && 'mt-4')}>
            <p className="px-2.5 mb-1 text-3xs font-bold uppercase tracking-[.14em] text-surface-500">{g.rotulo}</p>
            <ul className="flex flex-col gap-px">
              {SECOES.filter((s) => s.grupo === g.id).map((s) => {
                const Icone = s.icone
                const on = s.id === ativa
                return (
                  <li key={s.id}>
                    <Link
                      to={rotaDoAgente(agentId, s.id, { teste: testeAberto })}
                      replace
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 h-8 px-2.5 rounded-sm text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        on
                          ? 'bg-[var(--rowhover)] text-surface-50 shadow-[inset_2px_0_0_0_var(--color-brand-500)]'
                          : 'text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)]',
                      )}
                    >
                      <Icone className={cn('w-4 h-4 flex-shrink-0', on ? 'text-accent-dark' : 'text-surface-500')} strokeWidth={1.8} aria-hidden />
                      <span className="flex-1 truncate">{s.rotulo}</span>
                      {contagem[s.id] != null && (
                        <span className="text-2xs tabular-nums text-surface-500">{contagem[s.id]}</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <FontesDasRespostas resumo={resumo} className="mx-2" />
    </nav>
  )
}

/** "De onde saem as respostas" — o que a IA consulta hoje, num relance. */
function FontesDasRespostas({ resumo, className }: { resumo: ResumoDoAgente; className?: string }) {
  const linhas: Array<{ rotulo: string; valor: string; ligado: boolean }> = [
    { rotulo: 'Instruções', valor: resumo.caracteresInstrucoes > 0 ? 'escritas' : 'vazias', ligado: resumo.caracteresInstrucoes > 0 },
    { rotulo: 'Documentos', valor: resumo.documentos == null ? '…' : String(resumo.documentos), ligado: (resumo.documentos ?? 0) > 0 },
    { rotulo: 'Itens do catálogo', valor: resumo.produtosAtivos == null ? '…' : String(resumo.produtosAtivos), ligado: (resumo.produtosAtivos ?? 0) > 0 },
  ]
  return (
    <div className={cn('rounded-md border border-surface-700 bg-[var(--sf2)] px-3 py-2.5', className)}>
      <p className="text-3xs font-bold uppercase tracking-[.14em] text-surface-500 mb-1.5">De onde saem as respostas</p>
      <ul className="flex flex-col gap-1">
        {linhas.map((l) => (
          <li key={l.rotulo} className="flex items-center gap-2 text-xs">
            <span aria-hidden className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', l.ligado ? 'bg-brand-500' : 'bg-[var(--bd2)]')} />
            <span className={cn('truncate', l.ligado ? 'text-surface-200' : 'text-surface-400')}>{l.rotulo}</span>
            <span className="ml-auto whitespace-nowrap text-2xs tabular-nums text-surface-500">{l.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
