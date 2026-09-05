import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INPUT } from './constants'

// ─── TagInput ─────────────────────────────────────────────────────────────────
// NOTA (extração W0.3): não usado em lugar nenhum hoje (dead code já no
// arquivo original AgentBuilderWizard.tsx). Movido como estava, sem apagar —
// candidato a remoção numa limpeza futura.

export function TagInput({
  tags, onChange, placeholder,
}: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder ?? 'Adicionar e pressionar Enter...'}
          className={INPUT}
        />
        <button
          type="button" onClick={add} disabled={!input.trim()}
          className="px-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-400 hover:text-brand-400 hover:border-brand-500/40 disabled:opacity-40 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="text-surface-600 hover:text-surface-300 transition">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CapabilityPicker ─────────────────────────────────────────────────────────

export function CapabilityPicker({
  selected, onChange, presets, addPlaceholder, color,
}: {
  selected: string[]
  onChange: (items: string[]) => void
  presets: string[]
  addPlaceholder: string
  color: 'green' | 'red'
}) {
  const [custom, setCustom] = useState('')
  const activeCls = color === 'green'
    ? 'bg-status-active-bg border-status-active-border text-status-active ring-1 ring-status-active-border'
    : 'bg-danger/15 border-danger/30 text-danger ring-1 ring-danger/20'
  const idleCls = 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600 hover:text-surface-300'

  const toggle = (item: string) =>
    onChange(selected.includes(item) ? selected.filter(i => i !== item) : [...selected, item])

  const addCustom = () => {
    const v = custom.trim()
    if (v && !selected.includes(v)) onChange([...selected, v])
    setCustom('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map(preset => (
          <button
            key={preset} type="button" onClick={() => toggle(preset)}
            className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', selected.includes(preset) ? activeCls : idleCls)}
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder={addPlaceholder}
          className={INPUT}
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()}
          className="px-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-400 hover:text-brand-400 hover:border-brand-500/40 disabled:opacity-40 transition">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {selected.filter(i => !presets.includes(i)).map(item => (
        <span key={item} className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs', activeCls)}>
          {item}
          <button type="button" onClick={() => onChange(selected.filter(i => i !== item))} className="opacity-60 hover:opacity-100 transition">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
