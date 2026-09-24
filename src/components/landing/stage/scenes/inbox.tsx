import { MessageSquare, Search } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { TypingIndicator } from '@/components/conversations/ChatWindow/TypingIndicator'
import { StageConvRow } from '../primitives/StageConvRow'
import { StageRail } from '../primitives/StageRail'
import { StageChatHeader, StageHandoffStripe } from '../primitives/StageChatHeader'
import { StageBubble, StageGuardLine } from '../primitives/StageBubble'
import { StageEnter } from '../StageMotion'
import {
  DEMO_EXISTING, DEMO_GUARD_LABEL, DEMO_GUARD_SUB, DEMO_LEAD, DEMO_MESSAGES, DEMO_OPERATOR,
} from '../demoData'
import type { StageLayout } from '../types'
import { STEP, leadRow, typedHuman } from './inboxScript'

function ListColumn({ step }: { step: number }) {
  const hasLead = step >= STEP.newRow
  const chatOpen = step >= STEP.chatOpen
  const rows = hasLead ? [leadRow(step), ...DEMO_EXISTING] : DEMO_EXISTING
  const open = rows.length
  return (
    <div className="conv-surface flex flex-col h-full w-[300px] bg-surface-800 border-r border-surface-700 flex-shrink-0 overflow-hidden">
      <div className="px-3 pt-2.5 pb-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <div className="w-full h-7 pl-8 pr-2 rounded-sm text-xs leading-7 bg-surface-800 border border-[var(--bd2)] text-surface-500">
            Buscar conversas
          </div>
        </div>
      </div>
      <div className="border-b border-surface-700 px-3 pt-1">
        <Tabs
          label="Filtro da lista (demonstração)"
          value="open"
          onChange={() => {}}
          tabs={[
            { id: 'open', label: 'Abertas', count: open },
            { id: 'pending', label: 'Pendentes', count: step >= STEP.guard ? 1 : 0 },
          ]}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {rows.map((c) => {
          const isLead = c.id === DEMO_LEAD.id
          return isLead ? (
            <StageEnter key={c.id} from="left">
              <StageConvRow
                conversation={c}
                active={chatOpen}
                humanIsYou
                pendingReview={step >= STEP.guard && step < STEP.human}
              />
            </StageEnter>
          ) : (
            <StageConvRow key={c.id} conversation={c} />
          )
        })}
      </div>
    </div>
  )
}

function ChatColumn({ step, pressed }: { step: number; pressed: boolean }) {
  if (step < STEP.chatOpen) {
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-2 bg-surface-900 text-surface-500">
        <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
        <p className="text-xs">Selecione uma conversa</p>
      </div>
    )
  }
  const aiInControl = step < STEP.human
  const typed = step >= STEP.typeFirst ? typedHuman(step) : null
  const humanStatus = step >= STEP.read ? 'read' : step >= STEP.delivered ? 'delivered' : 'sent'
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-surface-900">
      <StageChatHeader name={DEMO_LEAD.name} phone={DEMO_LEAD.phone} aiInControl={aiInControl} pressed={pressed} />
      <StageHandoffStripe aiInControl={aiInControl} />
      <div className="flex-1 min-h-0 overflow-hidden px-5 py-4 flex flex-col justify-end">
        <StageBubble sender={{ kind: 'contact', name: DEMO_LEAD.name }} text={DEMO_MESSAGES.inbound1} time={DEMO_MESSAGES.times.inbound1} gap="mt-3" />
        {step === STEP.typing && (
          <StageEnter>
            <TypingIndicator />
          </StageEnter>
        )}
        {step >= STEP.ai && (
          <StageBubble sender={{ kind: 'ai' }} text={DEMO_MESSAGES.ai1} time={DEMO_MESSAGES.times.ai1} status="read" />
        )}
        {step >= STEP.inbound2 && (
          <StageBubble sender={{ kind: 'contact', name: DEMO_LEAD.name }} text={DEMO_MESSAGES.inbound2} time={DEMO_MESSAGES.times.inbound2} />
        )}
        {step >= STEP.guard && <StageGuardLine label={DEMO_GUARD_LABEL} sub={DEMO_GUARD_SUB} />}
        {typed && (
          <StageBubble
            sender={{ kind: 'operator', name: `${DEMO_OPERATOR.firstName} ${DEMO_OPERATOR.lastName}` }}
            text={typed.shown}
            ghost={typed.ghost}
            time={DEMO_MESSAGES.times.human}
            status={humanStatus}
          />
        )}
      </div>
    </div>
  )
}

/** Cena "Conversas" — função PURA do passo (ver `inboxScript.ts` para o roteiro). */
export function InboxScene({ step, layout }: { step: number; layout: StageLayout }) {
  const pressed = step === STEP.press
  if (layout === 'compact') return <ChatColumn step={Math.max(step, STEP.chatOpen)} pressed={pressed} />
  return (
    <>
      <StageRail active="inbox" />
      <ListColumn step={step} />
      <ChatColumn step={step} pressed={pressed} />
    </>
  )
}
