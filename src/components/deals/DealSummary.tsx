import { useState } from 'react'
import { ChevronDown, KanbanSquare, CheckCircle2, XCircle, History, RotateCcw, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { formatRelativeTime, cn } from '@/lib/utils'
import { pipelineKindOption, pipelineKindOf, terminalLabelsOf } from '@/lib/pipelineKinds'
import { originInfo, timeInStage } from '@/lib/dealCard'
import { movedByLabel, moveTargets, stepperFor, type StepperStep } from '@/lib/contactPipelines'
import { formatBRL } from '@/utils/money'
import type { Deal, DealStageHistoryEntry, Pipeline, PipelineStage } from '@/types'

export type DealSummaryDensity = 'chip' | 'row' | 'card'

/**
 * SCRUM-929 (B3) — resumo do negócio em 3 densidades, fonte única de layout
 * para as quatro leituras de "onde este contato está nos funis" que existiam
 * separadas: chips da tabela (`chip`), linha do painel de conversas (`row`),
 * card da ficha e da aba Negócios (`card`).
 *
 * Regras que TODA densidade compartilha (não duplicar em quem chama):
 * - cor/ícone vêm do TIPO do funil (`pipelineKindOf`/`pipelineKindOption`);
 * - valor só aparece em funil de VENDA (`kind === 'sales'`) — processo nunca
 *   mostra R$, nem 0,00;
 * - fechado usa sempre `terminalLabels` do funil (Concluído/Cancelado em
 *   processo, nunca "Ganho/Perdido" fixo).
 *
 * Ações por densidade (Modelo B, prancheta 6-8): `chip` só abre a ficha;
 * `row` ganha "Mover etapa ▾"; `card` ganha "Mover etapa ▾" + "Abrir negócio"
 * e, OPCIONALMENTE (`onEdit`/`onDelete` informados), editar/excluir — a
 * ficha (`ContactPipelinesSection`) usa `card` SEM essas duas, porque editar
 * valor e itens continua exclusivo do `DealModal` (aba Negócios).
 *
 * O verbo "Mover etapa" é deliberado (F-FICHA-08): a situação do CONTATO
 * (ciclo de vida, `contact.stage`) tem sua própria ação — "Mudar situação"
 * (`StageCard`/`ContactPanel`) — com ícone e verbo diferentes, pra não
 * colidir com mover a ETAPA do negócio dentro do funil.
 */

interface ChipProps {
  density: 'chip'
  pipeline: { id: string; name: string; color: string; kind: Pipeline['kind'] } | null
  stageLabel: string | null
  busy?: boolean
  onOpen: () => void | Promise<void>
  testId: string
}

interface OpenDealProps {
  density: 'row' | 'card'
  deal: Deal
  pipeline: Pipeline | undefined
  /** Nome do contato — some o título quando é igual ao do registro de processo (F8). */
  contactName: string
  busy?: boolean
  moveOpen: boolean
  onToggleMove: () => void
  onMove: (stage: PipelineStage) => void
  onOpen: () => void
  /** Card apenas — omitido esconde a ação (a ficha não edita/exclui). */
  onEdit?: () => void
  onDelete?: () => void
  testIdPrefix: string
  testIdKey: string
  /** `card` mostra o stepper de progresso por padrão; desligue se não fizer sentido no contexto. */
  showStepper?: boolean
  /** Tempo na etapa / quem moveu / origem — `false` no tenant legado de funil
   *  único (`DealsTab` sem o flag), onde esse vocabulário não se aplica. */
  showMeta?: boolean
}

interface ClosedDealProps {
  density: 'row' | 'card'
  closed: true
  deal: Deal
  pipeline: Pipeline | undefined
  busy?: boolean
  onReopen: () => void
  history: DealStageHistoryEntry[] | 'loading' | undefined
  onToggleHistory: () => void
  testIdPrefix: string
  testIdKey: string
  /** `false` esconde "Reabrir"/"ver histórico" — tenant legado de funil único
   *  (`DealsTab` sem o flag) não tem funil pra reabrir nem histórico de etapa. */
  showReopenHistory?: boolean
}

export type DealSummaryProps = ChipProps | (OpenDealProps & { closed?: false }) | ClosedDealProps

function Stepper({ steps }: { steps: StepperStep[] }) {
  return (
    <ol className="flex items-center gap-1 flex-wrap" aria-label="Etapas do funil" data-testid="pipeline-stepper">
      {steps.map((s, i) => {
        const done = s.state === 'done' || s.state === 'won' || s.state === 'lost'
        const current = s.state === 'current'
        return (
          <li key={s.id} className="flex items-center gap-1" title={s.label} aria-current={current ? 'step' : undefined}>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap',
                current ? 'ring-2 ring-offset-1 ring-offset-surface-900' : '',
                s.state === 'todo' && 'text-surface-500 border-surface-700',
              )}
              style={done || current
                ? { color: s.color, borderColor: `${s.color}55`, backgroundColor: `${s.color}${current ? '26' : '14'}`, ...(current ? { ['--tw-ring-color' as string]: `${s.color}66` } : {}) }
                : undefined}
              data-state={s.state}
            >
              {s.state === 'won' && <CheckCircle2 className="w-2.5 h-2.5" />}
              {s.state === 'lost' && <XCircle className="w-2.5 h-2.5" />}
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="w-2 h-px bg-surface-700" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

function ChipDensity({ pipeline, stageLabel, busy, onOpen, testId }: ChipProps) {
  if (!pipeline) return null
  const KindIcon = pipelineKindOption(pipeline.kind).icon
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onOpen()}
      title={`${pipeline.name}${stageLabel ? ` · ${stageLabel}` : ''} — abrir negócio`}
      data-testid={testId}
      className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap hover:brightness-110 disabled:opacity-60 transition-all"
      style={{ color: pipeline.color, borderColor: `${pipeline.color}40`, backgroundColor: `${pipeline.color}18` }}
    >
      {busy
        ? <Loader2 className="w-2.5 h-2.5 animate-spin flex-shrink-0" />
        : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />}
      <KindIcon className="w-2.5 h-2.5 opacity-70" aria-label={pipelineKindOption(pipeline.kind).label} />
      {pipeline.name}
      {stageLabel && <span className="opacity-80">· {stageLabel}</span>}
    </button>
  )
}

function OpenDensity(props: OpenDealProps) {
  const { density, deal, pipeline, contactName, busy, moveOpen, onToggleMove, onMove, onOpen, onEdit, onDelete, testIdPrefix, testIdKey, showStepper, showMeta = true } = props
  if (density === 'row' && !pipeline) return null
  const kind = pipelineKindOption(pipelineKindOf(pipeline))
  const KindIcon = kind.icon
  const stage = pipeline?.stages.find((s) => s.id === deal.stageId)
  const targets = pipeline ? moveTargets(pipeline, deal.stageId) : null
  const labels = terminalLabelsOf(pipeline)
  const showsMoney = !pipeline || pipelineKindOf(pipeline) === 'sales'
  const items = deal.lineItems?.length ?? 0
  const title = deal.title?.trim()
  const showsTitle = density === 'card' && !!title && title !== contactName.trim()
  const who = movedByLabel(deal)
  const meta = showMeta
    ? [timeInStage(deal), who ? `movido por ${who}` : null, `origem ${originInfo(deal).label}`].filter(Boolean).join(' · ')
    : ''
  const steps = density === 'card' && showStepper !== false && pipeline ? stepperFor(pipeline, deal) : null

  if (density === 'row') {
    return (
      <article key={deal.id} className="flex flex-col gap-1" data-testid={`${testIdPrefix}-${testIdKey}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline!.color }} />
          <span className="text-xs text-surface-200 truncate">{pipeline!.name}</span>
          <KindIcon className="w-3 h-3 text-surface-500 flex-shrink-0" aria-label={kind.label} />
          {stage && (
            <span className="ml-auto text-[10px] text-surface-300 whitespace-nowrap" data-testid={`${testIdPrefix}-stage-${testIdKey}`}>
              {stage.label}
            </span>
          )}
        </div>
        {meta && <p className="text-[10px] text-surface-600 truncate pl-3.5">{meta}</p>}
        <div className="flex items-center gap-1 pl-3.5">
          {targets && (
            <Dropdown
              open={moveOpen}
              onClose={onToggleMove}
              align="left"
              className="w-52"
              anchor={
                <button
                  type="button"
                  onClick={onToggleMove}
                  disabled={busy}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium bg-surface-800 border border-surface-700 text-surface-200 hover:bg-surface-700 disabled:opacity-50 transition-colors"
                  data-testid={`${testIdPrefix}-move-${testIdKey}`}
                  aria-haspopup="menu"
                  aria-expanded={moveOpen}
                >
                  Mover etapa <ChevronDown className="w-2.5 h-2.5" />
                </button>
              }
            >
              <div className="px-1 py-1 flex flex-col gap-0.5">
                {targets.normal.map((s) => (
                  <DropdownItem key={s.id} onClick={() => onMove(s)}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </DropdownItem>
                ))}
                {targets.normal.length > 0 && targets.terminal.length > 0 && <DropdownSeparator />}
                {targets.terminal.map((s) => (
                  <DropdownItem key={s.id} onClick={() => onMove(s)} danger={s.isLost}>
                    {s.isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {s.isWon ? labels.won : labels.lost} (com motivo)
                  </DropdownItem>
                ))}
              </div>
            </Dropdown>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
            data-testid={`${testIdPrefix}-board-${testIdKey}`}
          >
            <KanbanSquare className="w-3 h-3" /> Abrir
          </button>
        </div>
      </article>
    )
  }

  // density === 'card'
  return (
    <article
      key={deal.id}
      className="bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 flex flex-col gap-2"
      data-testid={`${testIdPrefix}-open-${testIdKey}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {pipeline && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />}
        <span className="text-sm font-medium text-surface-100 truncate">
          {pipeline?.name ?? title ?? contactName}
        </span>
        {pipeline && <KindIcon className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" aria-label={kind.label} />}
        {stage && (
          <span className="ml-auto text-[11px] text-surface-300 whitespace-nowrap" data-testid={`${testIdPrefix}-stage-${testIdKey}`}>
            {stage.label}
          </span>
        )}
      </div>

      {steps && steps.length > 0 && <Stepper steps={steps} />}

      {showsTitle && <p className="text-xs text-surface-300 truncate">{title}</p>}

      {showsMoney && (
        <p className="text-[11px] text-surface-400 tabular-nums" data-testid={`${testIdPrefix}-money-${testIdKey}`}>
          {formatBRL(deal.amountCents)}
          {items ? ` · ${items} ${items === 1 ? 'item' : 'itens'}` : ''}
        </p>
      )}

      {meta && <p className="text-[11px] text-surface-500 truncate" data-testid={`${testIdPrefix}-meta-${testIdKey}`}>{meta}</p>}

      <div className="flex items-center gap-1.5">
        {pipeline && targets && (
          <Dropdown
            open={moveOpen}
            onClose={onToggleMove}
            align="left"
            className="w-56"
            anchor={
              <button
                type="button"
                onClick={onToggleMove}
                disabled={busy}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-200 hover:bg-surface-700 disabled:opacity-50 transition-colors"
                data-testid={`${testIdPrefix}-move-${testIdKey}`}
                aria-haspopup="menu"
                aria-expanded={moveOpen}
              >
                Mover etapa <ChevronDown className="w-3 h-3" />
              </button>
            }
          >
            <div className="px-1 py-1 flex flex-col gap-0.5">
              {targets.normal.map((s) => (
                <DropdownItem key={s.id} onClick={() => onMove(s)}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </DropdownItem>
              ))}
              {targets.normal.length > 0 && targets.terminal.length > 0 && <DropdownSeparator />}
              {targets.terminal.map((s) => (
                <DropdownItem key={s.id} onClick={() => onMove(s)} danger={s.isLost}>
                  {s.isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {s.isWon ? labels.won : labels.lost} (com motivo)
                </DropdownItem>
              ))}
            </div>
          </Dropdown>
        )}
        {pipeline && (
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
            data-testid={`${testIdPrefix}-board-${testIdKey}`}
          >
            <KanbanSquare className="w-3.5 h-3.5" /> Abrir negócio
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            title={`Editar ${kind.noun}`}
            className="ml-auto p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
            data-testid={`${testIdPrefix}-edit-${testIdKey}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title={`Excluir ${kind.noun}`}
            className={cn('p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all', !onEdit && 'ml-auto')}
            data-testid={`${testIdPrefix}-delete-${testIdKey}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </article>
  )
}

function ClosedDensity({ density, deal, pipeline, busy, onReopen, history, onToggleHistory, testIdPrefix, testIdKey, showReopenHistory = true }: ClosedDealProps) {
  const stage = pipeline?.stages.find((s) => s.id === deal.stageId)
  const won = deal.status === 'won'
  const labels = terminalLabelsOf(pipeline)
  const reasonLabel = pipeline?.closeReasons?.find((r) => r.key === deal.closeReason)?.label ?? deal.closeReason ?? null
  const card = density === 'card'
  const rowText = card ? 'text-[11px]' : 'text-[10px]'
  const actionIcon = card ? 'w-3 h-3' : 'w-2.5 h-2.5'
  return (
    <div className="flex flex-col gap-1">
      <div className={cn('flex items-center gap-1.5 min-w-0', rowText, card ? 'text-surface-400' : 'text-surface-500')}>
        {won
          ? <CheckCircle2 className={cn(card ? 'w-3 h-3' : 'w-3 h-3', 'text-status-active flex-shrink-0')} />
          : <XCircle className={cn(card ? 'w-3 h-3' : 'w-3 h-3', card ? 'text-surface-500' : 'text-surface-600', 'flex-shrink-0')} />}
        <span className="truncate">
          <span className={card ? 'text-surface-300' : 'text-surface-400'}>{pipeline?.name ?? deal.title ?? 'Funil'}</span>
          {' · '}{stage?.label ?? (won ? labels.won : labels.lost)}
          {deal.closedAt && <> · {formatRelativeTime(deal.closedAt)}</>}
          {reasonLabel && <> · {reasonLabel}</>}
        </span>
        {/* A4 (SCRUM-926): reabrir mora na linha do fechado — 5 s de "Desfazer" já passados.
            Sem funil no cache (tenant legado) não há pra onde reabrir nem histórico de etapa. */}
        {showReopenHistory && (
          <button
            type="button"
            onClick={onReopen}
            disabled={busy}
            className={cn('ml-auto inline-flex items-center gap-1 text-surface-300 hover:text-surface-100 disabled:opacity-50 whitespace-nowrap', rowText)}
            data-testid={`${testIdPrefix}-reopen-${testIdKey}`}
          >
            <RotateCcw className={actionIcon} /> Reabrir
          </button>
        )}
        {showReopenHistory && (
          <button
            type="button"
            onClick={onToggleHistory}
            className={cn('inline-flex items-center gap-1 text-brand-300 hover:text-brand-200 whitespace-nowrap', rowText)}
            data-testid={`${testIdPrefix}-history-${testIdKey}`}
          >
            <History className={actionIcon} /> {history && history !== 'loading' ? 'ocultar' : (card ? 'ver histórico' : 'histórico')}
          </button>
        )}
      </div>
      {history === 'loading' && <p className="text-[11px] text-surface-600 pl-4">Carregando…</p>}
      {Array.isArray(history) && (
        <ol className="pl-4 flex flex-col gap-0.5" data-testid={`${testIdPrefix}-history-list-${testIdKey}`}>
          {history.length === 0 && <li className="text-[11px] text-surface-600">Sem passagens registradas.</li>}
          {history.map((e) => (
            <li key={e.id} className="text-[11px] text-surface-500">
              {e.fromStageLabel ? `${e.fromStageLabel} → ` : 'entrou em '}<span className="text-surface-300">{e.toStageLabel ?? '?'}</span>
              {' · '}{movedByLabel({ lastMovedByKind: e.movedByKind, lastMovedByActorName: e.movedByActorName }) ?? 'sistema'}
              {' · '}{formatRelativeTime(e.createdAt)}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function DealSummary(props: DealSummaryProps) {
  if (props.density === 'chip') return <ChipDensity {...props} />
  if ('closed' in props && props.closed) return <ClosedDensity {...props} />
  return <OpenDensity {...(props as OpenDealProps)} />
}

/** Estado do dropdown "Mover etapa ▾" — um aberto por vez, por id de negócio.
 *  Extraído das 3 cópias idênticas de `useState<string | null>` que existiam
 *  em `DealsTab`/`ContactPipelinesSection`/`ContactPanelDeals`. */
export function useDealSummaryMove() {
  const [moveOpenFor, setMoveOpenFor] = useState<string | null>(null)
  return {
    isOpen: (id: string) => moveOpenFor === id,
    toggle: (id: string) => setMoveOpenFor((v) => (v === id ? null : id)),
    close: () => setMoveOpenFor(null),
  }
}
