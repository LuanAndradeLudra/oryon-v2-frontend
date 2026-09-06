// ─── Command Deck · feed ao vivo ──────────────────────────────────────────
// Lista de eventos do tenant (`GET /agents-ops/feed`) — ícone por tipo, texto
// e hora relativa, igual ao `.feed .fi` do mockup.
//
// O mockup desenha 6 eventos diferentes (transferiu, consultou base, aplicou
// tag, venda assistida, moveu no funil, não achou resposta). O contrato do
// BE.7 (Decisão D22) entrega só 3 kinds, cada um lastreado por uma coluna de
// timestamp que existe de verdade. Mapeio os 3 e paro por aí — inventar ícone
// para evento que o backend não emite não deixaria o feed mais completo.

import { MessageCircle, GitBranch, Undo2 } from 'lucide-react'
import type { ReactNode } from 'react'

import type { AgentFeedItem, AgentFeedItemKind } from '@/types/agentsOps'
import { relativeTime } from './deckFormat'

const KIND_STYLE: Record<AgentFeedItemKind, { icon: ReactNode; color: string; label: string }> = {
  replied: { icon: <MessageCircle />, color: 'var(--color-accent-blue)', label: 'respondeu' },
  handoff_requested: { icon: <GitBranch />, color: 'var(--color-accent-rose)', label: 'pediu transferência' },
  handoff_returned: { icon: <Undo2 />, color: 'var(--color-accent-green)', label: 'retomou' },
}

export function LiveFeed({ items }: { items: AgentFeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-surface-500 py-3">Nenhuma atividade ainda hoje.</p>
  }

  return (
    <ul className="flex flex-col">
      {items.map((item, i) => {
        const style = KIND_STYLE[item.kind]
        return (
          <li
            key={`${item.agentId}-${item.at}-${i}`}
            className="grid grid-cols-[28px_1fr] gap-2.5 py-2.5 border-b border-surface-800 last:border-b-0"
          >
            <span
              className="flex items-start justify-center pt-0.5 [&>svg]:w-[13px] [&>svg]:h-[13px]"
              style={{ color: style.color }}
              aria-hidden
            >
              {style.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[12.5px] leading-[1.45] text-surface-300">
                <b className="font-semibold text-surface-100">{item.agentName}</b>
                <span className="sr-only"> {style.label}: </span>
                <span> {item.text}</span>
              </div>
              <div className="text-[10.5px] text-surface-500 tabular-nums mt-0.5">{relativeTime(item.at)}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
