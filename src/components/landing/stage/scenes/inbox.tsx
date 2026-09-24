import { MessageSquare, Search } from 'lucide-react'
import { StageRail } from '../primitives/StageRail'
import { StageConvRow } from '../primitives/StageConvRow'
import { StageChatHeader, StageHandoffStripe } from '../primitives/StageChatHeader'
import { StageBubble, StageGuardLine } from '../primitives/StageBubble'
import {
  DEMO_EXISTING, DEMO_GUARD_LABEL, DEMO_GUARD_SUB, DEMO_LEAD, DEMO_LEAD_PREVIEW, DEMO_MESSAGES, DEMO_OPERATOR,
} from '../demoData'
import type { DemoConversation } from '../demoData'
import type { StageFrameKey, StageLayout } from '../types'

/**
 * Cena "Conversas" — ilustração ESTÁTICA por `frame` (sem roteiro/timeline nem
 * cursor falso, técnica da Attio, dissecção 24/09): cada frame é o estado que
 * a peça teria naquele ponto da história, já montado por inteiro.
 *   inicio  — chegou mensagem nova (linha não lida); painel ainda sem seleção.
 *   ia      — o Agente IA respondeu (`.ambient-ring` no chip: está no controle).
 *   handoff — cliente pede humano; a guarda retém a resposta ("Verificação pendente").
 *   humano  — o atendente assume (chip verde, stripe verde, resposta enviada).
 *   final   — mesma conversa, mensagem já lida (dois tiques na cor de marca).
 */
const AI_CONTROL: StageFrameKey[] = ['ia', 'handoff']
const HAS_GUARD: StageFrameKey[] = ['handoff', 'humano', 'final']
const HUMAN_TOOK_OVER: StageFrameKey[] = ['humano', 'final']

function leadRow(frame: StageFrameKey): DemoConversation {
  const preview = HUMAN_TOOK_OVER.includes(frame)
    ? DEMO_LEAD_PREVIEW.human
    : HAS_GUARD.includes(frame)
      ? DEMO_LEAD_PREVIEW.inbound2
      : frame === 'ia'
        ? DEMO_LEAD_PREVIEW.ai1
        : DEMO_LEAD_PREVIEW.inbound1
  const time = HUMAN_TOOK_OVER.includes(frame)
    ? DEMO_MESSAGES.times.human
    : HAS_GUARD.includes(frame)
      ? DEMO_MESSAGES.times.inbound2
      : DEMO_MESSAGES.times.inbound1
  return {
    id: DEMO_LEAD.id, name: DEMO_LEAD.name, phone: DEMO_LEAD.phone, preview, time,
    actor: HUMAN_TOOK_OVER.includes(frame) ? 'human' : 'ai',
    unread: frame === 'inicio' ? 1 : undefined,
  }
}

function ListColumn({ frame }: { frame: StageFrameKey }) {
  const rows = [leadRow(frame), ...DEMO_EXISTING]
  return (
    <div className="conv-surface flex flex-col h-full w-[75px] lg:w-[300px] bg-surface-800 border-r border-[0.5px] lg:border-[1px] border-surface-700 flex-shrink-0 overflow-hidden">
      <div className="px-1 lg:px-3 pt-1 lg:pt-2.5">
        <div className="relative">
          <Search className="hidden lg:block absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <div className="w-full h-[7px] lg:h-7 pl-1 lg:pl-8 pr-1 lg:pr-2 rounded-[2px] lg:rounded-sm text-[4.5px] lg:text-xs leading-[7px] lg:leading-7 bg-surface-800 border border-[0.5px] lg:border-[1px] border-[var(--bd2)] text-surface-500">
            Buscar
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden mt-1 lg:mt-1.5">
        {rows.map((c, i) => (
          <StageConvRow
            key={c.id}
            conversation={c}
            active={i === 0}
            humanIsYou
            aiLive={i === 0 && AI_CONTROL.includes(frame)}
            pendingReview={i === 0 && HAS_GUARD.includes(frame) && !HUMAN_TOOK_OVER.includes(frame)}
          />
        ))}
      </div>
    </div>
  )
}

function ChatColumn({ frame }: { frame: StageFrameKey }) {
  const aiInControl = AI_CONTROL.includes(frame)
  const humanReplied = HUMAN_TOOK_OVER.includes(frame)
  const humanStatus = frame === 'final' ? 'read' : 'delivered'
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-surface-900">
      <StageChatHeader name={DEMO_LEAD.name} phone={DEMO_LEAD.phone} aiInControl={aiInControl} />
      <StageHandoffStripe aiInControl={aiInControl} />
      <div className="flex-1 min-h-0 overflow-hidden px-1 py-1 lg:px-5 lg:py-4 flex flex-col justify-end">
        <StageBubble sender={{ kind: 'contact', name: DEMO_LEAD.name }} text={DEMO_MESSAGES.inbound1} time={DEMO_MESSAGES.times.inbound1} />
        {frame !== 'inicio' && (
          <StageBubble sender={{ kind: 'ai' }} text={DEMO_MESSAGES.ai1} time={DEMO_MESSAGES.times.ai1} status="read" delayMs={60} />
        )}
        {HAS_GUARD.includes(frame) && (
          <StageBubble sender={{ kind: 'contact', name: DEMO_LEAD.name }} text={DEMO_MESSAGES.inbound2} time={DEMO_MESSAGES.times.inbound2} delayMs={120} />
        )}
        {HAS_GUARD.includes(frame) && <StageGuardLine label={DEMO_GUARD_LABEL} sub={DEMO_GUARD_SUB} delayMs={180} />}
        {humanReplied && (
          <StageBubble
            sender={{ kind: 'operator', name: `${DEMO_OPERATOR.firstName} ${DEMO_OPERATOR.lastName}` }}
            text={DEMO_MESSAGES.human}
            time={DEMO_MESSAGES.times.human}
            status={humanStatus}
            delayMs={240}
          />
        )}
      </div>
    </div>
  )
}

/** Cena "Conversas" — função PURA do frame (nenhum estado próprio). */
export function InboxScene({ layout, frame }: { layout: StageLayout; frame: StageFrameKey }) {
  if (layout === 'compact') {
    return frame === 'inicio' ? (
      <div className="flex-1 min-w-0 flex items-center justify-center bg-surface-900 text-surface-500">
        <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
      </div>
    ) : (
      <ChatColumn frame={frame} />
    )
  }
  return (
    <>
      <StageRail active="inbox" />
      <ListColumn frame={frame} />
      {frame === 'inicio' ? (
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-2 bg-surface-900 text-surface-500">
          <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
          <p className="text-xs">Selecione uma conversa</p>
        </div>
      ) : (
        <ChatColumn frame={frame} />
      )}
    </>
  )
}
