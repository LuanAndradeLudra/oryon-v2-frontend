import { StageFrame } from '../StageFrame'
import { HeroComposition } from './HeroComposition'
import { HeroMobileComposition } from './HeroMobileComposition'
import { HERO_FRAMES, HERO_FRAME_LABEL, HERO_MOBILE_MOMENTS, HERO_MOBILE_LABEL } from './heroData'

/**
 * Playground de revisão do Hero (STORYBOARD-HERO.md) — SEM MOTOR: os 5 frames
 * desktop e os 3 momentos mobile empilhados, cada um rotulado, como estados
 * PARADOS da mesma composição (não telas independentes — o componente é o
 * mesmo em todos; só o `frame`/`moment` muda). Revisar em 1440×900 e
 * 1240×751 (redimensione a janela; a página é comum, sem lógica de rota).
 *
 * Import: `HeroPlayground` — `export default` também, pra `lazy()` se for o
 * caso. Rota sugerida: `/_hero`.
 */
export default function HeroPlayground() {
  return (
    <div className="min-h-screen bg-surface-950 px-6 py-10 flex flex-col gap-12">
      <header>
        <h1 className="text-xl font-display font-bold text-surface-50">Hero — playground de revisão</h1>
        <p className="text-sm text-surface-400 mt-1 max-w-[640px]">
          Composição única, quatro planos (P0 shell · P1 conversa · P2 execução · P3 resultado). Cada quadro abaixo é
          um estado parado dela — sem transição, sem cursor, sem laço ambiente. F5 é o quadro do poster e do
          reduced-motion.
        </p>
      </header>

      <section className="flex flex-col gap-8">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Desktop — 4 planos, 5 frames</h2>
        {HERO_FRAMES.map((frame) => (
          <div key={frame} className="flex flex-col gap-2">
            <p className="text-xs font-mono text-surface-500">{HERO_FRAME_LABEL[frame]}</p>
            <StageFrame
              layout="desktop"
              title="Hero"
              ambient={false}
              contentHeightClassName="h-[420px] lg:h-[560px]"
              description={`Hero — ${HERO_FRAME_LABEL[frame]}`}
            >
              <HeroComposition frame={frame} />
            </StageFrame>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Mobile — composição própria, 3 momentos</h2>
        <div className="flex flex-wrap gap-8">
          {HERO_MOBILE_MOMENTS.map((moment) => (
            <div key={moment} className="flex flex-col gap-2 w-[360px] max-w-full">
              <p className="text-xs font-mono text-surface-500">{HERO_MOBILE_LABEL[moment]}</p>
              <StageFrame
                layout="compact"
                title="Hero"
                ambient={false}
                contentHeightClassName="h-[560px]"
                description={`Hero mobile — ${HERO_MOBILE_LABEL[moment]}`}
              >
                <HeroMobileComposition moment={moment} />
              </StageFrame>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
