// ─── BlockEnvio ────────────────────────────────────────────────────────────
// Conteúdo do bloco "Envio" — mockup `p3-disparos.html` §D2, CSS `.g2/.lbl/
// .seg/.inp/.att/.opt` em `p1-head.html` e `p1b-extra.html`.
//
// Funde quatro coisas que hoje moram em três lugares diferentes
// (coord/D2-plano.md §3):
//   1. o "Quando" do `steps/Step4Agendar.tsx`;
//   2. o seletor de linha, que hoje é um callout FORA do wizard, no topo do
//      modal — no mockup ele é uma coluna dentro deste bloco;
//   3. "Recorrente" (BE.4), que fica OCULTA enquanto o endpoint não existir
//      — não desabilitada com "Em breve" (§8: controle desabilitado anuncia
//      capacidade que o produto não tem);
//   4. a duração estimada, que é conta local (contagem × throughput fixo do
//      processor), sem API.
import { Calendar, Gauge, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { WhatsAppNumber } from '@/types'
import type { WhatsAppNumberUsage } from '@/types/campaignsV2'
import { THROUGHPUT_PER_SECOND, formatDuration } from './summaries'


export type ScheduleMode = 'now' | 'later'

const WHEN_OPTIONS: { value: ScheduleMode; label: string }[] = [
  { value: 'now',   label: 'Agora' },
  { value: 'later', label: 'Agendar' },
]

/** Insight de melhor horário (BE.1 `readHeatmap`). `null` quando o tenant não
 *  tem histórico compatível — aí a caixa simplesmente não é renderizada, que
 *  é o combinado do §3 (não é bloqueador da D2). */
export interface BestHourInsight {
  title: string
  detail: string
}

interface BlockEnvioProps {
  scheduleMode: ScheduleMode
  onScheduleMode: (m: ScheduleMode) => void
  scheduledAt: string
  onScheduledAt: (v: string) => void
  lines: WhatsAppNumber[]
  whatsappNumberId: string | null
  onLineChange: (id: string) => void
  /** Uso/qualidade por linha (BE.5). `null` = endpoint não implantado: some a
   *  cota, e a linha mostra só nome e telefone. */
  usageByLine: Record<string, WhatsAppNumberUsage> | null

  /** Elegíveis do público, para a duração. `null` = ainda não sei. */
  audienceCount: number | null
  bestHour?: BestHourInsight | null
}

export function BlockEnvio({
  scheduleMode, onScheduleMode, scheduledAt, onScheduledAt,
  lines, whatsappNumberId, onLineChange, usageByLine,
  audienceCount, bestHour = null,
}: BlockEnvioProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5">
      {/* ── Quando ─────────────────────────────────────────────────────── */}
      <div>
        <span className="block text-[13.2px] font-medium text-surface-300 mb-1.5">Quando</span>
        <div className="mb-2.5">
          {/* Só duas opções: "Recorrente" (BE.4) fica OCULTA enquanto o
              endpoint não existir, e entra na história que o ligar — §8 do
              D2-plano. Uma 3ª opção aqui hoje só poderia produzir um valor
              que ninguém sabe tratar. */}
          <SegmentedControl
            options={WHEN_OPTIONS}
            value={scheduleMode}
            onChange={onScheduleMode}
            size="sm"
            label="Quando enviar"
          />
        </div>

        {scheduleMode === 'later' && (
          // Um `datetime-local` em vez dos dois campos separados do mockup
          // (data e hora): é um controle nativo só, com teclado e leitor de
          // tela funcionando de graça. Dois campos falsos ficariam iguais na
          // captura e piores no uso.
          <div className="flex items-center gap-2 w-full bg-surface-800 border border-surface-700 rounded-[8px] px-3 py-2 focus-within:border-brand-500 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" aria-hidden />
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => onScheduledAt(e.target.value)}
              aria-label="Data e hora do envio"
              min={localNowForInput()}
              className="flex-1 bg-transparent text-[15.4px] text-surface-100 focus:outline-none"
            />
          </div>
        )}

        {bestHour && (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-surface-700 px-3.5 py-3 mt-2.5">
            <span className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 bg-brand-cta/14 text-brand-cta">
              <Gauge className="w-3.75 h-3.75" aria-hidden />
            </span>
            <div>
              <p className="text-[13.2px] font-semibold text-surface-100">{bestHour.title}</p>
              <p className="text-xs text-surface-400 mt-0.5 leading-[1.45]">{bestHour.detail}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Linha ──────────────────────────────────────────────────────── */}
      <div>
        <span className="block text-[13.2px] font-medium text-surface-300 mb-1.5" id="composer-linha">Linha</span>
        <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="composer-linha">
          {lines.map((line) => (
            <LineOption
              key={line.id}
              line={line}
              usage={usageByLine?.[line.id] ?? null}
              selected={whatsappNumberId === line.id}
              onSelect={() => onLineChange(line.id)}
            />
          ))}
          {lines.length === 0 && (
            <p className="text-xs text-surface-500">
              Nenhuma linha do WhatsApp conectada. Conecte uma em Configurações → WhatsApp.
            </p>
          )}
        </div>

        {audienceCount !== null && audienceCount > 0 && (
          <p className="flex items-center gap-2 text-xs text-surface-400 mt-2.5">
            <Gauge className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            {audienceCount.toLocaleString('pt-BR')} msgs a ~{THROUGHPUT_PER_SECOND}/s →{' '}
            <b className="text-surface-200">{formatDuration(audienceCount)}</b> de envio
          </p>
        )}
      </div>
    </div>
  )
}

