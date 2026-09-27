import { useState } from 'react'
import { Eye, Pencil, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
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
    <div className="rounded-lg border border-surface-700 bg-[var(--sf2)] overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-700 flex-shrink-0">
        {title && (
          <>
            <FileText className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-xs font-medium text-surface-300 truncate">{title}</span>
          </>
        )}
        <span className={cn('text-2xs tabular-nums text-surface-500 flex-shrink-0', title && 'ml-1')}>
          {content.length.toLocaleString()} caracteres
        </span>

        {!readOnly && (
          <SegmentedControl
            className="ml-auto"
            label="Modo do documento"
            value={editing ? 'editar' : 'ver'}
            onChange={(v) => setEditing(v === 'editar')}
            options={[
              { value: 'ver', label: 'Ler', icon: Eye },
              { value: 'editar', label: 'Editar', icon: Pencil },
            ]}
          />
        )}
      </div>

      {/* Content */}
      {editing && !readOnly ? (
        <textarea
          value={content}
          onChange={e => onChange?.(e.target.value)}
          aria-label="Conteúdo do documento"
          className="w-full bg-transparent px-4 py-4 text-xs text-surface-200 font-mono leading-relaxed resize-y focus:outline-none"
          style={{ minHeight: 220, maxHeight: 480 }}
        />
      ) : (
        <div className="px-5 py-4 overflow-y-auto max-h-[480px]">
          {content.trim() ? (
            <ul className="list-none space-y-0">
              {lines.map((line, i) => renderPromptLine(line, i))}
            </ul>
          ) : (
            <p className="text-xs text-surface-400">Nenhum conteúdo extraído.</p>
          )}
        </div>
      )}

      {/* Footer — save/cancel actions */}
      {!readOnly && (onSave || onCancel) && (
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-surface-700 flex-shrink-0">
          {onCancel && (
            <Button type="button" variant="neutral" size="sm" onClick={onCancel}>Fechar</Button>
          )}
          {onSave && (
            <Button type="button" size="sm" onClick={onSave} loading={saving}>Salvar alterações</Button>
          )}
        </div>
      )}
    </div>
  )
}
