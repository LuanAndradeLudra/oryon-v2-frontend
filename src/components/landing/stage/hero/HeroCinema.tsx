import { useRef } from 'react'
import { Pause, Play } from 'lucide-react'
import { HeroStage } from './HeroStage'
import { HeroNarrativeOverlay } from './HeroNarrative'
import { useHeroTimeline } from './useHeroTimeline'
import { HERO_CUES, HERO_STATIC_CUE, HERO_TAIL_MS } from './heroStory'
import { cn } from '@/lib/utils'

/**
 * A HERO como palco FLUIDO de interfaces reais.
 *
 * O que saiu nesta rodada: a caixa externa. Antes havia um retângulo com
 * borda, cantos arredondados e um selo "Dados de demonstração" no topo,
 * contendo todas as telas. O PO leu isso como "uma aplicação dentro de uma
 * caixa" — o visitante percebia o limite do componente antes de perceber as
 * interfaces, as janelas ficavam presas num retângulo rígido e tudo precisava
 * ser escalado para caber.
 *
 * Agora o espaço da seção É o palco: fundo contínuo, atmosfera discreta, e as
 * três janelas flutuando diretamente sobre ele. Cada uma mantém a moldura e o
 * recorte próprios — o que foi removido é a moldura ao redor de todas.
 *
 * Três camadas, coordenadas por uma linha do tempo só:
 *
 *   editorial  → a frase que diz o valor do que está acontecendo
 *   composição → onde cada janela está (`heroComposition`)
 *   produto    → mensagens, situação, etiqueta, etapa, atribuição, desfecho
 */
export function HeroCinema({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  const { state, composition, ms, paused, canAnimate, running, togglePause } =
    useHeroTimeline({ cues: HERO_CUES, tailMs: HERO_TAIL_MS, hostRef, staticIndex: HERO_STATIC_CUE })

  return (
    <div
      ref={hostRef}
      className={cn('relative w-full', className)}
      data-hero-running={running ? 'true' : 'false'}
      data-hero-state={state}
      data-hero-composition={composition}
    >
      {/* ATMOSFERA — o fundo da própria seção, sem borda e sem cantos: é ele
          que faz as janelas flutuarem num espaço em vez de morarem numa caixa.
          Sangra para fora da coluna de texto de propósito. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-[10vw] -top-24 -bottom-16"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 12%, color-mix(in srgb, var(--color-brand-500) 12%, transparent) 0%, transparent 68%),' +
            'radial-gradient(45% 45% at 82% 78%, color-mix(in srgb, var(--color-accent-violet) 9%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        {/* A frase vem ANTES da ação que descreve e fica durante a leitura. */}
        <HeroNarrativeOverlay at={state} className="px-1 min-h-[104px] sm:min-h-[112px]" />

        {/* O palco. Sem borda, sem fundo próprio, sem recorte que prenda as
            janelas: `overflow-visible` para uma janela poder deslizar um pouco
            para fora ao sair, como um objeto do espaço da seção. */}
        <div
          aria-hidden
          inert
          className="relative mt-4 w-full overflow-visible pointer-events-none select-none h-[420px] sm:h-[470px] lg:h-[min(560px,58svh)]"
        >
          <HeroStage at={state} composition={composition} paused={paused} ms={ms} />
        </div>
      </div>

      <p className="sr-only">
        Demonstração da Oryon com dados fictícios: um atendimento de WhatsApp conduzido pelo Agente IA, com o
        contato e o negócio sendo atualizados, a conversa passada para uma atendente e a venda fechada por ela.
      </p>

      {/* Rodapé discreto: a divulgação de dados fictícios (P14) sai de dentro
          da composição e vira uma linha de pé de página, ao lado da pausa. */}
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] text-surface-600">Telas do produto com dados fictícios.</p>
        {canAnimate && (
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? 'Retomar a demonstração' : 'Pausar a demonstração'}
            className="flex-shrink-0 rounded-md p-1 text-surface-600 transition-colors hover:text-surface-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)]"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}
