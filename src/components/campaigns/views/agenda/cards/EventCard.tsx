// ─── O cartão do fluxo, um por campanha ────────────────────────────────────
// Mesma moldura, miolo diferente por estado. O que o backend não entrega não
// aparece: sem BE.2 não há Pausar/Retomar/Cancelar; sem motivo de falha o
// cartão de falha fica só com o chip; sem contagem de público a agendada não
// inventa um número.
import { useRef } from 'react'
import {
  BarChart3, MoreHorizontal, Pause, Play, Send, ArrowRight, Trash2, XOctagon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { StackedBar } from '@/components/ui/StackedBar'
import { Button } from '@/components/ui/Button'
import { useContextMenuCtx } from '@/components/ui/contextMenuCore'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import type { Campaign } from '@/types'
import { CampaignStatusChip } from '@/components/campaigns/shared/CampaignStatusChip'
import { CardFrame, CodeTag, MetaSeparator, type CardTone } from './cardChrome'
import { funnelSegments, missingForDraft, sendingProgress, DRAFT_REQUIREMENTS } from '../campaignFacts'
import type { SendRate } from '../useAgendaCampaigns'
import type { CampaignLifecycle } from '../useCampaignLifecycle'

const TONE_BY_STATUS: Record<Campaign['status'], CardTone> = {
  draft: 'draft', scheduled: 'default', sending: 'sending', sent: 'default',
  failed: 'failed', cancelled: 'cancelled', paused: 'paused',
}

const CANCELLABLE = new Set<Campaign['status']>(['draft', 'scheduled', 'sending', 'paused'])

export interface EventCardProps {
  campaign: Campaign
  rate?: SendRate
  lifecycle: CampaignLifecycle
  /** Contagem do público — só existe para o dia selecionado (decisão 3). */
  audienceCount?: number | null
  lineName?: string
  onRequestCancel: (c: Campaign) => void
  onRequestDelete: (c: Campaign) => void
  onSendNow: (c: Campaign) => void
  sendingNow?: boolean
}

export function EventCard({
  campaign, rate, lifecycle, audienceCount, lineName,
  onRequestCancel, onRequestDelete, onSendNow, sendingNow,
}: EventCardProps) {
  const navigate = useNavigate()
  const { open: openMenu } = useContextMenuCtx()
  const kebabRef = useRef<HTMLButtonElement>(null)
  const { status } = campaign

  const goToReport = () => navigate(`/campaigns/${campaign.id}/report`)
  const goToComposer = () => navigate(`/campaigns/${campaign.id}/edit`)

  const menuItems = (): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = []
    if (status !== 'draft') {
      items.push({ label: 'Ver relatório', icon: BarChart3, onClick: goToReport })
    } else {
      items.push({ label: 'Continuar no Composer', icon: ArrowRight, onClick: goToComposer })
    }
    // Cancelar só aparece quando a BE.2 responde. Um item de menu que erra
    // 404 é pior que um item ausente.
    if (lifecycle.available && CANCELLABLE.has(status)) {
      items.push({ separator: true })
      items.push({
        label: 'Cancelar disparo', icon: XOctagon, danger: true,
        onClick: () => onRequestCancel(campaign),
      })
    }
    if (status === 'draft') {
      items.push({ separator: true })
      items.push({
        label: 'Excluir rascunho', icon: Trash2, danger: true,
        onClick: () => onRequestDelete(campaign),
      })
    }
    return items
  }

  const kebab = (
    <button
      ref={kebabRef}
      type="button"
      aria-label={`Mais ações do disparo ${campaign.name}`}
      onClick={() => {
        const r = kebabRef.current?.getBoundingClientRect()
        const items = menuItems()
        if (items.length > 0 && r) openMenu(r.left, r.bottom + 4, items)
      }}
      className="w-7 h-7 rounded-[10px] flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
    >
      <MoreHorizontal className="w-4 h-4" />
    </button>
  )

  return (
    <CardFrame
      tone={TONE_BY_STATUS[status]}
      title={
        <>
          <span className={status === 'draft' ? 'text-surface-300' : undefined}>{campaign.name}</span>
          <CampaignStatusChip status={status} />
        </>
      }
      meta={<CardMeta campaign={campaign} audienceCount={audienceCount} lineName={lineName} />}
      middle={<CardMiddle campaign={campaign} rate={rate} />}
      actions={
        <CardActions
          campaign={campaign} lifecycle={lifecycle} kebab={kebab}
          onSendNow={onSendNow} sendingNow={sendingNow}
          goToReport={goToReport} goToComposer={goToComposer}
        />
      }
    />
  )
}

