import { useState } from 'react'
import { LifeBuoy, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/utils'
import type { FilaDaEquipe, ItemDaFila, ResumoDaFila, SituacaoDaFila } from '@/types/support'
import { EscolhaEmLinha, Linha } from '../ReportTicketPanel'
import { ORIGENS_DO_PROBLEMA, dataCurta, tituloDoChamado, type OrigemDoProblema } from '../supportModel'
import { PRIORIDADES } from './modeloDaFila'
import { PrazoNaFila, PrioridadeNaFila, StatusNaFila } from './PecasDaFila'

export interface FiltrosDaLista {
  situacao: SituacaoDaFila
  empresa: string | null
  origem: OrigemDoProblema | null
  soSinais: boolean
}

const FILAS: Array<[FilaDaEquipe, string, keyof ResumoDaFila['contadores']]> = [
  ['minha', 'Minha fila', 'minha'], ['sem_dono', 'Sem dono', 'semDono'], ['todos', 'Todos', 'todos'],
]

/**
 * Lista da fila (340 px): "Minha fila · Sem dono · Todos", o resto em
 * "Filtros". Itens de três linhas; o prazo só aparece perto de vencer (ou
 * vencido) — senão a linha mostra o responsável e o começo do relato.
 */
export function ListaDaFila({
  itens, erro, proximo, carregandoMais, onCarregarMais, onTentarDeNovo, selecionadoId, onAbrir,
  fila, onFila, contadores, filtros, onFiltros, empresas, busca, celular, agora,
}: {
  itens: ItemDaFila[] | null
  erro: boolean
  proximo: string | null
  carregandoMais: boolean
  onCarregarMais: () => void
  onTentarDeNovo: () => void
  selecionadoId: string | null
  onAbrir: (id: string) => void
  fila: FilaDaEquipe
  onFila: (f: FilaDaEquipe) => void
  contadores: ResumoDaFila['contadores'] | null
  filtros: FiltrosDaLista
  onFiltros: (f: Partial<FiltrosDaLista>) => void
  empresas: ResumoDaFila['empresas']
  busca: string
  celular: boolean
  agora: number
}) {
  const [verFiltros, setVerFiltros] = useState(false)
  const ativos = [filtros.situacao !== 'abertos', !!filtros.empresa, !!filtros.origem, filtros.soSinais].filter(Boolean).length

  return (
    <aside className={cn('flex flex-col min-h-0 bg-surface-900', celular ? 'flex-1 min-w-0' : 'w-[340px] flex-shrink-0 border-r border-surface-800')} aria-label="Fila">
      <div className="px-3 pt-2 pb-2 flex flex-col gap-2 border-b border-surface-800">
        <div className="flex items-center gap-1">
          <div className="flex flex-1" role="tablist" aria-label="Responsável">
            {FILAS.map(([k, rotulo, contador]) => (
              <button key={k} type="button" role="tab" aria-selected={fila === k} onClick={() => onFila(k)}
                className={cn('flex-auto h-8 px-1 inline-flex items-center justify-center gap-1 whitespace-nowrap text-xs font-semibold border-b-2 transition-colors',
                  fila === k ? 'border-brand-500 text-surface-100' : 'border-transparent text-surface-400 hover:text-surface-200')}>
                {rotulo}
                {contadores && <span className="text-[10.5px] tabular-nums text-surface-400">{contadores[contador]}</span>}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setVerFiltros((v) => !v)} aria-expanded={verFiltros}
            className={cn('h-8 px-2 rounded-[6px] inline-flex items-center gap-1.5 text-xs font-semibold hover:bg-[var(--rowhover)]', ativos ? 'text-surface-100' : 'text-surface-400')}>
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />Filtros{ativos ? ` · ${ativos}` : ''}
          </button>
        </div>
        {verFiltros && (
          <div className="flex flex-col px-1 pb-1">
            <Linha rotulo="Situação">
              <EscolhaEmLinha<SituacaoDaFila> rotulo="Situação" valor={filtros.situacao} onChange={(v) => v && onFiltros({ situacao: v })}
                opcoes={[['abertos', 'Em aberto'], ['encerrados', 'Encerrados'], ['todos', 'Todos']]} />
            </Linha>
            <Linha rotulo="Empresa">
              <EscolhaEmLinha rotulo="Empresa" valor={filtros.empresa} onChange={(v) => onFiltros({ empresa: v })} limpar vazio="Todas"
                opcoes={empresas.map((e) => [e.id, `${e.nome}${e.abertos ? ` · ${e.abertos}` : ''}`])} />
            </Linha>
            <Linha rotulo="Origem">
              <EscolhaEmLinha<OrigemDoProblema> rotulo="Origem" valor={filtros.origem} onChange={(v) => onFiltros({ origem: v })} limpar vazio="Todas"
                opcoes={(Object.keys(ORIGENS_DO_PROBLEMA) as OrigemDoProblema[]).map((o) => [o, ORIGENS_DO_PROBLEMA[o]])} />
            </Linha>
            <Linha rotulo="Só sinais">
              <button type="button" role="switch" aria-checked={filtros.soSinais} onClick={() => onFiltros({ soSinais: !filtros.soSinais })}
                className="text-[13px] text-surface-100 h-8 -ml-2 px-2 rounded-[6px] hover:bg-[var(--rowhover)]">
                {filtros.soSinais ? 'Sim, só os automáticos' : 'Não'}
              </button>
            </Linha>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {erro && !itens?.length ? (
          <ErrorState compact onRetry={onTentarDeNovo} />
        ) : itens === null ? (
          <p className="px-4 py-3 text-xs text-surface-400" role="status">Carregando a fila…</p>
        ) : itens.length === 0 ? (
          <div className="px-3">
            <EmptyState icon={LifeBuoy} title="Fila vazia" hint={busca ? 'Nada com esse termo.' : 'Nada neste filtro.'} />
          </div>
        ) : (
          <>
            {itens.map((c) => {
              const ativo = selecionadoId === c.id
              const prazoPerto = c.proximoPrazo?.perto
              return (
                <button key={c.id} type="button" onClick={() => onAbrir(c.id)} aria-current={ativo ? 'true' : undefined}
                  className={cn('relative w-full text-left pl-4 pr-3.5 py-2.5 border-b border-surface-800 flex flex-col gap-0.5 transition-colors',
                    ativo ? 'bg-[var(--sel)]' : 'hover:bg-[var(--rowhover)]')}>
                  <span aria-hidden className={cn('absolute left-0 top-0 bottom-0 w-[3px]', PRIORIDADES[c.prioridade].faixa)} />
                  <span className="flex items-center gap-1.5 min-w-0">
                    <PrioridadeNaFila prioridade={c.prioridade} />
                    <span className="font-mono text-[11px] text-surface-400 whitespace-nowrap flex-shrink-0">{c.numero}</span>
                    <span className="text-[11px] text-surface-300 truncate">{c.tenantNome}{c.kind === 'oco' ? ' · interno' : ''}</span>
                    <span className="ml-auto text-[11px] text-surface-400 tabular-nums flex-shrink-0">{dataCurta(c.atualizadoEm)}</span>
                  </span>
                  <span className="text-[13px] font-semibold text-surface-100 truncate">{tituloDoChamado(c)}</span>
                  <span className="flex items-center gap-2 min-w-0">
                    {prazoPerto
                      ? <span className="flex-1 min-w-0 flex"><PrazoNaFila prazo={c.proximoPrazo} agora={agora} /></span>
                      : <span className="text-xs text-surface-400 truncate flex-1">{c.responsavel ? `${c.responsavel} · ` : 'Sem dono · '}{c.descricao}</span>}
                    <StatusNaFila status={c.status} />
                  </span>
                </button>
              )
            })}
            {proximo && (
              <div className="p-3">
                <Button variant="neutral" size="sm" className="w-full" loading={carregandoMais} onClick={onCarregarMais}>Carregar mais</Button>
              </div>
            )}
          </>
        )}
      </div>

      {!celular && (
        <p className="px-3 py-1.5 border-t border-surface-800 text-[11px] text-surface-500 flex gap-3">
          <span><kbd className="font-mono text-surface-400">J</kbd>/<kbd className="font-mono text-surface-400">K</kbd> navegar</span>
          <span><kbd className="font-mono text-surface-400">A</kbd> assumir</span>
          <span><kbd className="font-mono text-surface-400">R</kbd> responder</span>
        </p>
      )}
    </aside>
  )
}
