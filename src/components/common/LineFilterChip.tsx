// Local filter chip for list headers (Templates / Campaigns / Automations
// / Conversations). Holds state in the parent — does NOT persist between
// views — which is the shape every mainstream CRM (Zendesk, HubSpot,
// Intercom, Chatwoot) uses for per-view channel filtering. Global
// "workspace switcher" was rejected after the v3 UX audit because it
// confuses context with filter.
//
// Hidden in single-line tenants (there's nothing to filter by).
// Accepts `'all' | <lineId>` so the consumer can use `value === 'all'`
// to short-circuit filtering.

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Phone, Check, Star, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'

export type LineFilterValue = string | 'all'

function formatPhone(raw?: string | null): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return raw
}

export function LineFilterChip({
  value,
  onChange,
  className,
}: {
  value: LineFilterValue
  onChange: (next: LineFilterValue) => void
  className?: string
}) {
  const { numbers } = useWorkspaceNumber()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Hide in single-line tenants — nothing to filter between.
  if (numbers.length < 2) return null

  const activeLine = value !== 'all' ? numbers.find((n) => n.id === value) : null
  const label = value === 'all'
    ? 'Todas as linhas'
    : activeLine
    ? activeLine.label || formatPhone(activeLine.displayPhoneNumber)
    : 'Todas as linhas'
  const Icon = value === 'all' ? Globe : Phone

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
          'bg-surface-800 border border-surface-700/60 text-surface-200 hover:border-surface-600',
          open && 'border-brand-500/40 ring-2 ring-brand-500/10',
        )}
      >
        <Icon className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown className={cn('w-3 h-3 text-surface-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 rounded-lg border border-surface-700/60 bg-surface-900 shadow-xl z-30 overflow-hidden">
          <ul className="max-h-72 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange('all')
                  setOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                  value === 'all'
                    ? 'bg-brand-500/10 text-surface-100'
                    : 'text-surface-300 hover:bg-surface-800',
                )}
              >
                <Globe className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                <span className="flex-1 font-medium">Todas as linhas</span>
                {value === 'all' && <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />}
              </button>
            </li>
            <li className="mx-3 my-1 border-t border-surface-800/60" />

            {numbers.map((n) => {
              const isActive = value === n.id
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(n.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                      isActive
                        ? 'bg-brand-500/10 text-surface-100'
                        : 'text-surface-300 hover:bg-surface-800',
                    )}
                  >
                    <Phone className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">
                          {n.label || formatPhone(n.displayPhoneNumber)}
                        </span>
                        {n.isPrimary && (
                          <Star className="w-3 h-3 text-brand-cta flex-shrink-0" aria-label="Primária" />
                        )}
                      </div>
                      {n.label && (
                        <div className="text-[10px] text-surface-500 truncate">
                          {formatPhone(n.displayPhoneNumber)}
                        </div>
                      )}
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Tiny helper: does a row match the current local filter? */
export function lineMatches(value: LineFilterValue, row: { whatsappNumberId?: string | null }): boolean {
  if (value === 'all') return true
  // Rows without a line stay visible so the WabaAssignmentBadge can
  // surface — hiding them would make legacy gaps invisible.
  if (!row.whatsappNumberId) return true
  return row.whatsappNumberId === value
}
