import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  /**
   * Texto do balão. Aceita `ReactNode` (e não só `string`) desde 10/09, para
   * caber ajuda de várias frases com quebras e ênfase — o caso que motivou:
   * o campo "Observações" do negócio, onde a parte importante é o AVISO de
   * que a IA lê o que estiver ali. Chamadas antigas passam string e não mudam.
   */
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /**
   * Allow the tooltip to wrap onto multiple lines (max-w-xs). Default keeps
   * the original single-line behaviour so existing callers (sidebar tooltips,
   * dock icons) aren't affected. Use `wide` for sentence-length helper text
   * like the column descriptions in the Performance da Equipe table.
   */
  wide?: boolean
}

export function Tooltip({ content, children, side = 'right', wide = false }: TooltipProps) {
  const [show, setShow] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // Position is recomputed on every show using the wrapper's current rect
  // so the tooltip lands correctly regardless of page scroll or layout
  // changes. We render via Portal into document.body so the tooltip never
  // gets clipped by an ancestor with `overflow:hidden` (e.g. the rounded
  // wrapper of the Performance da Equipe table).
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  // SCRUM-1253 (PO, 11/10): perto da borda (o botão de Informações do
  // contato, com o painel fechado) o balão saía da tela. Depois de medir,
  // empurra para dentro com 8px de folga.
  const balaoRef = useRef<HTMLDivElement>(null)
  const [desvio, setDesvio] = useState(0)
  // 12/11 (auditoria do Dashboard): sem espaço em cima (ou embaixo), o balão vira para o outro
  // lado em vez de vazar da tela. Uma virada por abertura.
  const [lado, setLado] = useState(side)
  const virou = useRef(false)

  useLayoutEffect(() => {
    if (!show || !wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    // Anchor positions relative to the viewport (position:fixed).
    // Tooltips are small; we don't try to flip on edge collisions yet — for
    // the dashboard table the `top` placement always has room.
    const positions = {
      top:    { top: rect.top - 8,                 left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + 8,              left: rect.left + rect.width / 2 },
      left:   { top: rect.top + rect.height / 2,   left: rect.left - 8 },
      right:  { top: rect.top + rect.height / 2,   left: rect.right + 8 },
    }
    setCoords(positions[lado])
    setDesvio(0)
  }, [show, lado])

  useLayoutEffect(() => {
    const el = balaoRef.current
    if (!coords || !el) return
    const r = el.getBoundingClientRect()
    const margem = 8
    if (!virou.current) {
      if (lado === 'top' && r.top < margem) { virou.current = true; setLado('bottom'); return }
      if (lado === 'bottom' && r.bottom > window.innerHeight - margem) { virou.current = true; setLado('top'); return }
      if (lado === 'right' && r.right > window.innerWidth - margem) { virou.current = true; setLado('left'); return }
      if (lado === 'left' && r.left < margem) { virou.current = true; setLado('right'); return }
    }
    if (r.right > window.innerWidth - margem) setDesvio((d) => d - (r.right - (window.innerWidth - margem)))
    else if (r.left < margem) setDesvio((d) => d + (margem - r.left))
  }, [coords, lado])

  const abrir = () => { virou.current = false; setLado(side); setShow(true) }
  const fechar = () => { setShow(false); setCoords(null) }

  const transforms = {
    top:    '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left:   '-translate-x-full -translate-y-1/2',
    right:  '-translate-y-1/2',
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-center"
      onMouseEnter={abrir}
      onMouseLeave={fechar}
      onFocus={abrir}
      onBlur={fechar}
    >
      {children}
      {show && coords && createPortal(
        <div
          ref={balaoRef}
          role="tooltip"
          style={{ position: 'fixed', top: coords.top, left: coords.left + desvio }}
          // TIP-01 (spec 1a): superfície invertida (--toast/--toasttx), 24px,
          // raio 5, 11.5/500, sem borda nem sombra.
          className={cn(
            'z-[9999] flex items-center rounded-[6px] px-2 bg-[var(--toast)] text-[var(--toasttx)]',
            'text-xs font-medium',
            'pointer-events-none',
            // 12/11 (auditoria do Dashboard): o balão largo tem largura PRÓPRIA (o texto, até 20rem e
            // nunca mais que a tela). Sem ela, perto da borda direita o navegador espremia o balão
            // numa coluna estreita e comprida. Mais respiro para ler várias frases.
            wide
              ? 'w-max max-w-[min(20rem,calc(100vw-16px))] px-3 py-2 whitespace-normal leading-relaxed text-left'
              : 'h-6 whitespace-nowrap w-max',
            transforms[lado],
          )}
        >
          {content}
        </div>,
        document.body,
      )}
    </div>
  )
}
