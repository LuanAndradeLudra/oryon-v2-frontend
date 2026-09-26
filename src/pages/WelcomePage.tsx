import { lazy, Suspense } from 'react'
import {
  LandingNav, Hero, Trust, Footer,
} from '@/components/landing/sections'

// Abaixo da primeira dobra: carrega depois do Hero (demo, recortes e
// componentes reais pesam — não podem atrasar a primeira pintura).
const SecaoPlataforma = lazy(() => import('@/components/landing/plataforma/SecaoPlataforma').then((m) => ({ default: m.SecaoPlataforma })))
const SecaoImplantacao = lazy(() => import('@/components/landing/plataforma/SecoesVenda').then((m) => ({ default: m.SecaoImplantacao })))
const SecaoPerguntas = lazy(() => import('@/components/landing/plataforma/SecoesVenda').then((m) => ({ default: m.SecaoPerguntas })))
const SecaoFecho = lazy(() => import('@/components/landing/plataforma/SecoesVenda').then((m) => ({ default: m.SecaoFecho })))
const SecaoArea = lazy(() => import('@/components/landing/plataforma/SecoesProva').then((m) => ({ default: m.SecaoArea })))
const SecaoEquipe = lazy(() => import('@/components/landing/plataforma/SecoesProva').then((m) => ({ default: m.SecaoEquipe })))
const SecaoResposta = lazy(() => import('@/components/landing/plataforma/SecoesProva').then((m) => ({ default: m.SecaoResposta })))

/**
 * Landing pública (`/`) — SCRUM-1097, fase "porta de entrada". Reescrita
 * completa: a versão anterior (logo gigante com glow, palavra rotativa, beams
 * em canvas, planos, redes sociais) foi descartada pelo PO.
 *
 * O contêiner é `h-screen overflow-y-auto`: o root do App é `overflow: hidden`,
 * então é ESTE elemento que rola (o `IntersectionObserver` do palco funciona;
 * `window.scrollY` não). A nav é `sticky` dentro dele; as âncoras (#produto,
 * #como-funciona) rolam este contêiner. Copy toda em `landingCopy.ts`.
 */
export function WelcomePage() {
  return (
    <div
      data-landing-root
      className="h-screen w-full overflow-y-auto scroll-smooth motion-reduce:scroll-auto bg-surface-950 text-surface-100"
    >
      <LandingNav />
      <main>
        <Hero />
        {/* A escada de consciência: o que é (Hero) → como resolve cada problema
            (Plataforma) → vai dar trabalho? (Implantação) → posso confiar?
            (limites da IA) → dúvidas finais (Perguntas) → conversa (Fecho). */}
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <SecaoPlataforma />
          {/* "Posso confiar?" vem antes de "dá trabalho?" (26/09). */}
          <Trust />
          {/* As provas (26/09): serve para mim? perco o controle? e se ninguém responder? */}
          <SecaoArea />
          <SecaoEquipe />
          <SecaoResposta />
          <SecaoImplantacao />
          <SecaoPerguntas />
          <SecaoFecho />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
