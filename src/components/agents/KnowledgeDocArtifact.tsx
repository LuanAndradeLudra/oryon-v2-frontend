import { useState } from 'react'
import { Eye, Pencil, FileText, Loader2, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { renderPromptLine } from './PromptArtifact'

// ─── KnowledgeDocArtifact ────────────────────────────────────────────────────
// Visual editor for knowledge base documents and brand files,
// following the same pattern as PromptArtifact (toolbar + Visualizar/Editar toggle).

export function KnowledgeDocArtifact({
  title,
  content,
  onChange,
  onSave,
  onCancel,
  saving,
  readOnly,
}: {
  title: string
  content: string
  onChange?: (v: string) => void
  onSave?: () => void
  onCancel?: () => void
  saving?: boolean
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const lines = content.split('\n')

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900/60 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-800 flex-shrink-0">
        {title && (
          <>
            <FileText className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-xs font-medium text-surface-300 truncate">{title}</span>
          </>
        )}
        <span className={cn('text-[10px] text-surface-600 flex-shrink-0', title && 'ml-1')}>
          {content.length.toLocaleString()} caracteres
        </span>

        {!readOnly && (
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
          </div>
        )}
      </div>

      {/* Content */}
      {editing && !readOnly ? (
        <textarea
          value={content}
          onChange={e => onChange?.(e.target.value)}
          className="w-full bg-transparent px-4 py-4 text-xs text-surface-300 font-mono leading-relaxed resize-y focus:outline-none"
          style={{ minHeight: 220, maxHeight: 480 }}
        />
      ) : (
        <div className="px-5 py-4 overflow-y-auto max-h-[480px]">
          {content.trim() ? (
            <ul className="list-none space-y-0">
              {lines.map((line, i) => renderPromptLine(line, i))}
            </ul>
          ) : (
            <p className="text-xs text-surface-600 italic">Nenhum conteúdo extraído.</p>
          )}
        </div>
      )}

      {/* Footer — save/cancel actions */}
      {!readOnly && (onSave || onCancel) && (
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-surface-800 flex-shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-400 hover:text-surface-200 transition"
            >
              <X className="w-3 h-3" /> Fechar
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-950 transition disabled:opacity-50"
              style={{ background: 'linear-gradient(40deg, var(--color-surface-50), var(--color-surface-300))' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar alterações
            </button>
          )}
        </div>
      )}
    </div>
  )
}
