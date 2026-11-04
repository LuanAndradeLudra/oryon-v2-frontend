import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { api } from '@/services/api'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { formatKpiValue } from './utils'
import { atributosLegiveis, type PaginaDaListaDaMetrica } from '@/lib/metricasDoNegocio'
import type { DateRange, KpiMetric } from '@/types/dashboard'

/**
 * SCRUM-1465 — "Quais são?": quem compõe o número de uma métrica do negócio,
 * paginado (`GET /home/metrics/:chave/list`), com o "Como calculamos" no topo.
 * O total da lista é o número do cartão (regra 8 do contrato de cálculo).
 * Só aparece para quem vê a empresa inteira — o atendente nem recebe a métrica.
 */
const LIMITE = 50

export function ListaDaMetrica({ metric, periodo, onClose }: {
  metric: KpiMetric | null
  periodo: DateRange
  onClose: () => void
}) {
  const [pagina, setPagina] = useState(1)
  const [dados, setDados] = useState<PaginaDaListaDaMetrica | null>(null)
  const [erro, setErro] = useState(false)
  const chave = metric?.id ?? null

  // Outra métrica ou outro período: volta para a 1ª página.
  const [alvo, setAlvo] = useState<string | null>(null)
  const alvoAtual = chave ? `${chave}|${periodo}` : null
  if (alvoAtual !== alvo) {
    setAlvo(alvoAtual)
    setPagina(1)
    setDados(null)
    setErro(false)
  }

  useEffect(() => {
    if (!chave) return
    let vivo = true
    api.get<PaginaDaListaDaMetrica>(`/home/metrics/${encodeURIComponent(chave)}/list`, { params: { range: periodo, page: pagina, limit: LIMITE } })
      .then(({ data }) => { if (vivo) setDados(data) })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [chave, periodo, pagina])

  const irPara = (p: number) => { setPagina(p); setDados(null); setErro(false) }
  const negocio = metric?.negocio
  const paginas = dados ? Math.max(1, Math.ceil(dados.total / (dados.limite || LIMITE))) : 1
  const moeda = metric?.unit === 'currency'

  return (
    <Drawer open={!!metric} onClose={onClose} side="right" ariaLabel={metric ? `Quais são: ${metric.label}` : 'Quais são'} className="w-full sm:w-[480px] max-w-full bg-surface-950">
      {metric && (
        <>
          <header className="flex items-start justify-between gap-3 px-[18px] py-3.5 border-b border-surface-700 flex-shrink-0">
            <div className="min-w-0">
              <h2 className="text-base font-display font-semibold tracking-[-0.01em] text-surface-50">{metric.label}</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                {formatKpiValue(metric.value, metric.unit)}
                {negocio?.selos.includes('estimado') ? ' · estimado' : ''}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-[6px] text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {negocio?.explicacao && (
              <section aria-labelledby="como-calculamos" className="px-[18px] pt-4">
                <h3 id="como-calculamos" className="text-2xs font-semibold uppercase tracking-[0.1em] text-surface-400 mb-1.5">Como calculamos</h3>
                <p className="text-xs text-surface-300 leading-relaxed" data-testid="como-calculamos">{negocio.explicacao}</p>
              </section>
            )}

            {negocio && negocio.quebra.length > 0 && (
              <section aria-labelledby="por-grupo" className="px-[18px] pt-4">
                <h3 id="por-grupo" className="text-2xs font-semibold uppercase tracking-[0.1em] text-surface-400 mb-1.5">Por grupo</h3>
                <ul className="rounded-[10px] border border-surface-700 bg-surface-800 overflow-hidden" data-testid="quebra-da-metrica">
                  {negocio.quebra.map((q, i) => (
                    <li key={q.chave ?? '—'} className={cn('flex items-center justify-between gap-2 h-9 px-3 text-xs', i < negocio.quebra.length - 1 && 'border-b border-surface-700')}>
                      <span className="text-surface-200 truncate">{q.rotulo}</span>
                      <span className="tabular-nums font-semibold text-surface-100">
                        {formatKpiValue(moeda && q.valor !== null ? q.valor / 100 : q.valor, metric.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="quais-sao" className="px-[18px] pt-4 pb-5">
              <div className="flex items-baseline gap-2 mb-1.5">
                <h3 id="quais-sao" className="text-2xs font-semibold uppercase tracking-[0.1em] text-surface-400">Quais são</h3>
                {dados && <span className="text-xs text-surface-500 tabular-nums" data-testid="total-da-lista">{dados.total.toLocaleString('pt-BR')}</span>}
              </div>
              {erro ? (
                <p role="alert" className="py-3 text-xs font-semibold text-danger">Não foi possível carregar a lista. Tente de novo.</p>
              ) : !dados ? (
                <p className="py-3 text-xs text-surface-500">Carregando…</p>
              ) : dados.itens.length === 0 ? (
                <p className="py-3 text-xs text-surface-500">Nada neste período.</p>
              ) : (
                <ul className="rounded-[10px] border border-surface-700 bg-surface-800 overflow-hidden" data-testid="itens-da-metrica">
                  {dados.itens.map((it, i) => {
                    const attrs = atributosLegiveis(it.atributos)
                    const quando = new Date(it.em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    const nome = it.contatoNome ?? 'Contato sem nome'
                    return (
                      <li key={`${it.chave}-${i}`} className={cn('px-3 py-2', i < dados.itens.length - 1 && 'border-b border-surface-700')}>
                        <div className="flex items-baseline justify-between gap-2">
                          {it.conversaId ? (
                            <Link to={`/conversations?id=${encodeURIComponent(it.conversaId)}`} className="text-sm font-medium text-surface-100 hover:underline truncate">{nome}</Link>
                          ) : (
                            <span className="text-sm font-medium text-surface-100 truncate">{nome}</span>
                          )}
                          <span className="text-2xs text-surface-500 tabular-nums flex-shrink-0">{quando}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-2xs text-surface-400">
                          {attrs.map((a) => <span key={a.rotulo}>{a.rotulo}: {a.valor}</span>)}
                          {it.convertido !== undefined && <span className={it.convertido ? 'text-online' : undefined}>{it.convertido ? 'converteu' : 'não converteu'}</span>}
                          {it.precoCents !== undefined && <span>{it.precoCents === null ? 'sem preço' : formatKpiValue(it.precoCents / 100, 'currency')}</span>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          {dados && paginas > 1 && (
            <footer className="flex items-center justify-between gap-2 px-[18px] py-3 border-t border-surface-700 flex-shrink-0">
              <Button variant="neutral" size="sm" onClick={() => irPara(Math.max(1, pagina - 1))} disabled={pagina <= 1}>Anterior</Button>
              <span className="text-xs text-surface-400 tabular-nums">Página {pagina} de {paginas}</span>
              <Button variant="neutral" size="sm" onClick={() => irPara(Math.min(paginas, pagina + 1))} disabled={pagina >= paginas}>Próxima</Button>
            </footer>
          )}
        </>
      )}
    </Drawer>
  )
}
