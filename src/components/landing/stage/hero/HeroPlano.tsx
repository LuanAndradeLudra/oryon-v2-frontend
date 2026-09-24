import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { HeroShell, type HeroModule } from './HeroShell'
import { HeroAgentLog, HeroNotices, HeroPhone, type HeroLogLine, type HeroNotice, type HeroPhoneMsg } from './HeroSatellites'

/**
 * O PLANO FIXO — a nova arquitetura do Hero.
 *
 * Substitui as "janelas que viajam". O diagnóstico medido foi que três janelas
 * mudando de posição, escala (0,58–1,0) e até de formato (964→604px) obrigam o
 * olho a reencontrar o produto a cada cena, e produzem quadros de transição
 * que parecem erro. A direção nova é a oposta: **uma âncora com caixa
 * constante** — mesma posição, mesma largura, mesma altura em todos os cues —
 * onde só a área de conteúdo troca, e três satélites em posição igualmente
 * fixa, encostando nas bordas dela.
 *
 * Escala ÚNICA: o plano é desenhado numa largura fixa e reduzido por um fator
 * só, medido por `ResizeObserver`. Não há escala por janela. Isso é o que
 * sustenta o piso de legibilidade — com escalas diferentes por superfície, as
 * recuadas caíam para 6–9px efetivos.
 */

/** Geometria do plano, em coordenadas de desenho. */
export const PLANO = {
  // 1440 de largura, não 1240: com o plano estreito os satélites ficavam quase
  // todos ATRÁS da âncora (só ~120px de cada um aparecia). O documento pede o
  // contrário — eles encostam na borda da âncora e saem para fora dela. Com
  // 250px de margem de cada lado, um satélite de 252–268px cabe fora.
  w: 1440,
  h: 560,
  ancora: { x: 250, y: 40, w: 940, h: 480 },
  // Satélites: maior parte fora da âncora, encostando na borda dela.
  celular: { x: 1110, y: 116, w: 214, h: 382 },
  registro: { x: 8, y: 318, w: 268, h: 194 },
  avisos: { x: 0, y: 44, w: 252, h: 156 },
} as const

/** Bandeja: a moldura em volta de cada superfície. */
function Bandeja({ className, style, children, brilho }: { className?: string; style?: React.CSSProperties; children: ReactNode; brilho?: boolean }) {
  return (
    <div className={cn('absolute', className)} style={style}>
      {brilho && (
        <div
          aria-hidden
          className="absolute -inset-x-10 -bottom-10 top-1/3 rounded-[40px] pointer-events-none"
          style={{ background: 'radial-gradient(50% 50% at 50% 60%, color-mix(in srgb, var(--color-brand-500) 22%, transparent), transparent 70%)' }}
        />
      )}
      {/* A bandeja tem 6px de respiro nas laterais e embaixo, 0 no topo. No
          escuro a profundidade vem de LUZ (realce de 1px no topo), não de
          sombra preta, que some sobre o fundo quase preto. */}
      <div
        className="relative h-full w-full rounded-[16px] border border-white/[.07] bg-white/[.04] p-1.5 pt-0"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 18px 40px -24px rgba(0,0,0,.55)' }}
      >
        <div className="flex items-center gap-1.5 h-[22px] px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
        <div className="h-[calc(100%-22px)] w-full overflow-hidden rounded-[12px] border border-white/[.06] bg-surface-950">
          {children}
        </div>
      </div>
    </div>
  )
}

export interface HeroPlanoProps {
  modulo: HeroModule
  conteudo: ReactNode
  telefone: HeroPhoneMsg[]
  digitando?: boolean
  registro: HeroLogLine[]
  avisos: HeroNotice[]
  /** Satélites ocultas no estado parado (antes do primeiro scroll). */
  satelites?: boolean
}

export function HeroPlano({ modulo, conteudo, telefone, digitando, registro, avisos, satelites = true }: HeroPlanoProps) {
  const palcoRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)

  useLayoutEffect(() => {
    const el = palcoRef.current
    if (!el) return
    const medir = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) setFit(Math.min(1, w / PLANO.w, h / PLANO.h))
    }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const box = (r: { x: number; y: number; w: number; h: number }) =>
    ({ left: r.x, top: r.y, width: r.w, height: r.h })

  return (
    <div ref={palcoRef} className="absolute inset-0 overflow-visible" data-hero-fit={fit.toFixed(3)}>
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{ width: PLANO.w, height: PLANO.h, transform: `translate(-50%, -50%) scale(${fit})` }}
      >
        <Bandeja style={box(PLANO.avisos)} className={cn('transition-opacity duration-500', satelites ? 'opacity-100' : 'opacity-0')}>
          <HeroNotices itens={avisos} />
        </Bandeja>

        <Bandeja style={box(PLANO.registro)} className={cn('transition-opacity duration-500', satelites ? 'opacity-100' : 'opacity-0')}>
          <HeroAgentLog linhas={registro} />
        </Bandeja>

        {/* A ÂNCORA: mesma caixa em todos os cues. */}
        <Bandeja style={{ ...box(PLANO.ancora), zIndex: 20 }} brilho data-hero-ancora>
          <HeroShell modulo={modulo}>{conteudo}</HeroShell>
        </Bandeja>

        <Bandeja style={{ ...box(PLANO.celular), zIndex: 30 }} className={cn('transition-opacity duration-500', satelites ? 'opacity-100' : 'opacity-0')}>
          <HeroPhone mensagens={telefone} digitando={digitando} />
        </Bandeja>
      </div>
    </div>
  )
}
