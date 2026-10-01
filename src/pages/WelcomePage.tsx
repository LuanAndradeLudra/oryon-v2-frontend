import { lazy, Suspense } from 'react'
import { Hero, Trust } from '@/components/landing/sections'
import { LandingLayout } from '@/components/landing/LandingLayout'
import { SecaoDor } from '@/components/landing/home/SecaoDor'
import { FaixaChamada } from '@/components/landing/home/FaixaChamada'

// Abaixo da primeira dobra: carrega depois do Hero (demo, recortes e
// componentes reais pesam — não podem atrasar a primeira pintura).
const SecaoComoFunciona = lazy(() => import('@/components/landing/plataforma/SecaoPlataforma').then((m) => ({ default: m.SecaoComoFunciona })))
const SecaoImplantacao = lazy(() => import('@/components/landing/plataforma/SecoesVenda').then((m) => ({ default: m.SecaoImplantacao })))
const SecaoPerguntas = lazy(() => import('@/components/landing/plataforma/SecoesVenda').then((m) => ({ default: m.SecaoPerguntas })))
const SecaoDemonstracao = lazy(() => import('@/components/landing/demonstracao/FormDemonstracao').then((m) => ({ default: m.SecaoDemonstracao })))

/**
 * Landing pública (`/`) — a HOME DE VENDA (30/09, modelo Attio).
 *
 * Antes: seis capítulos empilhados + cinco seções explicativas e nenhum
 * próximo passo para quem não é cliente. Agora uma ideia por bloco, e o
 * detalhe mora nas páginas de produto (menu Plataforma), em /solucoes e em
 * /perguntas:
 *
 *   Hero (com a conversão) → a dor e a virada (um dia no WhatsApp, por setor) →
 *   como funciona (abas) → chamada → limites da IA (curto) → implantação (curta) →
 *   perguntas (as primeiras) → pedido de demonstração.
 *
 * "Para a sua área" saiu da home em 30/09 (PO): os setores já aparecem no
 * carrossel da dor; as simulações por área ficam na página /solucoes.
 */
export function WelcomePage() {
  return (
    <LandingLayout>
      <Hero />
      <SecaoDor />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <SecaoComoFunciona />
        <FaixaChamada />
        <Trust compacto />
        <SecaoImplantacao compacta />
        <SecaoPerguntas limite={5} />
        <SecaoDemonstracao origem="home" />
      </Suspense>
    </LandingLayout>
  )
}
