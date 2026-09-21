// ─── Settings Section + Page Outline ─────────────────────────────────────────
// Gramática canônica (2 colunas, hairlines, zero cards) + registro automático
// de seções: cada SettingsSection se anuncia e o layout renderiza um índice
// "Nesta página" no rail direito (padrão Stripe/docs enterprise).
//
// DOIS contextos de propósito: RegisterCtx carrega só a função (estável —
// useCallback sem deps), EntriesCtx carrega a lista. Se as seções consumissem
// um contexto único contendo `entries`, cada registro mudaria o contexto e
// re-dispararia o effect de registro de todas as seções → loop infinito de
// register/unregister (foi exatamente o bug que congelava a troca de abas).

import {
  createContext, useCallback, useContext, useEffect, useState,
  type ComponentType, type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')

interface OutlineEntry { id: string; title: string }
type RegisterFn = (e: OutlineEntry) => () => void

const RegisterCtx = createContext<RegisterFn | null>(null)

const EntriesCtx = createContext<OutlineEntry[]>([])

export function SettingsSectionsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<OutlineEntry[]>([])
  const register = useCallback<RegisterFn>((e) => {
    setEntries((prev) => (prev.some((p) => p.id === e.id) ? prev : [...prev, e]))
    return () => setEntries((prev) => prev.filter((p) => p.id !== e.id))
  }, [])
  return (
    <RegisterCtx.Provider value={register}>
      <EntriesCtx.Provider value={entries}>{children}</EntriesCtx.Provider>
    </RegisterCtx.Provider>
  )
}

/** Índice "Nesta página" — só aparece com 3+ seções e em telas largas.
 *  Scroll-spy via IntersectionObserver: o item da seção mais visível no
 *  momento fica ativo (README §3.9 "Nesta página" — item ativo em 600 +
 *  inset 2px de acento, igual ao padrão já usado no item de nav da
 *  sidebar esquerda, SettingsSidebarItem). */
export function SettingsOutline() {
  const entries = useContext(EntriesCtx)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (entries.length < 3) return
    const sections = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => !!el)
    if (sections.length === 0) return

    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio)
          else visible.delete(entry.target.id)
        }
        if (visible.size === 0) return
        const top = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]
        setActiveId(top[0])
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: [0, 0.5, 1] },
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [entries])

  if (entries.length < 3) return null
  return (
    <nav aria-label="Nesta página" className="hidden xl:block w-[180px] flex-shrink-0 sticky top-8 self-start">
      <p className="text-[10px] font-bold uppercase text-surface-500 mb-1" style={{ letterSpacing: '.14em' }}>Nesta página</p>
      <ul className="flex flex-col gap-1.5">
        {entries.map((e) => {
          const isActive = e.id === activeId
          return (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className={cn(
                  'block text-xs transition-colors',
                  isActive
                    ? 'pl-[10px] font-semibold text-surface-100 shadow-[inset_2px_0_0_0_var(--color-brand-500)]'
                    : 'pl-[10px] text-surface-500 hover:text-surface-100',
                )}
              >
                {e.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  /** Largura da coluna do rótulo em px (default 260 — canvas 2e; o 6a usa 220). */
  labelWidth?: number
  /** Padding vertical do canvas 6a (18/16) em vez do 2e (26/22). */
  dense?: boolean
  /** Ícone exclusivo do eixo conceitual desta seção, tingido com `accentColor`.
   *  Omitido na maioria das seções (identidade puramente tipográfica) — só
   *  vale a pena quando a seção precisa se diferenciar de uma vizinha visualmente
   *  quase idêntica (ex. "Situação do contato" vs. "Etapas" de Funis, F-CONF-02). */
  icon?: ComponentType<{ className?: string; style?: React.CSSProperties }>
  /** Cor do acento (ex. 'var(--color-accent-cyan)') aplicada ao `icon`. Sem
   *  efeito se `icon` não for passado. */
  accentColor?: string
}

export function SettingsSection({ title, description, children, className, labelWidth = 260, dense = false, icon: Icon, accentColor }: SettingsSectionProps) {
  const register = useContext(RegisterCtx)
  const id = slugify(title)
  // register é estável (useCallback []) → roda 1x por montagem da seção.
  useEffect(() => register?.({ id, title }), [register, id, title])

  return (
    <section
      id={id}
      className={cn(
        dense ? 'pt-4 pb-4 first:pt-[18px]' : 'pt-[26px] pb-[22px]',
        'border-b border-surface-700 last:border-0 scroll-mt-6',
        'md:grid md:grid-cols-[var(--label-w)_1fr] md:gap-6 md:items-start',
        className,
      )}
      style={{ ['--label-w' as string]: `${labelWidth}px` }}
    >
      <div className="mb-4 md:mb-0 md:sticky md:top-2">
        <h3 className="text-[13px] font-semibold text-surface-100 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={accentColor ? { color: accentColor } : undefined} />}
          {title}
        </h3>
        {description && (
          <p className="text-xs text-surface-400 mt-[3px] leading-[1.5]">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
