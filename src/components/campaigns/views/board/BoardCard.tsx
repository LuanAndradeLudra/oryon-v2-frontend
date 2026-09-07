// ─── O cartão do quadro (`.bcard`) ─────────────────────────────────────────
// NÃO é o `EventCard` com outra classe. O `.evc` da Agenda é um grid de três
// colunas (identidade / miolo / ações) numa linha larga, 18px de raio, título
// 15,4 e ações à direita; o `.bcard` é uma pilha vertical de 14px de raio,
// título 13,2, meta 11 e ações numa linha de rodapé de 10,5 — e traz o relógio
// dentro, porque no quadro não há trilho. Uma prop `dense` no `cardChrome`
// trocaria a linha de `grid-cols` e deixaria as outras cinco divergências.
//
// O que se reusa é a LÓGICA, que já existe e é a mesma nas duas telas:
// `campaignFacts` (funil, progresso, taxa, o que falta no rascunho),
// `agendaTime.relativeToNow` e o `STATUS_CONFIG`.
//
// Sem kebab, como no mockup: a linha de rodapé tem UMA ação. Cancelar e
// excluir continuam na Agenda e na Lista — o quadro é uma das três vistas do
// mesmo dado, não precisa carregar todas as ações.
import { ArrowRight, BarChart3, Clock, Pause, Play, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { StackedBar } from '@/components/ui/StackedBar'
import type { Campaign } from '@/types'
import { CampaignStatusChip } from '@/components/campaigns/shared/CampaignStatusChip'
import { statusColor } from '../agenda/agendaStatus'
import { relativeToNow } from '../agenda/agendaTime'
import {
  deliveryRates, formatRate, funnelSegments, missingForDraft, sendingProgress,
  DRAFT_REQUIREMENTS,
} from '../agenda/campaignFacts'
import type { SendRate } from '../agenda/useAgendaCampaigns'
import { PAUSE_SEM_VOLTA, type CampaignLifecycle } from '../agenda/useCampaignLifecycle'
import { boardWhen, whenOf } from './boardTime'

/**
 * A moldura por status. `paused` fica na mesma coluna de `sending` e por isso
 * precisa se separar dentro dela: âmbar próprio MAIS tracejado, porque no tema
 * claro os dois âmbares ficam a 1,35:1 um do outro e forma separa onde
 * luminância não separa (mesma razão do #136).
 */
const TONE: Record<Campaign['status'], string> = {
  draft:     'border-surface-700 border-dashed bg-surface-800/60',
  scheduled: 'border-status-open/35 bg-surface-800',
  sending:   'border-status-pending/45 bg-surface-800',
  paused:    'border-status-paused/55 border-dashed bg-surface-800',
  sent:      'border-surface-700 bg-surface-800',
  failed:    'border-danger/40 bg-surface-800',
  cancelled: 'border-surface-800 bg-surface-800/60 opacity-55',
}

export interface BoardCardProps {
  campaign: Campaign
  now: Date
  rate?: SendRate
  lifecycle: CampaignLifecycle
  /** Nome de quem criou o rascunho; some quando não resolve. */
  authorName?: string
  lineName?: string
  onSendNow: (c: Campaign) => void
  sendingNow?: boolean
  /**
   * O chip de status aparece SÓ nas colunas que juntam mais de um status
   * (Enviando + Pausada, Falhou + Cancelada). Nas outras três a coluna já é o
   * status, e repeti-lo em cada cartão seria ruído — é por isso que o mockup
   * não desenha chip nenhum. Onde a coluna mistura, o chip é o que diz qual
   * dos dois é, e a distinção não pode depender só da borda.
   */
  showChip?: boolean
}

export function BoardCard(props: BoardCardProps) {
  const { campaign, now } = props
  const { status } = campaign
  const at = whenOf(campaign)

  return (
    <div className={cn(
      'rounded-[14px] border p-3 flex flex-col gap-2 transition-colors',
      TONE[status],
      status !== 'cancelled' && 'hover:border-surface-600',
    )}>
      <div className="text-xs font-semibold text-surface-100 leading-[1.3] flex items-start justify-between gap-2">
        <span className="min-w-0">{campaign.name}</span>
        {props.showChip && <CampaignStatusChip status={status} />}
      </div>

      <Meta campaign={campaign} at={at} now={now} />
      <Body {...props} at={at} />
      <Footer {...props} at={at} />
    </div>
  )
}

/** `.bcard .bm` — a segunda linha, que muda de assunto por status. */
function Meta({ campaign, at, now }: { campaign: Campaign; at: Date | null; now: Date }) {
  const { status } = campaign

  // Rascunho fala do que falta, não de quando: ele não tem quando.
  if (status === 'draft') {
    const missing = missingForDraft(campaign)
    return (
      <div className="text-2xs text-surface-400 flex gap-1.5 items-center flex-wrap">
        {missing.length === 0 ? <span>Pronto para agendar</span> : (
          <>
            <span>Falta:</span>
            {missing.map((m) => <BoardCode key={m}>{m}</BoardCode>)}
          </>
        )}
      </div>
    )
  }

  // A partir daqui a meta é `template · quando`. A contagem de público do
  // mockup (`310 contatos`) NÃO entra: ela é uma chamada de rede POR CAMPANHA,
  // e o quadro mostra a janela inteira — seriam centenas de chamadas para uma
  // linha de texto. Na Agenda ela existe só para o dia selecionado.
  return (
    <div className="text-2xs text-surface-400 flex gap-1.5 items-center flex-wrap">
      {campaign.templateName && <BoardCode>{campaign.templateName}</BoardCode>}
      {at && (
        <>
          {campaign.templateName && <span aria-hidden="true" className="text-surface-600">·</span>}
          <span>{boardWhen(at, now)}</span>
        </>
      )}
    </div>
  )
}

/** O miolo, um por coluna. */
function Body({ campaign, at, now, rate }: BoardCardProps & { at: Date | null }) {
  const { status } = campaign

  if (status === 'draft') {
    const done = DRAFT_REQUIREMENTS - missingForDraft(campaign).length
    return (
      <div className="h-1 rounded-full bg-surface-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-surface-500"
          style={{ width: `${(done / DRAFT_REQUIREMENTS) * 100}%` }}
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={DRAFT_REQUIREMENTS}
          aria-label={`Preenchido: ${done} de ${DRAFT_REQUIREMENTS}`}
        />
      </div>
    )
  }

  if (status === 'scheduled' && at) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-[6px] bg-surface-800 border border-surface-700 flex-shrink-0"
          style={{ color: statusColor('scheduled') }}
        >
          <Clock className="w-3 h-3" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-surface-100">{boardWhen(at, now)}</div>
          {at > now && (
            <div className="text-3xs text-surface-500">{relativeToNow(at, now)}</div>
          )}
        </div>
      </div>
    )
  }

  // `failed` e `cancelled` entram aqui pelo mesmo motivo que o C1 do #136:
  // sem o contador, "não saiu nada" e "3.367 pessoas já receberam" renderizam
  // IGUAIS, e quem lê conclui que pode recriar — as 3.367 recebem duas vezes.
  // Vale para a cancelada tanto quanto para a que falhou: uma campanha
  // cancelada NO MEIO DO ENVIO já entregou parte, que é o argumento que deu
  // nome a esta coluna. `sendingProgress` já discrimina sozinho os dois casos
  // (devolve `null` quando `total <= 0`, que é o que `markFailed()` grava),
  // então o pré-voo continua sem miolo e só a parcial ganha a barra.
  if (status === 'sending' || status === 'paused' || status === 'failed' || status === 'cancelled') {
    const progress = sendingProgress(campaign)
    if (!progress) return null
    const parada = status === 'paused'
    const parou = status === 'failed' || status === 'cancelled'
    const rates = deliveryRates(campaign)
    return (
      <div className="flex flex-col gap-1.5">
        <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
          {/* Barra âmbar e sem transição quando pausada: verde-marca correndo é
              a leitura de "está indo", e uma pausada congelada nesse verde
              pareceria uma campanha em curso num quadro travado. */}
          <div
            className={cn(
              'h-full rounded-full',
              // A faixa cheia é o que REALMENTE foi entregue, então continua
              // verde-marca também na que parou — pintá-la de vermelho negaria
              // entregas que aconteceram. O que muda é a transição: só uma fila
              // em movimento anima.
              parada ? 'bg-status-paused'
                : parou ? 'bg-linear-90 from-brand-600 to-brand-400'
                : 'bg-linear-90 from-brand-600 to-brand-400 transition-[width] duration-500',
            )}
            style={{ width: `${progress.pct}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress.pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso do disparo ${campaign.name}`}
          />
        </div>
        <div className="flex justify-between items-center text-xs">
          <b className="font-mono tabular-nums font-semibold text-surface-100">
            {progress.sent.toLocaleString('pt-BR')} / {progress.total.toLocaleString('pt-BR')}
          </b>
          {/* Sem "~4 min restantes": a taxa é MEDIDA entre dois polls, e tempo
              restante seria extrapolação com a tipografia de um dado real. */}
          {parada && <span className="text-status-paused">fila parada</span>}
          {parou && <span className="text-danger">parou aqui</span>}
          {!parada && !parou && rate && (
            <span className="text-surface-500 font-mono tabular-nums">{formatRate(rate.perSecond)} msg/s</span>
          )}
        </div>
        {rates && (
          <div className="flex justify-between text-3xs text-surface-400">
            <span>Entregues <b className="text-status-active">{pct(rates.delivered)}</b></span>
            <span>Lidas <b className="text-accent-violet">{pct(rates.read)}</b></span>
          </div>
        )}
      </div>
    )
  }

  if (status === 'sent') {
    const segments = funnelSegments(campaign)
    return segments ? <StackedBar segments={segments} height={6} /> : null
  }

  return null
}

