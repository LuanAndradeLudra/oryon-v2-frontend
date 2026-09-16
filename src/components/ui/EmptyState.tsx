// ─── Empty State ───────────────────────────────────────────────────────────
// Replaces three near-duplicates that lived inline in SkillsTab,
// SkillTemplatesPage and AssignSkillPage.
//
// SCRUM-1097 (reauditoria de fidelidade) — tela 1a mostra ícone + texto +
// botão soltos no fundo do painel, sem moldura nenhuma; a caixa tracejada
// era vocabulário antigo. O CTA agora reusa o `Button` real (variant
// secondary — mesmo peso visual do exemplo "Iniciar conversa" do mockup),
// não um botão escrito à mão.

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
        'flex flex-col items-center justify-center text-center py-[18px] px-4',
        className,
      )}
    >
      <Icon className="w-10 h-10 text-surface-600 mb-3" style={iconStyle} strokeWidth={1.5} />
      <p className="text-surface-300 font-medium mb-1">{title}</p>
      {hint && <p className="text-sm text-surface-500 max-w-md">{hint}</p>}
      {action && (
        <div className="mt-4">
          {'href' in action && action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center justify-center h-7 px-3 text-xs gap-1.5 rounded-sm bg-accent-soft text-accent-dark font-medium hover:brightness-110 transition-all"
            >
              {action.label}
            </a>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
