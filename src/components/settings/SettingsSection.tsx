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
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
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

/** Índice "Nesta página" — só aparece com 3+ seções e em telas largas. */
export function SettingsOutline() {
  const entries = useContext(EntriesCtx)
  if (entries.length < 3) return null
  return (
    <nav aria-label="Nesta página" className="hidden 2xl:block w-44 flex-shrink-0 sticky top-8 self-start">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600 mb-2">Nesta página</p>
      <ul className="flex flex-col gap-1 border-l border-surface-800/60">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              className="block pl-3 -ml-px border-l border-transparent text-xs text-surface-500 hover:text-surface-100 hover:border-brand-500 transition-colors py-0.5"
            >
              {e.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  const register = useContext(RegisterCtx)
  const id = slugify(title)
  // register é estável (useCallback []) → roda 1x por montagem da seção.
  useEffect(() => register?.({ id, title }), [register, id, title])

  return (
    <section
      id={id}
      className={cn(
        'py-8 first:pt-2 border-b border-surface-800/60 last:border-0 scroll-mt-6',
        'md:grid md:grid-cols-[200px_1fr] md:gap-10 md:items-start',
        className,
      )}
    >
      <div className="mb-4 md:mb-0 md:sticky md:top-2">
        <h3 className="text-sm font-semibold text-surface-100">{title}</h3>
        {description && (
          <p className="text-xs text-surface-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
