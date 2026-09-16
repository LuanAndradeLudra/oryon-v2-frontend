import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { useLayer } from '@/contexts/LayerContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatDayLong, formatHourLabel, STATUS_CHIP_VAR, STATUS_LABEL, type ScheduleEvent } from './scheduleMock'

interface ScheduleEventPopoverProps {
  event: ScheduleEvent
  date: Date
  anchorRect: DOMRect
  onClose: () => void
}

const POPOVER_WIDTH = 300

/**
 * Popover de detalhe do evento. Reimplementa o essencial do `Dropdown`
 * (portal + `useLayer` + fechar no clique-fora/Escape) em vez de reusá-lo
 * porque o `Dropdown` posiciona a partir de um wrapper `relative` em volta
 * do anchor — aqui o anchor já é um bloco absoluto dentro da grade, então a
 * posição vem de `anchorRect` (medido no clique), não de um ref encapsulado.
 */
export function ScheduleEventPopover({ event, date, anchorRect, onClose }: ScheduleEventPopoverProps) {
  const semMovimento = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { zIndex } = useLayer(true, onClose)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      onClose()
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  // README 3.8: ancora à DIREITA do bloco por padrão (não embaixo) — cai pra
  // esquerda se não couber à direita, e só desce abaixo do bloco como
  // último recurso (bloco no fim da grade, sem espaço lateral).
  const gap = 8
  const ESTIMATED_HEIGHT = 220
  const fitsRight = anchorRect.right + gap + POPOVER_WIDTH <= window.innerWidth - 12
  const fitsLeft = anchorRect.left - gap - POPOVER_WIDTH >= 12
  let left: number | undefined
  let top: number | undefined
  let bottom: number | undefined
  if (fitsRight || fitsLeft) {
    left = fitsRight ? anchorRect.right + gap : anchorRect.left - gap - POPOVER_WIDTH
    top = Math.min(Math.max(anchorRect.top, 12), window.innerHeight - ESTIMATED_HEIGHT - 12)
  } else {
    left = Math.min(Math.max(anchorRect.left, 12), window.innerWidth - POPOVER_WIDTH - 12)
    const fitsBelow = anchorRect.bottom + gap + ESTIMATED_HEIGHT < window.innerHeight
    top = fitsBelow ? anchorRect.bottom + gap : undefined
    bottom = fitsBelow ? undefined : window.innerHeight - anchorRect.top + gap
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex }}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-label={`Detalhe do agendamento: ${event.title}`}
        initial={semMovimento ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.13, ease: 'easeOut' }}
        style={{ position: 'fixed', top, bottom, left, width: POPOVER_WIDTH }}
        className="overlay-surface border rounded-[8px] p-3.5"
      >
        <div className="flex items-start gap-2 mb-2.5">
          <span
            className="mt-1 w-2.5 h-2.5 rounded-xs flex-shrink-0"
            style={{ background: event.isCampaign ? 'var(--color-surface-600)' : event.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-surface-50 leading-snug truncate">{event.title}</div>
            <div className="text-2xs text-surface-400 mt-0.5">
              {formatDayLong(date)} · {formatHourLabel(event.startMinutes)}–{formatHourLabel(event.endMinutes)}
              {event.detail.channel ? ` · ${event.detail.channel}` : ''}
            </div>
          </div>
          <button
            type="button"
            aria-label="Mais ações"
            title="Exemplo — menu de ações extras fica para outro épico"
            className="text-surface-500 hover:text-surface-300 flex-shrink-0"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-[82px_1fr] gap-y-1.5 text-xs mb-3">
          {event.detail.contact && (
            <>
              <span className="text-surface-500">Contato</span>
              <span className="text-accent-dark truncate">{event.detail.contact}</span>
            </>
          )}
          <span className="text-surface-500">Responsável</span>
          <span className="text-surface-200 flex items-center gap-1.5">
            <Avatar name={event.agent} kind="operator" size="xs" className="w-4 h-4 text-[8px]" />
            {event.agent}
          </span>
          {event.detail.origin && (
            <>
              <span className="text-surface-500">Origem</span>
              <span>
                {/* Só "Agente Vendas" tem cor confirmada no mock (laranja/âmbar,
                    README/PNG) — os demais valores de origem não têm um
                    exemplo de cor no material de referência, então ficam no
                    chip neutro em vez de uma paleta inventada. */}
                {event.detail.origin === 'Agente Vendas' ? (
                  <span
                    className="color-chip inline-flex items-center rounded-xs border px-1.5 py-px text-[11px] font-medium"
                    style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
                  >
                    {event.detail.origin}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-xs border border-surface-700 bg-surface-800 px-1.5 py-px text-[11px] font-medium text-surface-300">
                    {event.detail.origin}
                  </span>
                )}
              </span>
            </>
          )}
          <span className="text-surface-500">Status</span>
          <span>
            <span
              className="color-chip inline-flex items-center rounded-xs border px-1.5 py-px text-[11px] font-semibold"
              style={{ ['--chip']: STATUS_CHIP_VAR[event.status] } as React.CSSProperties}
            >
              {STATUS_LABEL[event.status]}
            </span>
          </span>
        </div>

        <div className="border-t border-surface-700 pt-2.5 flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={onClose} title="Exemplo — sem conversa real vinculada ainda">
            Abrir conversa
          </Button>
          <Button size="sm" variant="neutral" onClick={onClose} title="Exemplo — reagendamento real fica para outro épico">
            Reagendar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger hover:bg-danger/10 ml-auto"
            onClick={onClose}
            title="Exemplo — cancelamento real fica para outro épico"
          >
            Cancelar
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
