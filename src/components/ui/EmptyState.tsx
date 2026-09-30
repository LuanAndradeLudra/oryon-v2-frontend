// ─── Empty State ───────────────────────────────────────────────────────────
// Replaces three near-duplicates that lived inline in SkillsTab,
// SkillTemplatesPage and AssignSkillPage.
//
// SCRUM-1097 — spec/1a-primitivos.md EMPTY-01..05 (HTML do canvas, README e
// os dois PNGs concordam): moldura TRACEJADA `--bd2`, raio 8, padding 18/16,
// alinhado à ESQUERDA (não centrado), gap 6px; ícone 20px stroke 1.75 em
// --tx3; título 13/600; dica 12px --tx2; CTA = Button `neutral sm`
// ("deliberadamente não teal"). Uma leitura anterior da referência tinha
// descrito "sem moldura, botão secondary" — estava errada; EMPTY-06.

import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

type Action =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never }

interface Props {
  icon: LucideIcon
  title: string
  hint?: string
  /** Optional CTA — renders an `<a>` if `href` is set, else a `<button>`. */
  action?: Action
  /** Override outer padding when a tighter empty area is needed. */
  className?: string
  /** Override the icon's default `text-surface-600` — e.g. a categorical
   *  accent token (`{ color: 'var(--color-accent-violet)' }`) when the empty
   *  state is about a specific themed feature (agentes IA, funil de
   *  processo…). Inline style, not a class, to match how accent tokens are
   *  used elsewhere in the app (chips, MiniBar) — Tailwind isn't configured
   *  for `var(--color-accent-*)` as a class name here. */
  iconStyle?: React.CSSProperties
}

export function EmptyState({ icon: Icon, title, hint, action, className, iconStyle }: Props) {
  return (
    <div
      className={cn(
        'mt-3 flex flex-col items-start gap-1.5 py-[18px] px-4 rounded-lg border border-dashed border-[var(--bd2)]',
        className,
      )}
    >
      <Icon className="w-5 h-5 text-surface-500" style={iconStyle} strokeWidth={1.75} />
      <p className="text-[13px] font-semibold text-surface-100">{title}</p>
      {hint && <p className="text-xs text-surface-400 leading-normal max-w-md">{hint}</p>}
      {action && (
        <div className="mt-1">
          {'href' in action && action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center justify-center h-7 px-2.5 text-xs gap-1.5 rounded-sm bg-surface-800 text-surface-100 font-semibold border border-[var(--bd2)] hover:bg-[var(--rowhover)] transition-all"
            >
              {action.label}
            </a>
          ) : (
            <Button type="button" variant="neutral" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
