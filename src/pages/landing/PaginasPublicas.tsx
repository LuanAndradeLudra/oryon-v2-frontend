import { lazy, Suspense, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { LandingLayout } from '@/components/landing/LandingLayout'
import { Trust } from '@/components/landing/sections'
import { BotaoLanding } from '@/components/landing/ui/BotaoLanding'
import { Capitulo } from '@/components/landing/plataforma/SecoesVenda'
import { home, LANDING_ROUTES, paginasPlataforma, rotaPlataforma, solucoes } from '@/components/landing/landingCopy'
import { SEGMENTO_DO_FORM, useAreaDaPagina } from '@/components/landing/solucoes/areas'
import { SeletorDeArea } from '@/components/landing/solucoes/SeletorDeArea'

/**
 * As PÁGINAS PÚBLICAS além da home (30/09, modelo Attio): uma por grupo de
 * recursos (menu Plataforma), as áreas, as perguntas e o pedido de
 * demonstração. Reaproveitam as seções da landing — nada de tela nova
 * desenhada à mão.
 */

const SecaoCapitulos = lazy(() => import('@/components/landing/plataforma/SecaoPlataforma').then((m) => ({ default: m.SecaoCapitulos })))
const PainelDaArea = lazy(() => import('@/components/landing/solucoes/PainelDaArea').then((m) => ({ default: m.PainelDaArea })))
const SecaoEquipe = lazy(() => import('@/components/landing/plataforma/SecoesProva').then((m) => ({ default: m.SecaoEquipe })))
const SecaoResposta = lazy(() => import('@/components/landing/plataforma/SecoesProva').then((m) => ({ default: m.SecaoResposta })))
const SecaoImplantacao = lazy(() => import('@/components/landing/plataforma/SecoesVenda').then((m) => ({ default: m.SecaoImplantacao })))
const SecaoPerguntas = lazy(() => import('@/components/landing/plataforma/SecoesVenda').then((m) => ({ default: m.SecaoPerguntas })))
const SecaoDemonstracao = lazy(() => import('@/components/landing/demonstracao/FormDemonstracao').then((m) => ({ default: m.SecaoDemonstracao })))

/** O topo de uma página: eyebrow, H1 (destaque + cinza), lead e a conversão —
 *  ou, no lugar do botão, as ações da página (o seletor de área da /solucoes). */
function TopoDaPagina({ eyebrow, titulo, cinza, lead, acoes }: { eyebrow: string; titulo: string; cinza: string; lead: string; acoes?: ReactNode }) {
  return (
    <section data-section="topo" className="bg-[linear-gradient(to_bottom,var(--color-surface-900),var(--color-surface-950)_420px)] pb-12 pt-14 sm:pb-14 sm:pt-20">
      <div className="landing-container">
        <Capitulo rotulo={eyebrow} />
        <h1 className="mt-6 max-w-[44rem] font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.9rem,3.6vw,3rem)] text-balance text-surface-50">{titulo}</h1>
        {/* Lote 2 (30/09): a antiga continuação cinza do H1 abre o parágrafo. */}
        <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty">{lead ? `${cinza} ${lead}` : cinza}</p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          {acoes ?? <BotaoLanding to={LANDING_ROUTES.demonstracao} tamanho="lg" seta>{home.ctaPrincipal}</BotaoLanding>}
        </div>
      </div>
    </section>
  )
}

/** As outras páginas de produto, no fim de cada uma. */
function OutrasPaginas({ atual }: { atual: string }) {
  return (
    <section data-section="outras" className="border-t border-[var(--landing-borda)] bg-surface-950 py-12">
      <div className="landing-container">
        <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-surface-500">Veja também</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {paginasPlataforma.filter((p) => p.slug !== atual).map((p) => (
            <li key={p.slug}>
              <Link to={rotaPlataforma(p.slug)} className="group flex h-full flex-col rounded-2xl bg-[var(--landing-cartao)] p-5 ring-1 ring-[var(--landing-borda)] transition-colors hover:ring-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <span className="text-[15px] font-semibold text-surface-50">{p.menu}</span>
                <span className="mt-1 text-[13.5px] leading-relaxed text-surface-400">{p.resumo}</span>
                <ArrowRight className="mt-3 h-4 w-4 text-[var(--landing-destaque)] transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function PlataformaPage() {
  const { slug } = useParams()
  const pagina = paginasPlataforma.find((p) => p.slug === slug)
  if (!pagina) return <Navigate to={LANDING_ROUTES.home} replace />
  const extras = pagina.extras as readonly string[]
  return (
    <LandingLayout>
      <TopoDaPagina eyebrow={pagina.menu} titulo={pagina.titulo} cinza={pagina.cinza} lead={pagina.lead} />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <SecaoCapitulos ids={pagina.blocos} />
        {extras.includes('limites') && <Trust />}
        {extras.includes('equipe') && <SecaoEquipe />}
        {extras.includes('resposta') && <SecaoResposta />}
        <OutrasPaginas atual={pagina.slug} />
        <SecaoDemonstracao origem={`plataforma/${pagina.slug}`} />
      </Suspense>
    </LandingLayout>
  )
}

/** Para a sua área (02/10): o seletor de área no topo, a área contada em atos
 *  (PainelDaArea) e o pedido de demonstração já com a área escolhida. */
export function SolucoesPage() {
  const { area, escolher } = useAreaDaPagina()
  return (
    <LandingLayout>
      <TopoDaPagina
        eyebrow={solucoes.eyebrow}
        titulo={solucoes.paginaTitulo}
        cinza={solucoes.paginaCinza}
        lead=""
        acoes={<SeletorDeArea area={area} escolher={escolher} />}
      />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <PainelDaArea area={area} />
        <SecaoDemonstracao origem={`solucoes/${area}`} segmento={SEGMENTO_DO_FORM[area]} />
      </Suspense>
    </LandingLayout>
  )
}

export function PerguntasPage() {
  return (
    <LandingLayout>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <SecaoPerguntas comoPagina />
        {/* A implantação completa (passos, entregas e o depois) mora aqui: a
            home mostra só os três passos. */}
        <SecaoImplantacao />
        <SecaoDemonstracao origem="perguntas" />
      </Suspense>
    </LandingLayout>
  )
}

export function DemonstracaoPage() {
  return (
    <LandingLayout>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <SecaoDemonstracao origem="demonstracao" comoPagina />
      </Suspense>
    </LandingLayout>
  )
}
