import { useState } from 'react'
import { Check, Edit3, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentConfig } from '@/services/agentsApi'
import { STATUS_CONFIG } from './constants'

// ─── Status badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: AgentConfig['status'] }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="color-chip inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ ['--chip']: cfg.chip } as React.CSSProperties}
    >
      <span className="chip-dot w-1.5 h-1.5 rounded-full" />
      {cfg.label}
    </span>
  )
}

// ─── Inline editable field ────────────────────────────────────────────────────

export function InlineEdit({
  value,
  onSave,
  className,
}: {
  value: string
  onSave: (v: string) => Promise<void>
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft.trim()); setEditing(false) } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          className="bg-surface-800 border border-brand-500/50 rounded-lg px-2 py-1 text-sm font-semibold text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <button onClick={handleSave} disabled={saving} className="p-1 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition">
          <Check className="w-3.5 h-3.5 text-white" />
        </button>
        <button onClick={() => { setDraft(value); setEditing(false) }} className="p-1 rounded-lg hover:bg-surface-700 transition">
          <X className="w-3.5 h-3.5 text-surface-400" />
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => { setDraft(value); setEditing(true) }} className={cn('group flex items-center gap-1.5 hover:text-surface-50 transition-colors', className)}>
      {value}
      <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  )
}
