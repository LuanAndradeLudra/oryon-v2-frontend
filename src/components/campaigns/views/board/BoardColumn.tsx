// ─── Uma coluna do quadro (`.bcol`) ────────────────────────────────────────
// Cabeçalho com ponto + nome + contagem REAL, os cartões, e o rodapé de corte.
// A coluna NÃO rola por dentro: "gargalos ficam visíveis pela altura das
// colunas" é a única coisa que esta tela faz e a Lista não faz, e uma coluna
// com rolagem tem sempre a mesma altura.
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { statusColor } from '../agenda/agendaStatus'
import { capped, COLUMN_CAP, type BoardColumn as Column } from './boardColumns'
import { BoardCard } from './BoardCard'
import type { BoardCardProps } from './BoardCard'

const SURFACE: Record<'sending' | 'danger', string> = {
  sending: 'bg-status-pending/4 border-status-pending/20',
  danger:  'bg-danger/3 border-danger/[.18]',
}

type CardWiring = Omit<BoardCardProps, 'campaign' | 'showChip' | 'rate' | 'authorName' | 'lineName' | 'sendingNow'>

interface BoardColumnProps extends CardWiring {
  column: Column
  expanded: boolean
  onToggleExpand: () => void
  rateOf: (id: string) => BoardCardProps['rate']
  authorOf: (c: BoardCardProps['campaign']) => string | undefined
  lineOf: (c: BoardCardProps['campaign']) => string | undefined
  /** Qual campanha está com "Enviar agora" em curso — uma por vez, no shell. */
  sendingNowId: string | null
}

export function BoardColumn({
  column, expanded, onToggleExpand, rateOf, authorOf, lineOf, sendingNowId, ...wiring
}: BoardColumnProps) {
  const { def, cards } = column
  const { shown, hidden } = capped(cards, expanded)
  // Onde a coluna junta status, o cartão carrega o chip que diz qual dos dois é.
  const showChip = def.statuses.length > 1

  return (
    <section
      aria-label={`${def.label}: ${cards.length} ${cards.length === 1 ? 'disparo' : 'disparos'}`}
      className={cn(
        'rounded-[18px] border p-2.5 flex flex-col gap-2 min-h-[420px]',
        def.accent ? SURFACE[def.accent] : 'bg-surface-900/60 border-surface-800',
      )}
    >
      <header className="flex items-center justify-between px-1.5 pt-1 pb-2">
        <span className="text-[12px] font-bold flex items-center gap-2 text-surface-200">
          <i
            aria-hidden="true"
            className={cn(
              'w-2 h-2 rounded-full',
              // O anel do mockup só existe na coluna que está acontecendo agora.
              def.accent === 'sending' && 'ring-[3px] ring-status-pending/25',
            )}
            style={{ background: statusColor(def.dot) }}
          />
          {def.label}
        </span>
        {/* A contagem é a REAL da coluna, não a exibida: o mockup mostra 3
            cartões sob um cabeçalho que diz 18. */}
        <span className="bg-surface-700 text-surface-200 rounded-full px-2 py-0.5 text-[10.5px] leading-[1.5] font-medium tabular-nums">
          {cards.length}
        </span>
      </header>

      {shown.map((c) => (
        <BoardCard key={c.id} campaign={c} showChip={showChip}
          rate={rateOf(c.id)} authorName={authorOf(c)} lineName={lineOf(c)}
          sendingNow={sendingNowId === c.id} {...wiring} />
      ))}

      {def.id === 'draft' && <NewDraft />}

      {/* O corte, e o caminho de volta. Um dos dois, nunca os dois. */}
      {hidden > 0 && (
        <ColumnFooterButton onClick={onToggleExpand}>
          + {hidden.toLocaleString('pt-BR')} {hidden === 1 ? 'anterior' : 'anteriores'}
        </ColumnFooterButton>
      )}
      {expanded && cards.length > COLUMN_CAP && (
        <ColumnFooterButton onClick={onToggleExpand}>mostrar menos</ColumnFooterButton>
      )}
    </section>
  )
}

function ColumnFooterButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-3xs text-surface-500 hover:text-surface-300 text-center py-1.5 transition-colors"
    >
      {children}
    </button>
  )
}

/** O fantasma tracejado do fim da coluna de rascunhos. */
function NewDraft() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/campaigns/new')}
      className={cn(
        'rounded-[14px] border border-dashed border-surface-700 bg-surface-900/40',
        'text-center text-[12px] text-surface-500 p-3',
        'flex items-center justify-center gap-1.5',
        'hover:text-surface-300 hover:border-surface-600 transition-colors',
      )}
    >
      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
      Novo rascunho
    </button>
  )
}
