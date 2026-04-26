import { useState } from 'react'
import { Search, Check, X, Plus, Trash2, Loader2 } from 'lucide-react'
import { Dropdown } from './Dropdown'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#64748b', '#84cc16', '#f43f5e',
]

interface TagPickerContentProps {
  allTags: Tag[]
  selectedTags: Tag[]
  onAdd: (tag: Tag) => void
  onRemove: (tagId: string) => void
  onCreate?: (name: string, color: string) => Promise<Tag>
  onDelete?: (tagId: string) => Promise<void>
}

interface TagPickerProps extends TagPickerContentProps {
  anchor: React.ReactNode
  open: boolean
  onClose: () => void
  align?: 'left' | 'right'
}

/**
 * The picker UI without any chrome (no dropdown / modal wrapper).
 * Use this directly when you need to host the picker inside a Modal so it
 * can render free of any narrow-panel clipping context.
 */
export function TagPickerContent({
  allTags, selectedTags, onAdd, onRemove, onCreate, onDelete,
}: TagPickerContentProps) {
  const [search, setSearch]           = useState('')
  const [creating, setCreating]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [newColor, setNewColor]       = useState(PRESET_COLORS[0])
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [hoverId, setHoverId]         = useState<string | null>(null)

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )
  const isSelected = (id: string) => selectedTags.some((t) => t.id === id)

  const handleCreate = async () => {
    if (!newName.trim() || !onCreate) return
    setSaving(true)
    try {
      const tag = await onCreate(newName.trim(), newColor)
      onAdd(tag)
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation()
    if (!onDelete) return
    setDeletingId(tagId)
    try {
      await onDelete(tagId)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* Search / header */}
      {!creating && (
        <div className="p-2 border-b border-surface-700 flex items-center gap-1.5">
          <div className="flex items-center gap-2 bg-surface-900 rounded-lg px-2.5 py-1.5 flex-1">
            <Search className="w-3.5 h-3.5 text-surface-500" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar etiqueta..."
              className="flex-1 bg-transparent text-xs text-surface-200 placeholder:text-surface-500 outline-none min-w-0"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-3 h-3 text-surface-500 hover:text-surface-300" />
              </button>
            )}
          </div>
          {onCreate && (
            <button
              onClick={() => setCreating(true)}
              className="w-7 h-7 rounded-lg bg-brand-600 hover:bg-brand-500 flex items-center justify-center flex-shrink-0 transition-colors"
              title="Nova etiqueta"
            >
              <Plus className="w-3.5 h-3.5 text-surface-950" />
            </button>
          )}
        </div>
      )}

      {/* Create new tag form */}
      {creating && (
        <div className="p-3 border-b border-surface-700">
          <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wide mb-2">
            Nova etiqueta
          </p>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="Nome da etiqueta..."
            maxLength={30}
            className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 outline-none focus:border-brand-500 transition-colors"
          />

          {/* Color swatches */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={cn(
                  'w-5 h-5 rounded-full transition-all',
                  newColor === color && 'ring-2 ring-white ring-offset-1 ring-offset-surface-800 scale-110'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Preview */}
          {newName && (
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-[10px] text-surface-500">Prévia:</span>
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: newColor + '28', color: newColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: newColor }} />
                {newName}
              </span>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setCreating(false)}
              className="flex-1 py-1.5 rounded-lg text-xs text-surface-400 hover:bg-surface-700 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || saving}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                newName.trim()
                  ? 'bg-brand-600 text-surface-950 hover:bg-brand-500'
                  : 'bg-surface-700 text-surface-500 cursor-not-allowed'
              )}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Criar
            </button>
          </div>
        </div>
      )}

      {/* Selected tags chips */}
      {!creating && selectedTags.length > 0 && (
        <div className="px-2 pt-2 pb-1 flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: tag.color + '28', color: tag.color }}
            >
              {tag.name}
              <button onClick={() => onRemove(tag.id)}>
                <X className="w-2.5 h-2.5 hover:opacity-60" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tag list */}
      {!creating && (
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-surface-500 py-4">
              {search ? 'Nenhuma etiqueta encontrada' : 'Nenhuma etiqueta criada'}
            </p>
          ) : (
            filtered.map((tag) => {
              const selected = isSelected(tag.id)
              const isDeleting = deletingId === tag.id
              return (
                <div
                  key={tag.id}
                  className="flex items-center group"
                  onMouseEnter={() => setHoverId(tag.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <button
                    onClick={() => selected ? onRemove(tag.id) : onAdd(tag)}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-between px-3 py-2 hover:bg-surface-700 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className={cn('text-sm', selected ? 'text-surface-100' : 'text-surface-300')}>
                        {tag.name}
                      </span>
                    </div>
                    {selected && !isDeleting && (
                      <Check className="w-3.5 h-3.5 text-brand-400" />
                    )}
                  </button>

                  {/* Delete tag (global) */}
                  {onDelete && (hoverId === tag.id || isDeleting) && (
                    <button
                      onClick={(e) => handleDelete(e, tag.id)}
                      disabled={isDeleting}
                      className="px-2 py-2 text-surface-500 hover:text-danger transition-colors flex-shrink-0"
                      title="Excluir etiqueta"
                    >
                      {isDeleting
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </>
  )
}

/**
 * Dropdown wrapper around <TagPickerContent>. Use when you have an anchor
 * inside a roomy container; for narrow panels prefer hosting
 * <TagPickerContent> inside a Modal so it's not clipped.
 */
export function TagPicker({
  anchor, open, onClose, align = 'left',
  ...content
}: TagPickerProps) {
  return (
    <Dropdown open={open} onClose={onClose} anchor={anchor} align={align} className="w-68">
      <TagPickerContent {...content} />
    </Dropdown>
  )
}
