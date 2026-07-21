import { useEffect, useMemo, useState } from 'react'
import { History, StickyNote, Pin } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { MockBadge } from './MockBadge'
import { PROFILE_MOCKS_ENABLED } from './mockData'
import { fetchContactTimeline, NOTE_CHIP, type TimelineEvent, type TimelineSection } from './timelineSources'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { cn } from '@/lib/utils'
import type { ContactNote } from '@/types/contactProfile'

type TimelineFilter = 'all' | TimelineSection

interface ContactTimelineProps {
  contactId: string
  /** Notas (mock + criadas em memória pelo composer) mescladas na timeline. */
  notes: ContactNote[]
  /**
   * Preenche 100% da altura do container pai e rola a lista de eventos
   * internamente (o filtro fica fixo acima). Usado no layout desktop de
   * altura fixa (sem scroll de página). Desligado no mobile — lá a página
   * inteira rola e a timeline flui naturalmente.
   */
  fillHeight?: boolean
}

function timeOf(ms: number) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** "Hoje" / "Ontem" / "12 de março" — divisores de dia da timeline. */
function dayLabel(ms: number): string {
  const d = new Date(ms)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, today)) return 'Hoje'
  if (sameDay(d, yesterday)) return 'Ontem'
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
}

function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Timeline unificada do perfil (padrão Kommo "feed"): 3 fontes reais
 * (via timelineSources) + notas locais, agrupadas por dia, filtráveis por
 * origem com contadores.
 */
export function ContactTimeline({ contactId, notes, fillHeight = false }: ContactTimelineProps) {
  const { vocab } = useTenantVocab()
  const [remote, setRemote] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TimelineFilter>('all')

  // Rótulo da seção respeitando o vocabulário por vertical (Funil/Agenda...).
  const sectionLabel: Record<TimelineSection, string> = {
    pipeline: vocab.pipeline,
    conversas: 'Conversa',
    notas: 'Nota',
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    setFilter('all')
    fetchContactTimeline(contactId)
      .then((events) => { if (alive) setRemote(events) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [contactId])

  const items = useMemo(() => {
    const noteEvents: TimelineEvent[] = notes.map((n) => ({
      id: `n-${n.id}`,
      section: 'notas',
      ts: new Date(n.createdAt).getTime(),
      label: n.body,
      actor: n.authorName,
      Icon: n.pinned ? Pin : StickyNote,
      chip: NOTE_CHIP,
    }))
    return [...remote, ...noteEvents].sort((x, y) => y.ts - x.ts)
  }, [remote, notes])

  const counts = useMemo(() => ({
    all: items.length,
    pipeline: items.filter((i) => i.section === 'pipeline').length,
    conversas: items.filter((i) => i.section === 'conversas').length,
    notas: items.filter((i) => i.section === 'notas').length,
  }), [items])

  const filtered = filter === 'all' ? items : items.filter((i) => i.section === filter)

  // Agrupamento por dia preservando a ordem (desc).
  const groups = useMemo(() => {
    const result: Array<{ key: string; label: string; events: TimelineEvent[] }> = []
    for (const item of filtered) {
      const key = dayKey(item.ts)
      const last = result[result.length - 1]
      if (last && last.key === key) {
        last.events.push(item)
      } else {
        result.push({ key, label: dayLabel(item.ts), events: [item] })
      }
    }
    return result
  }, [filtered])

  const filterOptions: Array<{ value: TimelineFilter; label: string; count: number }> = [
    { value: 'all', label: 'Tudo', count: counts.all },
    { value: 'pipeline', label: vocab.pipeline, count: counts.pipeline },
    { value: 'conversas', label: 'Conversas', count: counts.conversas },
    ...(PROFILE_MOCKS_ENABLED || counts.notas > 0
      ? [{ value: 'notas' as const, label: 'Notas', count: counts.notas }]
      : []),
  ]

  return (
    <div className={cn('flex flex-col gap-4', fillHeight && 'flex-1 min-h-0')}>
      <SegmentedControl
        label="Filtrar timeline por origem"
        options={filterOptions}
        value={filter}
        onChange={setFilter}
        size="sm"
        variant="solid"
        className="self-start shrink-0"
      />

      <div className={cn(fillHeight && 'flex-1 min-h-0 overflow-y-auto scroll-thin pr-1 -mr-1')}>
      {loading ? (
        <SkeletonList items={5} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={History}
          title={filter === 'notas' ? 'Nenhuma nota ainda.' : 'Nenhum evento registrado ainda.'}
          hint={filter === 'notas'
            ? 'Use o campo acima para registrar a primeira nota deste contato.'
            : 'Interações, mudanças de estágio e ações da IA aparecem aqui.'}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-surface-400">{group.label}</span>
                <div className="flex-1 h-px bg-surface-700/70" />
              </div>
              <div className="relative pl-5 flex flex-col">
                <div className="absolute left-2 top-3 bottom-3 w-px bg-surface-700/70" />
                {group.events.map((item) => (
                  <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {/* Chip saturado + ícone branco — mesmo padrão dos badges de tags */}
                    <div
                      className="color-chip absolute -left-0.5 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 z-[1]"
                      style={{ ['--chip']: item.chip } as React.CSSProperties}
                    >
                      <item.Icon className="w-3 h-3" />
                    </div>
                    <div className="ml-7 min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-surface-200 flex-1 whitespace-pre-line">{item.label}</p>
                        {item.section === 'notas' && item.id.startsWith('n-mock-') && <MockBadge />}
                        {filter === 'all' && (
                          <span className="text-[11px] uppercase tracking-wide text-surface-400 bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                            {sectionLabel[item.section]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-surface-400">{item.actor}</span>
                        <span className="text-surface-600">·</span>
                        <span className="text-[11px] text-surface-400">{timeOf(item.ts)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
