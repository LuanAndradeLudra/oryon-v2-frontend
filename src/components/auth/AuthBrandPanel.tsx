import { lazy, Suspense } from 'react'
// Só o contrato de medidas — NUNCA `@/components/landing/stage` (o index puxa o
// palco inteiro estaticamente e o LoginPage é import estático do App).
import { STAGE_DESIGN } from '@/components/landing/stage/types'

// O palco fica fora do chunk de entrada: carrega sob demanda, só em lg+.
const StagePoster = lazy(() =>
  import('@/components/landing/stage/StagePoster').then((m) => ({ default: m.StagePoster })),
)

// Moldura no modelo da Attio (disseção de 24/09, ver ledger): janela cortada
// embaixo, cantos SÓ no topo, sem borda inferior, sombra profunda — não um
// card fechado. Proporção 1120×460 é a medida literal deles (h-[460px] numa
// largura de referência de 1120px); a nossa StagePoster desenha no design de
// 1120×640 e escala pela LARGURA do contêiner, então ela sai mais alta que a
// janela — o `overflow-hidden` corta o resto, exatamente como o efeito deles.
const FRAME_WIDTH = STAGE_DESIGN.width
const FRAME_VISIBLE_HEIGHT = 460

// TEMPORÁRIO: o `StageFrame.tsx` do Cartógrafo (stage/**, não é meu arquivo)
// ainda desenha o chrome antigo por dentro (cantos nos 4 lados, sombra de
// overlay comum) — ele decidiu aplicar a moldura Attio lá depois. Até lá, a
// janela fica "moldura nova por fora, chrome antigo por dentro" (duas bordas
// visíveis). Simplificar quando `StageFrame` adotar --frame-stroke/--frame-shadow
// nativamente — aí esta camada deixa de ser necessária.
function PosterWindow() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-t-[13px] xl:rounded-t-[15px] border border-b-0 border-[var(--frame-stroke)] shadow-[var(--frame-shadow)] bg-[var(--frame-chrome)]"
      style={{ aspectRatio: `${FRAME_WIDTH} / ${FRAME_VISIBLE_HEIGHT}` }}
    >
      <Suspense fallback={<PosterFallback />}>
        <StagePoster scene="inbox" frame="handoff" />
      </Suspense>
    </div>
  )
}

/** Logo + wordmark, em tamanho de cabeçalho (sem logo gigante, sem glow). */
export function AuthBrandMark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <img src="/oryon-logo.svg" alt="" className="w-8 h-8 select-none" draggable={false} />
      <img src="/oryon-wordmark.png" alt="Oryon" className="h-5 w-auto select-none oryon-wordmark" draggable={false} />
    </div>
  )
}

/** Preenche o recorte da janela (o pai já tem a proporção) — evita salto de layout enquanto o chunk carrega. */
function PosterFallback() {
  return <div className="absolute inset-0 bg-surface-800" />
}

/**
 * Coluna esquerda do login (lg+): marca, frase-âncora e o palco ESTÁTICO
 * (poster da cena "inbox" no quadro do handoff), na janela recortada estilo
 * Attio. Sem animação nem canvas — entrada por `.reveal` (desfoque→nítido,
 * escalonado), não framer-motion. A frase evita a palavra do botão/título do
 * formulário.
 */
export function AuthBrandPanel() {
  return (
    <aside className="flex-1 min-w-0 flex flex-col justify-between gap-10 p-10 xl:p-14 bg-surface-900 border-r border-surface-700">
      <AuthBrandMark className="reveal" />
      <div className="flex flex-col gap-8 min-w-0">
        {/* Tipografia atada à altura da viewport, como o H1 da landing —
            faixa menor: este título divide a coluna com o palco, o da landing
            tem a tela inteira. */}
        <p
          className="reveal max-w-md font-display font-extrabold tracking-[-0.01em] leading-[1.05] text-surface-50"
          style={{ fontSize: 'clamp(28px, 14px + 2.6svh, 36px)', ['--d' as string]: '80ms' }}
        >
          Atende sozinho. O humano entra na hora certa.
        </p>
        <div aria-hidden="true" className="reveal w-full max-w-[760px]" style={{ ['--d' as string]: '160ms' }}>
          <PosterWindow />
        </div>
      </div>
    </aside>
  )
}
