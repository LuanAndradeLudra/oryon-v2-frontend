import {
  LandingNav, Hero, HowItWorks, ProductGrid, Trust, FinalCta, Footer,
} from '@/components/landing/sections'

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
        <HowItWorks />
        <ProductGrid />
        <Trust />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
