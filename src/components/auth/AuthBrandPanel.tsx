import { lazy, Suspense } from 'react'
// Só o contrato de medidas — NUNCA `@/components/landing/stage` (o index puxa o
// palco inteiro estaticamente e o LoginPage é import estático do App).
import { STAGE_DESIGN } from '@/components/landing/stage/types'

// O palco fica fora do chunk de entrada: carrega sob demanda, só em lg+.
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

/** Mesma proporção do poster — evita salto de layout enquanto o chunk carrega. */
function PosterFallback() {
  return (
    <div
      className="w-full rounded-lg border border-surface-700 bg-surface-800"
      style={{ aspectRatio: `${STAGE_DESIGN.width} / ${STAGE_DESIGN.height}` }}
    />
  )
}

/**
 * Coluna esquerda do login (lg+): marca, frase-âncora e o palco ESTÁTICO
 * (poster da cena "inbox" no quadro do handoff). Sem animação nem canvas.
 * A frase evita a palavra do botão/título do formulário.
 */
export function AuthBrandPanel() {
  return (
    <aside className="flex-1 min-w-0 flex flex-col justify-between gap-10 p-10 xl:p-14 bg-surface-900 border-r border-surface-700">
      <AuthBrandMark />
      <div className="flex flex-col gap-8 min-w-0">
        <p className="max-w-md text-3xl xl:text-4xl font-bold leading-tight tracking-tight text-surface-50">
          Atende sozinho. O humano entra na hora certa.
        </p>
        <div aria-hidden="true" className="w-full max-w-[760px]">
          <Suspense fallback={<PosterFallback />}>
            <StagePoster scene="inbox" frame="handoff" />
          </Suspense>
        </div>
      </div>
    </aside>
  )
}
