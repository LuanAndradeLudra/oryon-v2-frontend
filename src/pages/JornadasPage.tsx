import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, CircleCheck, Plus, Route, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { ResumoDaJornada, StatusDaJornada } from '@/services/jornadas/tipos'
import { SeloDoStatus } from '@/components/jornadas/comum'
import { numero, quandoFoi, useCarregar } from '@/components/jornadas/apoio'
import { GaleriaDeReceitas } from '@/components/jornadas/GaleriaDeReceitas'

/**
 * ORY-60 — Jornadas (no lugar do módulo de Automações): a lista, em tabela com
 * colunas alinhadas e um cabeçalho só, e a galeria de receitas.
 */

type Filtro = 'todas' | 'active' | 'shadow' | 'draft' | 'paused'
type Aba = 'minhas' | 'receitas'

/** As colunas da tabela (cabeçalho e linhas usam a mesma grade). */
const GRADE = 'md:grid md:grid-cols-[minmax(0,1fr)_104px_104px_120px_128px_112px_20px] md:items-center md:gap-x-5'

export function JornadasPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [aba, setAba] = useState<Aba>('minhas')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [gateAberto, setGateAberto] = useState(false)
  const { dados: jornadas, erro, recarregar } = useCarregar(() => jornadasApi.listar(), [])

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: jornadas?.length ?? 0 }
    for (const j of jornadas ?? []) c[j.status] = (c[j.status] ?? 0) + 1
    return c
  }, [jornadas])
  const visiveis = (jornadas ?? []).filter((j) => filtro === 'todas' || j.status === filtro)

  return (
    <div className="flex flex-col h-full w-full bg-surface-950 overflow-y-auto">
      {isMobile && <MobilePageHeader title="Jornadas" />}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-8 pt-5 md:pt-7 pb-10 space-y-5 min-w-0">
        {/* O título "Jornadas" já está na barra do topo do app, como nas outras telas. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="min-w-0 max-w-[680px] text-[13.5px] leading-relaxed text-surface-400">
            Automações em etapas: mandar, esperar a resposta, decidir, avisar alguém e parar quando o objetivo for atingido.
          </p>
          <Button leftIcon={<Plus className="w-4 h-4" aria-hidden />} onClick={() => (isMobile ? setGateAberto(true) : setAba('receitas'))}>
            Nova jornada
          </Button>
        </div>

        <Tabs
          label="Jornadas"
          value={aba}
          onChange={setAba}
          tabs={[
            { id: 'minhas', label: 'Minhas jornadas', count: jornadas?.length },
            { id: 'receitas', label: 'Começar por uma receita' },
          ]}
        />

        {aba === 'receitas' ? (
          isMobile ? (
            <p className="text-sm text-surface-400">No celular, as jornadas são só para acompanhar. Monte no computador.</p>
          ) : (
            <GaleriaDeReceitas />
          )
        ) : (
          <div className="space-y-4">
            <SegmentedControl
              label="Filtrar jornadas"
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: 'todas', label: 'Todas', count: contagem.todas },
                { value: 'active', label: 'Ativas', count: contagem.active ?? 0 },
                { value: 'shadow', label: 'Em sombra', count: contagem.shadow ?? 0 },
                { value: 'draft', label: 'Rascunhos', count: contagem.draft ?? 0 },
                { value: 'paused', label: 'Pausadas', count: contagem.paused ?? 0 },
              ]}
            />
            {erro && !jornadas && <ErrorState onRetry={recarregar} />}
            {!erro && !jornadas && (
              <div className="space-y-2" aria-busy="true" aria-label="Carregando as jornadas">
                {[0, 1, 2].map((i) => <SkeletonCard key={i} lines={2} />)}
              </div>
            )}
            {jornadas && visiveis.length === 0 && (
              <EmptyState
                icon={Route}
                title={filtro === 'todas' ? 'Nenhuma jornada ainda' : 'Nenhuma jornada neste filtro'}
                hint="Comece por uma receita: a confirmação de consulta já vem pronta para ajustar."
                action={{ label: 'Ver as receitas', onClick: () => setAba('receitas') }}
              />
            )}
            {jornadas && visiveis.length > 0 && (
              <div className="rounded-[12px] border border-surface-700 overflow-hidden" role="table" aria-label="Jornadas">
                <div role="row" className={cn('hidden px-5 h-10 bg-surface-900 text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500', GRADE)}>
                  <span role="columnheader">Jornada</span>
                  <span role="columnheader" className="text-right" title="Pessoas andando ou esperando num passo">Dentro agora</span>
                  <span role="columnheader" className="text-right" title="Das inscrições encerradas nos últimos 30 dias">Bateu a meta</span>
                  <span role="columnheader" className="text-right">Mensagens/mês</span>
                  <span role="columnheader">Saúde (24 h)</span>
                  <span role="columnheader">Atividade</span>
                  <span aria-hidden />
                </div>
                {visiveis.map((j) => <LinhaDaJornada key={j.id} j={j} onAbrir={() => navigate(`/jornadas/${j.id}`)} />)}
              </div>
            )}
          </div>
        )}
      </main>
      <MobileFeatureGate
        open={gateAberto}
        onClose={() => setGateAberto(false)}
        featureName="Montar jornadas"
        description="O canvas de jornadas é feito para o computador. No celular dá para acompanhar as jornadas e as pessoas."
      />
    </div>
  )
}

const FRASE_DO_STATUS: Partial<Record<StatusDaJornada, string>> = {
  shadow: 'Rodando em sombra: nada é enviado.',
  paused: 'Pausada: ninguém novo entra.',
  draft: 'Rascunho: ainda não roda.',
}

function LinhaDaJornada({ j, onAbrir }: { j: ResumoDaJornada; onAbrir: () => void }) {
  return (
    <button
      type="button"
      role="row"
      onClick={onAbrir}
      className={cn(
        'group w-full text-left border-t border-surface-700 first:border-t-0 bg-surface-800 hover:bg-[var(--rowhover)] px-5 py-3.5 transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
        GRADE,
      )}
    >
      <div role="cell" className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-[14px] font-semibold text-surface-50">{j.name}</span>
          <SeloDoStatus status={j.status} />
          {j.publishedVersion && <span className="shrink-0 text-[11.5px] text-surface-500">v{j.publishedVersion}</span>}
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-surface-400">
          {j.hasDraftChanges && j.publishedVersion ? 'Rascunho com mudanças ainda não publicadas · ' : ''}{j.description || FRASE_DO_STATUS[j.status] || '—'}
        </p>
      </div>
      {/* No celular, as métricas viram uma linha de rótulo + valor. */}
      <div className="mt-3 grid grid-cols-3 gap-3 md:contents">
        <Celula rotulo="Dentro agora" alinhamento="direita">{numero(j.enrolledNow)}</Celula>
        <Celula rotulo="Bateu a meta" alinhamento="direita">{j.goalRate30d === null ? <span className="text-surface-500">—</span> : `${j.goalRate30d}%`}</Celula>
        <Celula rotulo="Mensagens/mês" alinhamento="direita">{numero(j.messagesThisMonth)}</Celula>
        <Celula rotulo="Saúde (24 h)">
          {j.errors24h > 0
            ? <span className="inline-flex items-center gap-1.5 text-status-pending"><TriangleAlert className="w-3.5 h-3.5" aria-hidden />{j.errors24h} {j.errors24h > 1 ? 'erros' : 'erro'}</span>
            : <span className="inline-flex items-center gap-1.5 text-surface-300"><CircleCheck className="w-3.5 h-3.5 text-status-active" aria-hidden />Sem erros</span>}
        </Celula>
        <Celula rotulo="Atividade"><span className="font-normal text-surface-300">{quandoFoi(j.lastActivityAt)}</span></Celula>
      </div>
      <ChevronRight className="hidden md:block w-4 h-4 text-surface-500 group-hover:text-surface-200 transition-colors" aria-hidden />
    </button>
  )
}

function Celula({ rotulo, alinhamento, children }: { rotulo: string; alinhamento?: 'direita'; children: React.ReactNode }) {
  return (
    <div role="cell" className={cn('min-w-0', alinhamento === 'direita' && 'md:text-right')}>
      <p className="md:hidden text-[11px] text-surface-500">{rotulo}</p>
      <p className="text-[13.5px] font-semibold text-surface-100 tabular-nums whitespace-nowrap">{children}</p>
    </div>
  )
}
