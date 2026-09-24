import { BarChart3, MoreHorizontal, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * Card de campanha — ESPELHA `campaigns/CampaignsTab.tsx` (`CampaignCard`
 * :322-431, `Metrica` :291-299, `STATUS_CHIP_CLASS` :276-283):
 *   • container  ← :322 (borda 1px, raio 8, bg surface-800, px-4 py-3, gap 2.5)
 *   • identidade ← :324-345 (chip de status 18px, nome 13/600, data 11px, kebab 28px)
 *   • modelo     ← :379-382 ("modelo <nome> · N destinatários")
 *   • progresso  ← :387-398 (trilho 6px surface-900, preenchimento brand / danger).
 *                  O real anima `width`; aqui é `scaleX` (só transform) com origem à esquerda.
 *   • métricas   ← :399-405 (13/600 tabulares + rótulo 11px)
 *   • ações      ← :409-427 (Button neutral sm "Ver relatório" / "Enviar")
 * O card real traz Dropdown, WhatsappLineChip e mutações — não é importado.
 */
type Status = 'draft' | 'sending' | 'sent'

const STATUS_LABEL: Record<Status, string> = { draft: 'Rascunho', sending: 'Enviando', sent: 'Enviada' }
const STATUS_CHIP_CLASS: Record<Status, string> = {
  draft: 'bg-surface-900 border border-surface-700 text-surface-400',
  sending: 'color-chip-soft border [--chip:var(--color-accent-dark)]',
  sent: 'color-chip-soft border [--chip:var(--color-status-active)]',
}

const num = (n: number) => n.toLocaleString('pt-BR')

function Metrica({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[13px] font-semibold tabular-nums text-surface-100">{num(valor)}</span>
      <span className="text-[11px] text-surface-500">{rotulo}</span>
    </div>
  )
}

interface Props {
  name: string
  status: Status
  template: string
  total: number
  sent: number
  delivered: number
  read: number
  replied: number
  when: string
}

export function StageCampaignCard({ name, status, template, total, sent, delivered, read, replied, when }: Props) {
  const jaDisparou = status !== 'draft'
  const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0
  return (
    <div className="border border-surface-700 rounded-lg bg-surface-800 px-4 py-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('inline-flex items-center h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold flex-none', STATUS_CHIP_CLASS[status])}>
          {STATUS_LABEL[status]}
        </span>
        <span className="flex-1 min-w-0 text-[13px] font-semibold text-surface-50 truncate">{name}</span>
        <div className="ml-auto flex items-center gap-2 flex-none">
          <span className="text-[11px] text-surface-500 tabular-nums flex-none">{when}</span>
          <span className="w-7 h-7 rounded-xs flex items-center justify-center text-surface-500 flex-none">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      <p className="text-[11px] text-surface-500 truncate">
        modelo <span className="text-surface-400">{template}</span>
        {total > 0 && <> · {num(total)} destinatário{total === 1 ? '' : 's'}</>}
      </p>

      {jaDisparou && total > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-surface-900 overflow-hidden">
              <div
                className="h-full w-full rounded-full bg-brand-500 transition-transform duration-500 origin-left"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
            <span className="text-[11px] text-surface-400 tabular-nums flex-none">
              {num(sent)} / {num(total)}
            </span>
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <Metrica rotulo="entregues" valor={delivered} />
            <Metrica rotulo="lidas" valor={read} />
            <Metrica rotulo="respostas" valor={replied} />
          </div>
        </>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        {jaDisparou ? (
          <Button size="sm" variant="neutral" tabIndex={-1} leftIcon={<BarChart3 className="w-3.5 h-3.5" />}>Ver relatório</Button>
        ) : (
          <Button size="sm" variant="neutral" tabIndex={-1} leftIcon={<Send className="w-3.5 h-3.5" />}>Enviar</Button>
        )}
      </div>
    </div>
  )
}
