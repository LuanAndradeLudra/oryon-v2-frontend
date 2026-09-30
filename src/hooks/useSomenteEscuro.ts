import { useLayoutEffect } from 'react'

/**
 * Força o tema ESCURO enquanto a tela estiver montada (30/09, PO): a landing
 * pública e as telas de acesso (login, esqueci e redefinir senha) são só
 * escuras, sem alternância.
 *
 * A preferência do usuário (`oryon-theme`) não é tocada — ao sair da tela
 * (entrar no app), o tema dele volta.
 */
export function useSomenteEscuro() {
  useLayoutEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.removeAttribute('data-theme')
    // Alguém (outra aba, o menu do app) tentando trocar o tema enquanto a
    // tela está aberta: ela continua escura.
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
