import { useReducedMotion } from 'framer-motion'
import { LoginBeams } from '@/components/ui/LoginBeams'
import { RotatingWord } from './RotatingWord'
import { OryonLogo } from '@/components/brand/OryonLogo'

/** O fundo dos feixes: o `--color-surface-950` do tema escuro. As telas de
 *  acesso são só escuras (30/09), então não há tema a resolver. */
const FUNDO_ESCURO = '#060909'

/** A assinatura horizontal (símbolo + palavra), em tamanho de cabeçalho. */
export function AuthBrandMark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center ${className ?? ''}`}>
      <OryonLogo className="h-8 text-surface-50 select-none" />
    </div>
  )
}

/**
 * Feixes de fundo (pedido do PO — restaurado; eu tinha removido por engano).
 * `LoginBeams` é `ui/` (não é meu arquivo): não respeita reduced-motion por
 * conta própria (roda `requestAnimationFrame` sem checar a media query), então
 * a guarda fica aqui — em reduced-motion o canvas nem monta.
 */
function BrandPanelBeams() {
  const reduced = useReducedMotion()
  if (reduced) return null
  return (
    <div aria-hidden className="absolute inset-0 z-0 overflow-hidden">
      <LoginBeams bgColor={FUNDO_ESCURO} isLight={false} />
    </div>
  )
}

/**
 * Coluna esquerda do login (lg+): feixes de fundo, marca e a headline com a
 * palavra rotativa. 30/09 (PO): saiu a tela de simulação (o `StagePoster`) —
 * a coluna fica só com a marca e a frase, sobre os feixes.
 * Entrada por `.reveal` (desfoque→nítido, escalonado); a palavra rotativa usa
 * framer-motion (componente original, restaurado a pedido do PO).
 */
export function AuthBrandPanel() {
  return (
    <aside className="relative flex-1 min-w-0 flex flex-col justify-between gap-10 p-10 xl:p-14 bg-surface-900 border-r border-surface-700 overflow-hidden">
      <BrandPanelBeams />
      <AuthBrandMark className="reveal relative z-10" />
      <div className="relative z-10 flex flex-col gap-5 min-w-0 pb-4">
        <p
          className="reveal max-w-xl font-display font-extrabold tracking-[-0.02em] leading-[1.02] text-surface-50"
          style={{ fontSize: 'clamp(40px, 18px + 3.6svh, 56px)', ['--d' as string]: '80ms' }}
        >
          Conversas que<br />
          <RotatingWord />
        </p>
        <p className="reveal max-w-md text-[16px] leading-relaxed text-surface-400" style={{ ['--d' as string]: '160ms' }}>
          Gerencie atendimentos, automatize follow-ups e transforme cada contato em uma oportunidade real.
        </p>
      </div>
    </aside>
  )
}
