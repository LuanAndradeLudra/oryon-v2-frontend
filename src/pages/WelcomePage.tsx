import { lazy, Suspense } from 'react'
import { Hero, Trust } from '@/components/landing/sections'
import { LandingLayout } from '@/components/landing/LandingLayout'
import { FaixaFatos } from '@/components/landing/home/FaixaFatos'
import { SecaoDor } from '@/components/landing/home/SecaoDor'

// Abaixo da primeira dobra: carrega depois do Hero (demo, recortes e
// componentes reais pesam — não podem atrasar a primeira pintura).
const SecaoComoFunciona = lazy(() => import('@/components/landing/plataforma/SecaoPlataforma').then((m) => ({ default: m.SecaoComoFunciona })))
const SecaoSolucoes = lazy(() => import('@/components/landing/solucoes/SecaoSolucoes').then((m) => ({ default: m.SecaoSolucoes })))
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
 *   Hero (com a conversão) → fatos → a dor e a virada → como funciona (abas) → para a sua área
 *   (simulações) → limites da IA (curto) → implantação (curta) → perguntas
 *   (as primeiras) → pedido de demonstração.
 */
export function WelcomePage() {
  return (
    <LandingLayout>
      <Hero />
      <FaixaFatos />
      <SecaoDor />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <SecaoComoFunciona />
        <SecaoSolucoes />
        <Trust compacto />
        <SecaoImplantacao compacta />
        <SecaoPerguntas limite={5} />
        <SecaoDemonstracao origem="home" />
      </Suspense>
    </LandingLayout>
  )
}
