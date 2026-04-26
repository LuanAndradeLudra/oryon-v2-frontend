import { useState } from 'react'
import { Check, Eye, Pencil, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Markdown → JSX renderer ─────────────────────────────────────────────────

export function renderPromptLine(line: string, i: number) {
  if (line.startsWith('# '))
    return <h1 key={i} className="text-base font-bold text-surface-50 mt-4 mb-1">{line.slice(2)}</h1>
  if (line.startsWith('## '))
    return <h2 key={i} className="text-sm font-semibold text-surface-200 mt-4 mb-1 border-b border-surface-800 pb-1">{line.slice(3)}</h2>
  if (line.startsWith('### '))
    return <h3 key={i} className="text-xs font-semibold text-surface-300 mt-3 mb-0.5 uppercase tracking-wide">{line.slice(4)}</h3>
  if (line.startsWith('• ') || line.startsWith('- '))
    return <li key={i} className="text-xs text-surface-400 leading-relaxed ml-2">{line.slice(2)}</li>
  if (line.trim() === '')
    return <div key={i} className="h-2" />
  // inline bold **text**
  const parts = line.split(/(\*\*[^*]+\*\*)/)
  return (
    <p key={i} className="text-xs text-surface-400 leading-relaxed">
      {parts.map((p, j) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={j} className="text-surface-200 font-semibold">{p.slice(2, -2)}</strong>
          : p
      )}
    </p>
  )
}

// ─── PromptArtifact ───────────────────────────────────────────────────────────

export function PromptArtifact({
  content,
  onChange,
  onRegenerate,
  regenerating,
  readOnly,
  fillHeight,
  previewLines,
  onExpand,
}: {
  content: string
  onChange?: (v: string) => void
  onRegenerate?: () => void
  regenerating?: boolean
  /** Hide Editar/Regenerar controls (Step7 review) */
  readOnly?: boolean
  /** Stretch to fill parent flex container height */
  fillHeight?: boolean
  /**
   * When set, renders only the first N lines of the prompt and replaces the
   * inline edit toggle with a "Visualizar" button that calls `onExpand`.
   * Use for collapsed teasers that delegate full read/edit to a modal.
   */
  previewLines?: number
  /** Handler for the "Visualizar" button — typically opens the full-screen modal. */
  onExpand?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const isPreview = previewLines !== undefined
  const allLines = content.split('\n')
  const visibleLines = isPreview ? allLines.slice(0, previewLines) : allLines
  const hiddenCount = isPreview ? Math.max(0, allLines.length - previewLines) : 0

  return (
    <div className={cn(
      'rounded-xl border border-surface-700 bg-surface-900/60 overflow-hidden',
      fillHeight && 'flex flex-col flex-1 min-h-0',
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-800 flex-shrink-0">
        <Check className="w-3.5 h-3.5 text-status-active" />
        <span className="text-xs font-medium text-surface-300">System Prompt</span>
        <span className="text-[10px] text-surface-600 ml-1">
          {content.length.toLocaleString()} caracteres
        </span>

        {/* Preview mode: Regenerar + Visualizar (no inline edit) */}
        {isPreview && (
          <div className="ml-auto flex items-center gap-1">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-surface-500 hover:text-brand-400 disabled:opacity-40 transition-colors"
              >
                <RotateCcw className={cn('w-3 h-3', regenerating && 'animate-spin')} />
                Regenerar
              </button>
            )}
            {onExpand && (
              <>
                {onRegenerate && <div className="w-px h-4 bg-surface-700 mx-1" />}
                <button
                  type="button"
                  onClick={onExpand}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-surface-700 text-surface-200 hover:bg-surface-600 transition-colors"
                >
                  <Eye className="w-3 h-3" /> Visualizar
                </button>
              </>
            )}
          </div>
        )}

        {/* Read-only mode: optional "Visualizar" (opens full-screen modal) */}
        {!isPreview && readOnly && onExpand && (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onExpand}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-surface-700 text-surface-200 hover:bg-surface-600 transition-colors"
            >
              <Eye className="w-3 h-3" /> Visualizar
            </button>
          </div>
        )}

        {/* Standard mode: Visualizar / Editar toggle + Regenerar */}
        {!isPreview && !readOnly && (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-colors',
                !editing ? 'bg-surface-700 text-surface-200' : 'text-surface-500 hover:text-surface-300',
              )}
            >
              <Eye className="w-3 h-3" /> Visualizar
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-colors',
                editing ? 'bg-surface-700 text-surface-200' : 'text-surface-500 hover:text-surface-300',
              )}
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
            {onRegenerate && (
              <>
                <div className="w-px h-4 bg-surface-700 mx-1" />
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-surface-500 hover:text-brand-400 disabled:opacity-40 transition-colors"
                >
                  <RotateCcw className={cn('w-3 h-3', regenerating && 'animate-spin')} />
                  Regenerar
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {editing && !readOnly && !isPreview ? (
        <textarea
          value={content}
          onChange={e => onChange?.(e.target.value)}
          rows={18}
          className="w-full bg-transparent px-4 py-4 text-xs text-surface-300 font-mono leading-relaxed resize-none focus:outline-none"
        />
      ) : (
        <div className={cn(
          'px-5 py-4',
          fillHeight ? 'flex-1 min-h-0 overflow-y-auto' : isPreview ? '' : 'max-h-[480px] overflow-y-auto',
        )}>
          <ul className="list-none space-y-0">
            {visibleLines.map((line, i) => renderPromptLine(line, i))}
          </ul>
          {isPreview && hiddenCount > 0 && (
            <button
              type="button"
              onClick={onExpand}
              className="mt-3 w-full text-center text-[11px] text-surface-500 hover:text-brand-400 transition py-2 border-t border-dashed border-surface-800"
            >
              ↓ +{hiddenCount} linha{hiddenCount === 1 ? '' : 's'} oculta{hiddenCount === 1 ? '' : 's'} — clique para abrir em tela cheia
            </button>
          )}
        </div>
      )}
    </div>
  )
}
