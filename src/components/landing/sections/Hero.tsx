import { HeroPalco } from '@/components/landing/stage/hero/HeroPalco'
import { HeroPalcoCelular } from '@/components/landing/stage/hero/HeroPalcoCelular'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  // Abaixo de 768 px, o palco é o app de computador com câmera (02/10, PO);
  // do tablet para cima, o palco com as janelas satélite.
  const celular = !useMediaQuery('(min-width: 768px)')
  // A conversão: no desktop logo abaixo do texto; no celular (02/10, PO)
  // depois do palco — o cabeçalho fixo já tem o botão, e o pedido vem quando a
  // pessoa acabou de ver o produto funcionando.
  const conversao = (
    <>
      <div
        className={cn('reveal flex flex-wrap items-center justify-center gap-x-4 gap-y-3', celular ? 'mt-6' : 'mt-[clamp(12px,1.8svh,18px)]')}
        style={{ ['--d' as string]: '180ms' }}
      >
        <BotaoLanding to={LANDING_ROUTES.demonstracao} seta className="h-11 px-5 text-[14.5px]">{home.ctaPrincipal}</BotaoLanding>
        {!celular && <a
          href="#como-funciona"
          className="rounded-sm px-2 text-[14.5px] font-medium text-surface-300 transition-colors hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {home.ctaSecundario}
        </a>}
      </div>
      <ul
        className={cn("reveal flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[13px] text-surface-400", celular ? "mt-8" : "mt-[clamp(10px,1.4svh,14px)]")}
        style={{ ['--d' as string]: '240ms' }}
      >
        {hero.garantias.map((g) => (
          <li key={g} className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[var(--landing-destaque)]" strokeWidth={2.4} aria-hidden />
            {g}
          </li>
        ))}
      </ul>
    </>
  )

  return (
    <section
      id="inicio"
      data-section="hero"
      className={cn(
        // Sem a faixa de fatos (removida em 30/09), o respiro antes da próxima
        // seção fica aqui.
        // `overflow-x-clip`: a atmosfera do palco sangra para fora da coluna de
        // propósito, mas nunca pode criar rolagem horizontal na página.
        // `isolate`: o véu do holofote (z 40, dentro da seção) nunca passa por
        // cima do menu fixo quando a página rola.
        'relative isolate overflow-x-clip scroll-mt-16 pb-7 sm:pb-16',
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
      {/* Texto CENTRADO no mesmo eixo do palco (como a referência): título,
          lead e CTAs alinhados à esquerda numa coluna mais estreita que o
          palco criavam dois eixos brigando na primeira dobra. */}
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 text-center">
        <h1
          // Desktop (02/10, PO): a headline numa linha só. Ela pode passar da coluna
          // de 1120 px (centrada na tela) e o tamanho acompanha a largura da tela.
          className="reveal font-display font-extrabold text-balance text-surface-50 -mr-2 md:mr-0 text-left md:text-center text-[clamp(26px,8vw,31px)] md:text-[clamp(30px,min(8.2vw,16px+5.333svh),72px)] leading-[0.95] tracking-[clamp(-2.2px,2.08px-0.3733svh,-1.1px)] lg:relative lg:left-1/2 lg:w-max lg:-translate-x-1/2 lg:whitespace-nowrap lg:text-[min(4.4vw,64px,16px+5.333svh)]"
          style={{ ['--d' as string]: '0ms' }}
        >
          {hero.title}
        </h1>
        <p
          className="reveal mx-auto mt-[clamp(10px,1.6svh,16px)] max-w-[64ch] text-left md:text-center text-base sm:text-lg leading-relaxed text-surface-400 text-pretty md:text-balance"
          style={{ ['--d' as string]: '90ms' }}
        >
          {celular ? hero.leadCurto : hero.lead}
        </p>
        {/* A conversão (30/09, home de venda): pedir a demonstração ou ver as
            etapas logo abaixo. Antes (24/09) o Hero não tinha botões — a página
            chegava ao fim sem nenhum próximo passo para quem não é cliente. */}
        {!celular && conversao}
      </div>

      <div
        role="region"
        aria-label={hero.stageLabel}
        /* O palco é mais largo que a coluna de texto a partir de `xl`: a tela
           de Conversas tem três regiões (lista 360 · conversa · painel 308) e,
           travado em 1120, sobrava pouco para a conversa justamente quando o
           painel abre. O texto continua em 1120 — linha de leitura não deve
           acompanhar o palco. */
        className="reveal mx-auto mt-3 md:mt-[var(--hero-gap-editorial)] w-full max-w-[1120px] xl:max-w-[1560px] px-4 sm:px-6 xl:px-3"
        style={{ ['--d' as string]: '270ms' }}
      >
        {celular ? <HeroPalcoCelular /> : <HeroPalco />}
        {celular && conversao}
      </div>
    </section>
  )
}
