import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { LandingNav, Footer } from '@/components/landing/sections'
import { useHashAnchorScroll } from '@/hooks/useHashAnchorScroll'

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
  const { pathname, hash } = useLocation()
  useHashAnchorScroll(rootRef)
  useEffect(() => {
    if (!hash && rootRef.current) rootRef.current.scrollTop = 0
  }, [pathname, hash])
  return (
    <div
      ref={rootRef}
      data-landing-root
      className="h-screen w-full overflow-y-auto scroll-smooth motion-reduce:scroll-auto bg-surface-950 text-surface-100"
    >
      <LandingNav />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
