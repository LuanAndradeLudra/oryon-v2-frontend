import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { LandingNav, Footer } from '@/components/landing/sections'
import { useHashAnchorScroll } from '@/hooks/useHashAnchorScroll'
import { useSomenteEscuro } from '@/hooks/useSomenteEscuro'

/**
 * A MOLDURA das páginas públicas (30/09: home de venda + páginas de produto).
 *
 * O contêiner é `h-screen overflow-y-auto`: o root do App é `overflow:
 * hidden`, então é ESTE elemento que rola (o `IntersectionObserver` dos
 * palcos usa `[data-landing-root]` como raiz; `window.scrollY` não anda).
 * Trocar de página volta ao topo — o contêiner é o mesmo elemento entre rotas
 * irmãs só quando o React o reaproveita, então o reset é explícito.
 */
export function LandingLayout({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useSomenteEscuro()
  // O título da aba nas páginas públicas diz o que a Oryon é; o app volta a "Oryon".
  useEffect(() => {
    const anterior = document.title
    document.title = 'Oryon · Atendimento com IA no WhatsApp'
    return () => { document.title = anterior }
  }, [])
  const { pathname, hash } = useLocation()
  useHashAnchorScroll(rootRef)
  useEffect(() => {
    if (!hash && rootRef.current) rootRef.current.scrollTop = 0
  }, [pathname, hash])
  return (
    <div
      ref={rootRef}
      data-landing-root
      className="h-screen w-full overflow-y-auto scroll-smooth motion-reduce:scroll-auto touch-manipulation bg-surface-950 text-surface-100"
    >
      {/* Pular a navegação (auditoria WIG, 30/09): só aparece no foco do teclado. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-surface-50 focus:px-4 focus:py-2 focus:text-[13.5px] focus:font-semibold focus:text-surface-950 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        Pular para o conteúdo
      </a>
      <LandingNav />
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">{children}</main>
      <Footer />
    </div>
  )
}