// ── Linha de identidade (`.es`) ────────────────────────────────────────────

function CardMeta({ campaign, audienceCount, lineName }: {
  campaign: Campaign
  audienceCount?: number | null
  lineName?: string
}) {
  if (campaign.status === 'draft') {
    const missing = missingForDraft(campaign)
    if (missing.length === 0) return <span>Pronto para agendar</span>
    return (
      <>
        <span>Falta:</span>
        {missing.map((m) => <CodeTag key={m}>{m}</CodeTag>)}
      </>
    )
  }

  return (
    <>
      {campaign.templateName && <CodeTag>{campaign.templateName}</CodeTag>}
      {lineName && (<><MetaSeparator />{lineName}</>)}
      {typeof audienceCount === 'number' && (
        <>
          <MetaSeparator />
          <span>{audienceCount.toLocaleString('pt-BR')} contatos</span>
        </>
      )}
    </>
  )
}

// ── Miolo por estado ───────────────────────────────────────────────────────

function CardMiddle({ campaign, rate }: { campaign: Campaign; rate?: SendRate }) {
  const { status } = campaign

  if (status === 'sent') {
    const segments = funnelSegments(campaign)
    if (!segments) return null
    const s = campaign.stats
    return (
      <div>
        <div className="flex justify-between text-[10.5px] mb-1 text-surface-500">
          <span>{(s.sent ?? 0).toLocaleString('pt-BR')} enviadas</span>
          <span className="font-mono tabular-nums">
            {(s.read ?? 0).toLocaleString('pt-BR')} lidas
            {typeof s.replied === 'number' && ` · ${s.replied.toLocaleString('pt-BR')} resp.`}
          </span>
        </div>
        <StackedBar segments={segments} height={6} />
      </div>
    )
  }

  if (status === 'sending' || status === 'paused') {
    const progress = sendingProgress(campaign)
    if (!progress) return null
    const parada = status === 'paused'
    return (
      <div>
        <div className="flex justify-between text-[10.5px] mb-1 text-surface-500">
          <span className="font-mono tabular-nums text-surface-100">
            {progress.sent.toLocaleString('pt-BR')} / {progress.total.toLocaleString('pt-BR')}
          </span>
          {/* Taxa MEDIDA entre dois polls. Some no primeiro tique e quando a
              fila para. Não há tempo restante: taxa é medida, tempo restante
              seria extrapolação com a mesma tipografia de um dado real. */}
          {rate && (
            <span className="font-mono tabular-nums">
              {formatRate(rate.perSecond)} msg/s
            </span>
          )}
          {parada && <span className="text-status-paused">fila parada</span>}
        </div>
        <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
          {/* Barra âmbar e sem transição quando pausada: verde-marca correndo
              é a leitura de "está indo", e uma pausada congelada nesse mesmo
              verde parece uma campanha em curso num quadro travado. */}
          <div
            className={cn(
              'h-full rounded-full',
              parada ? 'bg-status-paused' : 'bg-brand-500 transition-[width] duration-500',
            )}
            style={{ width: `${progress.pct}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress.pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso do disparo ${campaign.name}`}
          />
        </div>
      </div>
    )
  }

  if (status === 'draft') {
    const done = DRAFT_REQUIREMENTS - missingForDraft(campaign).length
    return (
      <div className="max-w-[140px]">
        <div className="h-1.5 rounded-full bg-surface-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-surface-500"
            style={{ width: `${(done / DRAFT_REQUIREMENTS) * 100}%` }}
          />
        </div>
        <div className="text-[10.5px] text-surface-500 mt-1">
          {done} de {DRAFT_REQUIREMENTS} prontos
        </div>
      </div>
    )
  }

  // `failed` não tem miolo: a campanha não guarda motivo de falha e não há
  // rota de reenvio (CONTRATOS §BE.2 não abre `failed → sending`). Um botão
  // que não sabe por que falhou nem consegue trocar de linha seria teatro —
  // `failureReason` + retry ficaram registrados como item de Onda 2
  // (decisão 4 do Maestro).
  return null
}

/**
 * Abaixo de 0,05 msg/s o `toFixed(1)` devolveria `"0,0"` — e 0 msg/s é
 * exatamente o número que este módulo se recusa a mostrar em três outros
 * lugares (`delta <= 0` some, o primeiro tique some). Uma fila lenta (1 a 29
 * mensagens por minuto, que é quando alguém OLHA a taxa) leria "parou" sobre
 * uma campanha que está enviando. `< 0,1` diz devagar sem dizer zero, e
 * continua distinto da ausência, que é o que a tela usa para "não medi".
 */
function formatRate(perSecond: number): string {
  if (perSecond >= 10) return String(Math.round(perSecond))
  if (perSecond < 0.05) return '< 0,1'
  return perSecond.toFixed(1).replace('.', ',')
}

// ── Ações ──────────────────────────────────────────────────────────────────

function CardActions({
  campaign, lifecycle, kebab, onSendNow, sendingNow, goToReport, goToComposer,
}: {
  campaign: Campaign
  lifecycle: CampaignLifecycle
  kebab: React.ReactNode
  onSendNow: (c: Campaign) => void
  sendingNow?: boolean
  goToReport: () => void
  goToComposer: () => void
}) {
  const { status } = campaign
  const busy = lifecycle.busy === campaign.id

  // Cancelada não recebe ação nenhuma — ela está ali para contar o que
  // aconteceu no dia, não para ser operada.
  if (status === 'cancelled') return null

  if (status === 'draft') {
    return (
      <>
        <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={goToComposer}>
          Continuar no Composer
        </Button>
        {kebab}
      </>
    )
  }

  if (status === 'sending') {
    return (
      <>
        {lifecycle.available && (
          <Button
            size="sm" variant="secondary" loading={busy}
            leftIcon={<Pause className="w-3.5 h-3.5" />}
            onClick={() => void lifecycle.run('pause', campaign.id)}
          >
            Pausar
          </Button>
        )}
        {kebab}
      </>
    )
  }

  if (status === 'paused') {
    return (
      <>
        {lifecycle.available && (
          <Button
            size="sm" variant="secondary" loading={busy}
            leftIcon={<Play className="w-3.5 h-3.5" />}
            onClick={() => void lifecycle.run('resume', campaign.id)}
          >
            Retomar
          </Button>
        )}
        {kebab}
      </>
    )
  }

  if (status === 'scheduled') {
    return (
      <>
        <Button
          size="sm" variant="secondary" loading={sendingNow}
          leftIcon={<Send className="w-3.5 h-3.5" />}
          onClick={() => onSendNow(campaign)}
        >
          Enviar agora
        </Button>
        {kebab}
      </>
    )
  }

  if (status === 'sent') {
    return (
      <>
        <Button size="sm" variant="secondary" leftIcon={<BarChart3 className="w-3.5 h-3.5" />} onClick={goToReport}>
          Relatório
        </Button>
        {kebab}
      </>
    )
  }

  // failed — só "Ver detalhes", sem reenviar (decisão 4).
  return (
    <>
      <Button size="sm" variant="secondary" onClick={goToReport}>Ver detalhes</Button>
      {kebab}
    </>
  )
}
