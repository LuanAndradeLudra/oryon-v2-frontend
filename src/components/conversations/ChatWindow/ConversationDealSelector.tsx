import { useState } from 'react'
import { KanbanSquare, ChevronDown, Check } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { Spinner } from '@/components/ui/Spinner'
import { formatCentsBRL } from '@/lib/resolveOutcome'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { cn } from '@/lib/utils'
import type { Deal, Pipeline } from '@/types'

interface ConversationDealSelectorProps {
  /** Abertos que disputam esta conversa, já ordenados (`selectableDeals`). */
  deals: ReadonlyArray<Deal>
  pipelines: ReadonlyArray<Pipeline>
  /** Vinculado hoje (`originConversationId` = esta conversa), se houver. */
  linkedDealId: string | null
  busy?: boolean
  onPick: (dealId: string) => void
  /** Abre a ficha do negócio (mesmo gesto do chip). */
  onOpenDeal: (dealId: string) => void
}

/**
 * C2 (SCRUM-933) — "Negócio desta conversa ▾" no cabeçalho do chat.
 *
 * Existe só quando o contato tem mais de um negócio ABERTO no mesmo funil
 * (`needsDealSelector`), o que só acontece em funil com `allowMultipleOpen`
 * (C1 · SCRUM-932). Sem multiplicidade o cabeçalho continua exibindo os chips
 * de sempre — esta tela não muda para quem não ligou a multiplicidade.
 *
 * Escolher grava `originConversationId` no negócio (`PATCH
 * /deals/:id/conversation-link`), que é o passo (1) da precedência do backend:
 * a partir daí a IA e o "resolver com desfecho" agem NELE. Enquanto ninguém
 * escolhe, o backend responde `no_target` — ambiguidade não vira palpite.
 */
export function ConversationDealSelector({
  deals, pipelines, linkedDealId, busy = false, onPick, onOpenDeal,
}: ConversationDealSelectorProps) {
  const [open, setOpen] = useState(false)
  const linked = deals.find((d) => d.id === linkedDealId) ?? null

  const describe = (deal: Deal) => {
    const pipe = pipelines.find((p) => p.id === deal.pipelineId) ?? null
    const stage = pipe?.stages.find((s) => s.id === deal.stageId) ?? null
    const isSales = pipe ? pipelineKindOf(pipe) === 'sales' : true
    return {
      pipe,
      stage,
      // Valor só faz sentido em funil de venda — registro de processo não tem valor.
      amount: isSales ? formatCentsBRL(deal.amountCents ?? 0) : null,
      where: [pipe?.name, stage?.label].filter(Boolean).join(' · '),
    }
  }

  return (
    <Dropdown
      open={open}
      onClose={() => setOpen(false)}
      align="left"
      className="w-80"
      anchor={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={busy}
          data-testid="conversation-deal-selector"
          title={linked ? `Negócio desta conversa: ${linked.title}` : 'Escolher o negócio desta conversa'}
          className={cn(
            'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium max-w-[16rem] transition-colors',
            linked
              ? 'border-brand-500/60 bg-brand-500/10 text-brand-300'
              // Sem vínculo o botão precisa PEDIR atenção: enquanto ninguém
              // escolhe, a IA e o "resolver com desfecho" ficam sem alvo.
              : 'border-warning/60 bg-warning/10 text-warning',
          )}
        >
          {busy ? <Spinner className="w-3 h-3 flex-shrink-0" /> : <KanbanSquare className="w-3 h-3 flex-shrink-0" />}
          <span className="truncate">{linked ? linked.title : 'Escolher negócio desta conversa'}</span>
          <ChevronDown className={cn('w-3 h-3 flex-shrink-0 opacity-80', open && 'rotate-180')} />
        </button>
      }
    >
      <div className="px-3 py-2 border-b border-surface-700 text-[10px] font-semibold text-surface-500 uppercase tracking-wide">
        Negócio desta conversa
      </div>
      <div className="py-1 max-h-72 overflow-y-auto" role="menu">
        {deals.map((deal) => {
          const { amount, where } = describe(deal)
          const active = deal.id === linkedDealId
          return (
            <div
              key={deal.id}
              className={cn('flex items-start gap-2 px-3 py-2 transition-colors', active ? 'bg-brand-500/10' : 'hover:bg-surface-700')}
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={active}
                disabled={busy}
                onClick={() => { setOpen(false); if (!active) onPick(deal.id) }}
                data-testid={`conversation-deal-option-${deal.id}`}
                className="flex-1 min-w-0 text-left"
              >
                <span className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-medium truncate', active ? 'text-surface-50' : 'text-surface-200')}>{deal.title}</span>
                  {active && <Check className="w-3 h-3 text-brand-400 flex-shrink-0" aria-label="Vinculado a esta conversa" />}
                </span>
                <span className="block text-[10px] text-surface-500 truncate">
                  {[where, amount].filter(Boolean).join(' · ')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); onOpenDeal(deal.id) }}
                className="text-[10px] text-brand-300 hover:text-brand-200 whitespace-nowrap flex-shrink-0 mt-0.5"
                data-testid={`conversation-deal-open-${deal.id}`}
              >
                abrir
              </button>
            </div>
          )
        })}
      </div>
      <div className="px-3 py-2 border-t border-surface-700 text-[11px] text-surface-500 leading-relaxed">
        {linkedDealId
          ? 'A IA e o “resolver com desfecho” agem neste negócio.'
          : 'Enquanto nenhum for escolhido, a IA não age em nenhum deles.'}
      </div>
    </Dropdown>
  )
}
