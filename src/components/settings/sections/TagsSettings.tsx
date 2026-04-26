import { useCallback, useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Copy } from 'lucide-react'
import axios from 'axios'
import { SectionHeader } from '../SectionHeader'
import { ConfirmModal } from '@/components/ui/Modal'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#64748b', '#84cc16', '#f43f5e',
]

// Simulated usage count
const TAG_USAGE: Record<string, number> = {
  tag1: 8, tag2: 5, tag3: 3, tag4: 7, tag5: 2, tag6: 4,
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className="w-5 h-5 rounded-full border-2 transition-all"
          style={{
            backgroundColor: color,
            borderColor: value === color ? 'white' : 'transparent',
            boxShadow: value === color ? `0 0 0 1px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  )
}

interface TagCardProps {
  tag: Tag
  usageCount: number
  onEdit: (tag: Tag) => void
  onDelete: (tag: Tag) => void
}

function TagCard({ tag, usageCount, onEdit, onDelete }: TagCardProps) {
  const buildContextMenu = useCallback((): ContextMenuEntry[] => [
    { label: 'Editar', icon: Pencil, onClick: () => onEdit(tag) },
    {
      label: 'Copiar nome',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(tag.name).catch(() => {}),
    },
    { separator: true },
    { label: 'Excluir', icon: Trash2, danger: true, onClick: () => onDelete(tag) },
  ], [tag, onEdit, onDelete])
  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <div
      onContextMenu={onContextMenu}
      className="group flex items-center justify-between gap-3 bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 hover:border-surface-700 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0"
          style={{ backgroundColor: tag.color + '33', border: `2px solid ${tag.color}55` }}
        >
          <div className="w-full h-full rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-surface-100">{tag.name}</p>
          <p className="text-xs text-surface-500">{usageCount} conversa{usageCount !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(tag)}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(tag)}
          className="p-1.5 rounded-lg text-surface-400 hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export function TagsSettings() {
  const { toast, toasts, dismiss } = useToast()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editTarget, setEditTarget] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    axios.get<{ data: Tag[] } | Tag[]>(`${API}/tags`).then((r) => {
      setTags(Array.isArray(r.data) ? r.data : r.data.data)
      setLoading(false)
    })
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const r = await axios.post<Tag>(`${API}/tags`, { name: newName.trim(), color: newColor })
      setTags((t) => [...t, r.data])
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      setCreating(false)
      toast('Tag criada!', 'success')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast(typeof msg === 'string' ? msg : 'Erro ao criar tag.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (tag: Tag) => {
    setEditTarget(tag)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  const handleSaveEdit = async () => {
    if (!editTarget || !editName.trim()) return
    setSaving(true)
    try {
      const r = await axios.patch<Tag>(`${API}/tags/${editTarget.id}`, { name: editName.trim(), color: editColor })
      setTags((t) => t.map((x) => x.id === editTarget.id ? r.data : x))
      setEditTarget(null)
      toast('Tag atualizada.', 'success')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast(typeof msg === 'string' ? msg : 'Erro ao atualizar tag.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await axios.delete(`${API}/tags/${deleteTarget.id}`)
    setTags((t) => t.filter((x) => x.id !== deleteTarget.id))
    toast('Tag excluída.', 'success')
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader
        title="Tags"
        description="Organize conversas com etiquetas personalizadas."
        action={
          !creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova tag
            </button>
          )
        }
      />

      {/* Create form */}
      {creating && (
        <div className="bg-surface-900 border border-brand-600/40 rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest mb-3">Nova tag</p>
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da tag"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <ColorPicker value={newColor} onChange={setNewColor} />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCreating(false)}
                className="px-3 py-1.5 text-sm text-surface-400 hover:text-surface-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-surface-950 text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit form */}
      {editTarget && (
        <div className="bg-surface-900 border border-brand-600/40 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest">Editar tag</p>
            <button onClick={() => setEditTarget(null)} className="text-surface-500 hover:text-surface-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
            <ColorPicker value={editColor} onChange={setEditColor} />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditTarget(null)}
                className="px-3 py-1.5 text-sm text-surface-400 hover:text-surface-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-surface-950 text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags list */}
      <div className={cn('grid gap-2', tags.length > 3 ? 'grid-cols-1' : 'grid-cols-1')}>
        {tags.map((tag) => (
          <TagCard
            key={tag.id}
            tag={tag}
            usageCount={TAG_USAGE[tag.id] ?? 0}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {tags.length === 0 && !creating && (
        <div className="text-center py-12 text-surface-500 text-sm">
          Nenhuma tag criada ainda.
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir tag"
        description={`Tem certeza que deseja excluir a tag "${deleteTarget?.name}"? Ela será removida de todas as conversas.`}
        confirmLabel="Excluir"
        danger
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