/** `.bcard .bf` — linha de rodapé: contexto à esquerda, UMA ação à direita. */
function Footer({
  campaign, lifecycle, authorName, lineName, onSendNow, sendingNow, at, now,
}: BoardCardProps & { at: Date | null }) {
  const navigate = useNavigate()
  const { status } = campaign
  const busy = lifecycle.busy === campaign.id

  const left = status === 'draft'
    ? [authorName, at ? boardWhen(at, now) : null].filter(Boolean).join(' · ')
    : status === 'sent'
      ? readLabel(campaign)
      : lineName

  return (
    <div className="flex justify-between items-center gap-2 text-[10.5px] text-surface-500 mt-0.5">
      <span className="truncate">{left}</span>
      <Action
        campaign={campaign} lifecycle={lifecycle} busy={busy}
        onSendNow={onSendNow} sendingNow={sendingNow} navigate={navigate}
      />
    </div>
  )
}

function Action({ campaign, lifecycle, busy, onSendNow, sendingNow, navigate }: {
  campaign: Campaign
  lifecycle: CampaignLifecycle
  busy: boolean
  onSendNow: (c: Campaign) => void
  sendingNow?: boolean
  navigate: ReturnType<typeof useNavigate>
}) {
  const { status } = campaign

  // Cancelada não recebe ação: ela está no quadro para contar que existiu.
  if (status === 'cancelled') return null

  if (status === 'draft') {
    return (
      <CardAction onClick={() => navigate(`/campaigns/${campaign.id}/edit`)} accent>
        Continuar <ArrowRight className="w-3 h-3" aria-hidden="true" />
      </CardAction>
    )
  }

  if (status === 'scheduled') {
    return (
      <CardAction onClick={() => onSendNow(campaign)} disabled={sendingNow}>
        <Send className="w-3 h-3" aria-hidden="true" /> Enviar agora
      </CardAction>
    )
  }

  // Cada cartão pergunta pela SUA capacidade, não por uma bandeira comum: no
  // backend do 992 `pause` existe (`campaigns.controller.ts:143`) e `resume`
  // não (`:150`, só o comentário). Um botão que erra 404 é pior que um ausente,
  // e uma bandeira única faria a ausência de um esconder o outro.
  if (status === 'sending' || status === 'paused') {
    const retomar = status === 'paused'
    if (!lifecycle.can(retomar ? 'resume' : 'pause')) return null
    return (
      <CardAction
        onClick={() => void lifecycle.run(retomar ? 'resume' : 'pause', campaign.id)}
        disabled={busy}
        // Mesma frase da Agenda, da mesma constante: o preço de pausar não pode
        // ser dito de dois jeitos em duas telas do mesmo dado.
        title={retomar || lifecycle.can('resume') ? undefined : PAUSE_SEM_VOLTA}
      >
        {retomar
          ? <><Play className="w-3 h-3" aria-hidden="true" /> Retomar</>
          : <><Pause className="w-3 h-3" aria-hidden="true" /> Pausar</>}
      </CardAction>
    )
  }

  if (status === 'sent' || status === 'failed') {
    return (
      <CardAction onClick={() => navigate(`/campaigns/${campaign.id}/report`)}>
        <BarChart3 className="w-3 h-3" aria-hidden="true" />
        {status === 'sent' ? 'Relatório' : 'Ver detalhes'}
      </CardAction>
    )
  }

  return null
}

function CardAction({ children, onClick, disabled, accent, title }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  accent?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center gap-1 flex-shrink-0 rounded-[6px] px-1.5 py-0.5 -mr-1.5',
        'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        accent ? 'text-brand-400 hover:text-brand-300' : 'text-surface-400 hover:text-surface-100',
        'hover:bg-surface-700',
      )}
    >
      {children}
    </button>
  )
}

/** `<code>` do `.bcard`, meio ponto menor que o da Agenda (10,5 contra 11). */
function BoardCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[10.5px] bg-surface-700 px-1.5 py-px rounded text-surface-200">
      {children}
    </code>
  )
}

function readLabel(c: Campaign): string {
  const read = c.stats?.read ?? 0
  const replied = c.stats?.replied
  const base = `${read.toLocaleString('pt-BR')} lidas`
  return typeof replied === 'number' ? `${base} · ${replied.toLocaleString('pt-BR')} resp.` : base
}

function pct(v: number): string {
  return `${v.toFixed(1).replace('.', ',')}%`
}