/** Uma linha do WhatsApp — `.opt` do mockup. Hand-rolled e não
 *  `ui/RadioOptionList`: aquele primitivo aceita só `{id, label}` string, e
 *  aqui cada linha carrega ícone, telefone, qualidade e cota. */
function LineOption({
  line, usage, selected, onSelect,
}: {
  line: WhatsAppNumber
  usage: WhatsAppNumberUsage | null
  selected: boolean
  onSelect: () => void
}) {
  // `isActive === false` é linha desconectada: o mockup a mostra apagada e
  // com chip "offline", e ela não pode ser escolhida.
  const offline = line.isActive === false
  const quality = usage ? QUALITY[usage.qualityRating] ?? null : null

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={offline}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors',
        selected
          ? 'border-brand-500 bg-brand-500/6 ring-1 ring-brand-500/35'
          : 'border-surface-700 bg-surface-800 hover:border-surface-600',
        offline && 'opacity-55 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0',
          selected ? 'bg-brand-cta/14 text-brand-cta' : 'bg-surface-700 text-surface-300',
        )}
      >
        <MessageCircle className="w-4.5 h-4.5" aria-hidden />
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-[15.4px] font-semibold text-surface-100 truncate">
          {line.label || line.displayPhoneNumber}
        </span>
        <span className="block text-xs text-surface-400 mt-0.5">
          {line.label ? `${line.displayPhoneNumber} · ` : ''}
          {offline ? (
            'desconectada'
          ) : (
            <>
              {quality && (
                <>
                  qualidade <b className={quality.className}>{quality.label}</b>
                </>
              )}
              {/* A cota só aparece quando o BE.5 responde. Sem ela, a linha
                  mostra nome e telefone — não um "0 / 0 hoje" inventado. */}
              {usage && usage.dailyQuota !== null && (
                <>
                  {quality ? ' · ' : ''}
                  {usage.usedToday.toLocaleString('pt-BR')} / {usage.dailyQuota.toLocaleString('pt-BR')} hoje
                </>
              )}
            </>
          )}
        </span>
      </span>

      {offline && (
        <span className="text-[11px] text-accent-rose flex-shrink-0">offline</span>
      )}
    </button>
  )
}

const QUALITY: Record<string, { label: string; className: string }> = {
  green:  { label: 'alta',  className: 'text-status-active' },
  yellow: { label: 'média', className: 'text-status-pending' },
  red:    { label: 'baixa', className: 'text-accent-rose' },
}


/** `min` do `datetime-local`, em hora LOCAL. `toISOString()` é UTC, então
 *  subtrai o offset antes de cortar — senão o campo recusa horários válidos
 *  de quem está a oeste de Greenwich. */
function localNowForInput(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

