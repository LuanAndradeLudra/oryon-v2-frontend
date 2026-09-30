import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
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
/**
 * As páginas públicas são SÓ ESCURAS (30/09, PO): o tema claro da landing não
 * agradou e sai até ter um desenho próprio. A preferência de tema do usuário
 * (`oryon-theme`) não é tocada — ao sair da landing (entrar no app), o tema
 * dele volta.
 */
function useSomenteEscuro() {
  useLayoutEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.removeAttribute('data-theme')
    // Alguém (outra aba, o menu do app) tentando trocar o tema enquanto a
    // landing está aberta: a landing continua escura.
    const mo = new MutationObserver(() => {
      if (html.getAttribute('data-theme') === 'light') html.removeAttribute('data-theme')
    })
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mo.disconnect()
      if (anterior) html.setAttribute('data-theme', anterior)
      else {
        const t = localStorage.getItem('oryon-theme')
        const claro = t === 'light' || (t === 'auto' && window.matchMedia?.('(prefers-color-scheme: light)').matches)
        if (claro) html.setAttribute('data-theme', 'light')
      }
    }
  }, [])
}

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
      className="h-screen w-full overflow-y-auto scroll-smooth motion-reduce:scroll-auto bg-surface-950 text-surface-100"
    >
      <LandingNav />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
