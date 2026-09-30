import { HeroPalco } from '@/components/landing/stage/hero/HeroPalco'
import { cn } from '@/lib/utils'
import { ArrowDown } from 'lucide-react'
import { BotaoLanding } from '../ui/BotaoLanding'
import { hero, home, LANDING_ROUTES } from '../landingCopy'

/**
 * Headline + o produto operando logo abaixo (referência: hero da Attio, HTML
 * dissecado em 24/09). Duas correções de uma 1ª leitura que só copiou a
 * FÓRMULA deles sem copiar a CONDIÇÃO por trás:
 *
 * 1. `svh` sozinho não funciona em celular: numa viewport alta e estreita,
 *    `16px + 5.333svh` cresce com a ALTURA e nada segura a LARGURA. A fórmula
 *    ganhou um limite de largura — `min(8.2vw, 16px + 5.333svh)` — para que
 *    a menor dimensão governe a manchete em desktop baixo e celular estreito.
 * 2. O palco precisa começar dentro da dobra (medido: 60%+ visível em
 *    1240×751) — por isso os espaços entre H1/lead/CTAs/palco são enxutos,
 *    não decorativos.
 *
 * Entrada por desfoque→nítido (`.reveal`, token do orquestrador), NÃO
 * deslizamento nem framer-motion: escalonada por `--d` em H1 → parágrafo →
 * CTAs → palco, 90ms entre cada.
 *
 * O palco (24/09, noite): `HeroPalco` — a Oryon REAL rodando em modo
 * demonstração (`/demo.html`, backend em memória) na janela âncora, com
 * satélites que são componentes reais do produto. Regra do PO: todas as telas
 * e simulações usam o conteúdo real do software — nada desenhado à mão.
 */
export function Hero() {
  return (
    <section
      id="inicio"
      data-section="hero"
      className={cn(
        // `overflow-x-clip`: a atmosfera do palco sangra para fora da coluna de
        // propósito, mas nunca pode criar rolagem horizontal na página.
        // `isolate`: o véu do holofote (z 40, dentro da seção) nunca passa por
        // cima do menu fixo quando a página rola.
        'relative isolate overflow-x-clip scroll-mt-16 pb-10 sm:pb-5',
        // Espaçamento do conjunto título → narração → palco em TOKENS (25/09):
        // encolhem juntos em telas baixas, para o conjunto caber na altura.
        'pt-[var(--hero-gap-topo)]',
        // Botões → legenda com mais ar que legenda → palco (30/09): a legenda
        // pertence à demonstração, não aos botões.
        '[--hero-gap-topo:clamp(20px,4.2svh,48px)] [--hero-gap-editorial:clamp(20px,3.4svh,36px)] [--hero-gap-palco:clamp(8px,1.4svh,16px)]',
        // relevo sutil só de token: do degrau 900 ao piso 950
        'bg-[linear-gradient(to_bottom,var(--color-surface-900),var(--color-surface-950)_480px)]',
      )}
    >
      {/* A ATMOSFERA cobre a SEÇÃO INTEIRA (30/09): campo teal vindo de baixo e
          persiana de 1 px a cada 8 px, as duas se dissolvendo no fundo da
          página antes do fim da seção — sem borda reta. Atrás de tudo
          (-z-10 dentro do isolate da seção). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-70 [[data-theme=light]_&]:opacity-60"
          style={{
            background: 'radial-gradient(75% 55% at 50% 82%, color-mix(in srgb, var(--color-brand-500) 30%, transparent) 0%, color-mix(in srgb, var(--color-brand-500) 10%, transparent) 50%, transparent 78%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 78%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[.35] [[data-theme=light]_&]:opacity-[.5]"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, color-mix(in srgb, var(--color-surface-50) 7%, transparent) 0 1px, transparent 1px 8px)',
            maskImage: 'linear-gradient(to bottom, transparent 18%, black 55%, black 78%, transparent 100%)',
          }}
        />
      </div>
      {/* LAYOUT C (30/09, PO): editorial, tudo alinhado à esquerda na mesma
          margem das outras seções — selo, título, texto de apoio e a ação, em
          uma coluna de leitura. Um botão só com peso (a demonstração); "Ver
          como funciona" é link de texto (quem quer ver, rola). */}
      <div className="landing-container">
        <p className="reveal landing-selo inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ ['--d' as string]: '0ms' }}>
          {hero.selo}
        </p>
        <h1
          className="reveal mt-4 max-w-[16ch] font-display font-extrabold text-surface-50 text-[clamp(34px,min(6.4vw,14px+5svh),68px)] leading-[0.98] tracking-[clamp(-2.2px,2.08px-0.3733svh,-1.1px)] text-balance"
          style={{ ['--d' as string]: '60ms' }}
        >
          {hero.title}
        </h1>
        <div className="reveal mt-[clamp(12px,1.8svh,18px)]" style={{ ['--d' as string]: '120ms' }}>
          <p className="max-w-[62ch] text-[16px] leading-relaxed text-surface-400 sm:text-[17px] text-pretty">
            {hero.lead}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <BotaoLanding to={LANDING_ROUTES.demonstracao} seta className="h-11 px-5 text-[14.5px]">{home.ctaPrincipal}</BotaoLanding>
            <a
              href="#como-funciona"
              className="group inline-flex items-center gap-1.5 rounded-sm text-[14.5px] font-medium text-surface-300 transition-colors hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {home.ctaSecundario}
              <ArrowDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none" aria-hidden />
            </a>
          </div>
        </div>
      </div>

      <div
        role="region"
        aria-label={hero.stageLabel}
        /* O palco é mais largo que a coluna de texto a partir de `xl`: a tela
           de Conversas tem três regiões (lista 360 · conversa · painel 308) e,
           travado em 1120, sobrava pouco para a conversa justamente quando o
           painel abre. O texto continua em 1120 — linha de leitura não deve
           acompanhar o palco. */
        className="reveal mx-auto mt-[var(--hero-gap-editorial)] w-full max-w-[1120px] xl:max-w-[1560px] px-4 sm:px-6 xl:px-3"
        style={{ ['--d' as string]: '270ms' }}
      >
        <HeroPalco />
      </div>
    </section>
  )
}
