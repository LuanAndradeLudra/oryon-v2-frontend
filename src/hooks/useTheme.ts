import { useState, useEffect } from 'react'

// SCRUM-1100: 'auto' segue o SO (prefers-color-scheme) — adicionado para o
// SegmentedControl Auto/Claro/Escuro do novo menu do usuário na TopBar.
// 'dark'/'light' continuam explícitos e ganham de qualquer preferência do SO.
export type Theme = 'dark' | 'light' | 'auto'
/** Tema efetivamente aplicado no DOM (o que 'auto' resolve para). */
export type ResolvedTheme = 'dark' | 'light'

const STORAGE_KEY = 'oryon-theme'
const THEME_EVENT = 'oryon:theme-change'

function systemPrefersLight(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme === 'auto') return systemPrefersLight() ? 'light' : 'dark'
  return theme
}

function applyResolved(resolved: ResolvedTheme) {
  if (resolved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

function persistAndApply(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
  applyResolved(resolve(theme))
}

function loadStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'auto' ? stored : 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(loadStoredTheme)

  useEffect(() => {
    const handler = (e: Event) => {
      setThemeState((e as CustomEvent<Theme>).detail)
    }
    window.addEventListener(THEME_EVENT, handler)
    return () => window.removeEventListener(THEME_EVENT, handler)
  }, [])

  // Em 'auto', acompanha mudança de preferência do SO em tempo real (ex.:
  // troca automática de tema do Windows/macOS ao anoitecer) sem precisar
  // recarregar a página.
  useEffect(() => {
    if (theme !== 'auto' || typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyResolved(resolve('auto'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (next: Theme) => {
    persistAndApply(next)
    setThemeState(next)
    window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: next }))
  }

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return { theme, resolvedTheme: resolve(theme), setTheme, toggle }
}
