import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Route, TriangleAlert as AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { ResumoDaJornada, StatusDaJornada } from '@/services/jornadas/tipos'
import { AvisoDeExemplo, SeloDoStatus } from '@/components/jornadas/comum'
import { numero, quandoFoi, useCarregar } from '@/components/jornadas/apoio'
import { GaleriaDeReceitas } from '@/components/jornadas/GaleriaDeReceitas'

/**
 * ORY-60 — Jornadas (no lugar do módulo de Automações). Lista e galeria de
 * receitas. Dados de exemplo até a ORY-62 ligar a API (`jornadasApi`).
 */

type Filtro = 'todas' | 'active' | 'shadow' | 'draft' | 'paused'
type Aba = 'minhas' | 'receitas'

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
      <main className="flex-1 px-4 md:px-6 pt-4 md:pt-6 pb-8 space-y-4 w-full min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-surface-400 max-w-[720px]">
            Caminhos no tempo: mandar, esperar a resposta, decidir, avisar alguém e parar quando o objetivo for atingido. Cada jornada mostra quem está em cada passo e por quê.
          </p>
          <Button leftIcon={<Plus className="w-4 h-4" aria-hidden />} onClick={() => (isMobile ? setGateAberto(true) : setAba('receitas'))}>
            Nova jornada
          </Button>
        </div>

        <AvisoDeExemplo onRestaurado={recarregar} />

        <Tabs
          label="Jornadas"
          value={aba}
          onChange={setAba}
          tabs={[
            { id: 'minhas', label: 'Minhas jornadas', count: jornadas?.length },
            { id: 'receitas', label: 'Galeria de receitas' },
          ]}
        />

        {aba === 'receitas' ? (
          isMobile ? (
            <p className="text-sm text-surface-400">No celular, as jornadas são só para acompanhar. Monte no computador.</p>
          ) : (
            <GaleriaDeReceitas />
          )
        ) : (
          <>
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
                hint="Comece por uma receita da galeria: a confirmação de consulta já vem pronta."
                action={{ label: 'Ver a galeria', onClick: () => setAba('receitas') }}
              />
            )}
            {jornadas && visiveis.length > 0 && (
              <ul className="space-y-2">
                {visiveis.map((j) => <LinhaDaJornada key={j.id} j={j} onAbrir={() => navigate(`/jornadas/${j.id}`)} />)}
              </ul>
            )}
          </>
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

function Metrica({ rotulo, valor, dica }: { rotulo: string; valor: React.ReactNode; dica?: string }) {
  return (
    <div className="min-w-0" title={dica}>
      <p className="text-[11px] text-surface-500">{rotulo}</p>
      <p className="text-sm font-semibold text-surface-100 tabular-nums">{valor}</p>
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
    <li>
      <button
        type="button"
        onClick={onAbrir}
        className="w-full text-left rounded-[10px] border border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] hover:border-[var(--bd2)] px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-8"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-surface-50">{j.name}</span>
            <SeloDoStatus status={j.status} />
            {j.publishedVersion && <span className="text-[11px] text-surface-500">v{j.publishedVersion}</span>}
            {j.hasDraftChanges && j.publishedVersion && <span className="text-[11px] text-surface-400">· rascunho com mudanças</span>}
          </div>
          <p className="mt-0.5 text-xs text-surface-400 truncate">{j.description || FRASE_DO_STATUS[j.status] || '—'}</p>
        </div>
        <div className="mt-3 md:mt-0 grid grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-2 md:w-[560px]">
          <Metrica rotulo="Dentro agora" valor={numero(j.enrolledNow)} dica="Pessoas andando ou esperando num passo." />
          <Metrica rotulo="Bateu a meta" valor={j.goalRate30d === null ? '—' : `${j.goalRate30d}%`} dica="Das inscrições encerradas nos últimos 30 dias." />
          <Metrica rotulo="Mensagens no mês" valor={numero(j.messagesThisMonth)} />
          <Metrica
            rotulo="Saúde (24 h)"
            valor={j.errors24h > 0
              ? <span className="inline-flex items-center gap-1 text-status-pending"><AlertTriangleIcon className="w-3.5 h-3.5" aria-hidden />{j.errors24h} erro{j.errors24h > 1 ? 's' : ''}</span>
              : <span className="text-surface-300">Sem erros</span>}
          />
          <Metrica rotulo="Última atividade" valor={<span className="font-normal text-surface-300">{quandoFoi(j.lastActivityAt)}</span>} />
        </div>
      </button>
    </li>
  )
}
