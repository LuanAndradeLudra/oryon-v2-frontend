import { lazy, Suspense } from 'react'
import { useReducedMotion } from 'framer-motion'
import { LoginBeams } from '@/components/ui/LoginBeams'
import { useTheme } from '@/hooks/useTheme'
import { RotatingWord } from './RotatingWord'

// O palco fica fora do chunk de entrada: carrega sob demanda, só em lg+.
// NUNCA `@/components/landing/stage` (o index puxa HeroStage também).
const StagePoster = lazy(() =>
  import('@/components/landing/stage/StagePoster').then((m) => ({ default: m.StagePoster })),
)

/** Logo + wordmark, em tamanho de cabeçalho (sem logo gigante, sem glow). */
export function AuthBrandMark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <img src="/oryon-logo.svg" alt="" className="w-8 h-8 select-none" draggable={false} />
      <img src="/oryon-wordmark.png" alt="Oryon" className="h-5 w-auto select-none oryon-wordmark" draggable={false} />
    </div>
  )
}

/** Mesma altura da janela do StageFrame (460px em lg, único breakpoint visível
 *  aqui) — evita salto de layout enquanto o chunk carrega. */
function PosterFallback() {
  return <div className="w-full h-[460px] rounded-t-[13px] bg-surface-900 border border-[var(--frame-stroke)] border-b-0" />
}

/**
 * Lê o valor RESOLVIDO (por tema) de uma variável de cor do `index.css` — em
 * vez de duplicar o hex aqui, o `<canvas>` (que não entende `var(--x)` em
 * `fillStyle`) usa o mesmo token que o resto da tela. Único ponto de
 * derivação por tema deste arquivo — sem ternário de tema no JSX.
 */
function useResolvedColor(varName: string): string {
  // `resolvedTheme` só entra na lista de deps para o linter — é o que faz este
  // hook RE-RENDERIZAR quando o tema muda (o `useTheme()` já dispara isso
  // sozinho); a leitura em si é direta no render, sem efeito/estado (evita
  // set-state-in-effect por um valor que já é puro dado o tema atual).
  const { resolvedTheme } = useTheme()
  if (typeof document === 'undefined') return '#000000'
  void resolvedTheme
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#000000'
}

/**
 * Feixes de fundo (pedido do PO — restaurado; eu tinha removido por engano).
 * `LoginBeams` é `ui/` (não é meu arquivo): não respeita reduced-motion por
 * conta própria (roda `requestAnimationFrame` sem checar a media query), então
 * a guarda fica aqui — em reduced-motion o canvas nem monta.
 */
function BrandPanelBeams() {
  const reduced = useReducedMotion()
  const { resolvedTheme } = useTheme()
  const bg = useResolvedColor('--color-surface-950')
  if (reduced) return null
  return (
    <div aria-hidden className="absolute inset-0 z-0 overflow-hidden">
      <LoginBeams bgColor={bg} isLight={resolvedTheme === 'light'} />
    </div>
  )
}

/**
 * Coluna esquerda do login (lg+): feixes de fundo, marca, headline com a
 * palavra rotativa e o palco ESTÁTICO (poster da cena "inbox" no quadro do
 * handoff) — o `StagePoster` já traz a janela Attio completa (moldura, barra
 * de topo, corte embaixo; `StageFrame.tsx`, reforma do Cartógrafo em
 * `b97eb6d`). Nenhuma moldura própria aqui: a de antes (`PosterWindow`) era
 * temporária, documentada como tal, e virou moldura-dentro-de-moldura assim
 * que ele entregou a dele — removida.
 * Entrada por `.reveal` (desfoque→nítido, escalonado) nas peças novas; a
 * palavra rotativa usa framer-motion (é o componente original, restaurado a
 * pedido do PO — a proibição de framer valia só para peças novas do palco).
 */
export function AuthBrandPanel() {
  return (
    <aside className="relative flex-1 min-w-0 flex flex-col justify-between gap-10 p-10 xl:p-14 bg-surface-900 border-r border-surface-700 overflow-hidden">
      <BrandPanelBeams />
      <AuthBrandMark className="reveal relative z-10" />
      <div className="relative z-10 flex flex-col gap-8 min-w-0">
        <p
          className="reveal max-w-md font-display font-extrabold tracking-[-0.01em] leading-[1.05] text-surface-50"
          style={{ fontSize: 'clamp(28px, 14px + 2.6svh, 36px)', ['--d' as string]: '80ms' }}
        >
          Conversas que<br />
          <RotatingWord />
        </p>
        <div className="reveal w-full max-w-[760px]" style={{ ['--d' as string]: '160ms' }}>
          <Suspense fallback={<PosterFallback />}>
            <StagePoster scene="inbox" frame="handoff" />
          </Suspense>
        </div>
      </div>
    </aside>
  )
}
