import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  /** Contador opcional ao lado do título: "Tags (3)". */
  count?: number
  defaultOpen?: boolean
  /** Persiste aberto/fechado em localStorage (ex.: 'profile.about'). */
  storageKey?: string
  /** Slot à direita do header (badge, botão). Não dispara o toggle. */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

function readStored(storageKey: string | undefined, fallback: boolean): boolean {
  if (!storageKey) return fallback
  try {
    const raw = localStorage.getItem(`collapsible:${storageKey}`)
    return raw === null ? fallback : raw === '1'
  } catch {
    return fallback
  }
}

/**
 * Seção de painel acordeão (padrão Pipedrive "sidebar sections"): desenhada
 * para viver DENTRO de uma superfície única (painel com divide-y), não solta
 * no canvas — o caller empilha várias num container
 * `rounded-2xl border bg-surface-900 divide-y divide-surface-700`.
 *
 * Título em eyebrow (nível ESTRUTURAL, um degrau acima dos títulos text-sm
 * dos cards internos — evita dois headers idênticos empilhados). Ordem no
 * header: título → chevron (colados, ambos no hit-area do toggle) → actions
 * (rightmost, fora do toggle). Mesmo inset horizontal (px-3) no header e no
 * conteúdo. Estado persistido por storageKey.
 */
export function CollapsibleSection({
  title, count, defaultOpen = true, storageKey, actions, children, className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => readStored(storageKey, defaultOpen))

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (storageKey) {
        try { localStorage.setItem(`collapsible:${storageKey}`, next ? '1' : '0') } catch { /* quota/private mode */ }
      }
      return next
    })
  }

  return (
    <section className={className}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left px-3 py-2.5 cursor-pointer group"
        >
          <span className="eyebrow truncate text-surface-400 group-hover:text-surface-200 transition-colors">
            {title}
            {typeof count === 'number' && (
              <span className="ml-1.5 text-surface-500 tabular-nums normal-case tracking-normal">({count})</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-surface-500 group-hover:text-surface-300 transition-transform duration-150 flex-shrink-0',
              !open && '-rotate-90',
            )}
          />
        </button>
        {actions && <div className="flex items-center gap-1.5 flex-shrink-0 pr-3">{actions}</div>}
      </div>
      {open && <div className="px-3 pb-3 flex flex-col gap-3">{children}</div>}
    </section>
  )
}
