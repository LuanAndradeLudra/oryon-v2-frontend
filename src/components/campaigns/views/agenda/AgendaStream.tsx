// ─── Fluxo vertical por dia ────────────────────────────────────────────────
// O `.stream` do mockup: cabeçalho grudento por dia, trilho de horário à
// esquerda com o ponto colorido na linha vertical, e a linha AGORA cortando
// o dia de hoje.
import { Fragment } from 'react'
import type { Campaign } from '@/types'
import { cn } from '@/lib/utils'
import { statusColor } from './agendaStatus'
import { nowLineIndex, type AgendaItem, type DayGroup } from './agendaGrouping'
import { railLabel } from './agendaTime'
import { EventCard } from './cards/EventCard'
import type { SendRate } from './useAgendaCampaigns'
import type { CampaignLifecycle } from './useCampaignLifecycle'

interface AgendaStreamProps {
  groups: DayGroup[]
  now: Date
  rates: Map<string, SendRate>
  lifecycle: CampaignLifecycle
  audienceCounts: Map<string, number>
  lineNameOf: (c: Campaign) => string | undefined
  sendingNowId: string | null
  onRequestCancel: (c: Campaign) => void
  onRequestDelete: (c: Campaign) => void
  onSendNow: (c: Campaign) => void
  registerDayRef: (key: string, el: HTMLDivElement | null) => void
  footer?: React.ReactNode
}

export function AgendaStream({
  groups, now, rates, lifecycle, audienceCounts, lineNameOf, sendingNowId,
  onRequestCancel, onRequestDelete, onSendNow, registerDayRef, footer,
}: AgendaStreamProps) {
  return (
    <div className="px-7 py-[22px] overflow-auto relative min-w-0">
      {groups.map((group) => {
        const nowAt = nowLineIndex(group, now)
        return (
          <div key={group.key} ref={(el) => registerDayRef(group.key, el)}>
            <DayHeader group={group} />
            {group.items.map((item, i) => (
              <Fragment key={item.campaign.id}>
                {nowAt === i && <NowLine now={now} />}
                <EventRow
                  item={item}
                  group={group}
                  now={now}
                  rate={rates.get(item.campaign.id)}
                  lifecycle={lifecycle}
                  audienceCount={audienceCounts.get(item.campaign.id) ?? null}
                  lineName={lineNameOf(item.campaign)}
                  sendingNow={sendingNowId === item.campaign.id}
                  onRequestCancel={onRequestCancel}
                  onRequestDelete={onRequestDelete}
                  onSendNow={onSendNow}
                />
              </Fragment>
            ))}
            {nowAt === group.items.length && <NowLine now={now} />}
          </div>
        )
      })}
      {footer}
    </div>
  )
}

// ── Cabeçalho do dia (`.day`) ──────────────────────────────────────────────

function DayHeader({ group }: { group: DayGroup }) {
  const n = group.items.length
  return (
    <div className="flex items-baseline gap-2.5 mt-[18px] mb-2.5 first:mt-0 sticky -top-[22px] bg-surface-950 py-1.5 z-[1]">
      <h3 className="font-display font-bold text-[18px] text-surface-50 tracking-[-0.02em]">
        {group.label}{' '}
        <small className="text-xs text-surface-500 font-medium ml-1.5 tracking-normal">
          {group.sublabel}
        </small>
      </h3>
      <span className="text-[11px] text-surface-500 ml-auto tabular-nums">
        {n} {n === 1 ? 'disparo' : 'disparos'}
        {/* "· M mensagens" só quando M é medido. Campanha agendada não sabe
            quantos contatos vai atingir antes do envio — somar estimativa com
            número real na mesma frase inventaria precisão. */}
        {group.realMessages !== null && ` · ${group.realMessages.toLocaleString('pt-BR')} mensagens`}
      </span>
    </div>
  )
}

// ── Linha AGORA (`.now`) ───────────────────────────────────────────────────

function NowLine({ now }: { now: Date }) {
  return (
    <div className="grid grid-cols-[56px_18px_1fr] gap-3 items-center my-0.5 mb-3">
      <span className="font-mono text-[11px] text-brand-400 text-right font-semibold tabular-nums">
        {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span aria-hidden="true" />
      <span className="flex items-center gap-2">
        <span className="h-0.5 flex-1 bg-brand-500 rounded-[2px] relative">
          <span className="absolute -left-3.5 -top-[3px] w-2 h-2 rounded-full bg-brand-500" />
        </span>
        <span className="text-[10.5px] text-brand-400 font-bold tracking-[0.08em]">AGORA</span>
      </span>
    </div>
  )
}

// ── Linha do evento (`.evr`) ───────────────────────────────────────────────

function EventRow({
  item, group, now, rate, lifecycle, audienceCount, lineName, sendingNow,
  onRequestCancel, onRequestDelete, onSendNow,
}: {
  item: AgendaItem
  group: DayGroup
  now: Date
  rate?: SendRate
  lifecycle: CampaignLifecycle
  audienceCount: number | null
  lineName?: string
  sendingNow: boolean
  onRequestCancel: (c: Campaign) => void
  onRequestDelete: (c: Campaign) => void
  onSendNow: (c: Campaign) => void
}) {
  const label = railLabel(item, group.bucket, now)
  const color = statusColor(item.campaign.status)
  const live = item.campaign.status === 'sending'

  return (
    <div className="grid grid-cols-[56px_18px_1fr] gap-3 items-stretch">
      <div className="font-mono text-[12.5px] text-surface-300 pt-4 text-right tabular-nums">
        {label.primary}
        <small className="block text-[10px] text-surface-600 mt-0.5">{label.secondary}</small>
      </div>
      <div className="relative" aria-hidden="true">
        <span className="absolute left-2 top-0 bottom-0 w-px bg-surface-800" />
        <span
          className={cn(
            'absolute left-1 top-[19px] w-[9px] h-[9px] rounded-full',
            'shadow-[0_0_0_3px_var(--color-surface-950)]',
            live && 'animate-pulse',
          )}
          style={{ backgroundColor: color }}
        />
      </div>
      <EventCard
        campaign={item.campaign}
        rate={rate}
        lifecycle={lifecycle}
        audienceCount={audienceCount}
        lineName={lineName}
        sendingNow={sendingNow}
        onRequestCancel={onRequestCancel}
        onRequestDelete={onRequestDelete}
        onSendNow={onSendNow}
      />
    </div>
  )
}
