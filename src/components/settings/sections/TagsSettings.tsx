import { useCallback, useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Copy, Tag as TagIcon } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import type { Tag } from '@/types'
import { api } from '@/services/api'


// Simulated usage count
const TAG_USAGE: Record<string, number> = {
  tag1: 8, tag2: 5, tag3: 3, tag4: 7, tag5: 2, tag6: 4,
}

interface TagCardProps {
  tag: Tag
  usageCount: number
  onEdit: (tag: Tag) => void
  onDelete: (tag: Tag) => void
  /** When false, the card stays visible but the edit/delete affordances
   *  are hidden — matches the backend's `@Roles(ADMIN, BUSINESS_ADMIN)`
   *  guard on PATCH/DELETE /tags so non-admins don't see actions that
   *  would 403. */
  canManage: boolean
}

function TagCard({ tag, usageCount, onEdit, onDelete, canManage }: TagCardProps) {
  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const entries: ContextMenuEntry[] = [
      {
        label: 'Copiar nome',
        icon: Copy,
        onClick: () => navigator.clipboard.writeText(tag.name).catch(() => {}),
      },
    ]
    if (canManage) {
      entries.unshift({ label: 'Editar', icon: Pencil, onClick: () => onEdit(tag) })
      entries.push(
        { separator: true },
        { label: 'Excluir', icon: Trash2, danger: true, onClick: () => onDelete(tag) },
      )
    }
    return entries
  }, [tag, onEdit, onDelete, canManage])
  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    // Gramática nova: linha de lista sem card — assenta direto no fundo,
    // separada por hairline (divide-y no container), hover sutil.
    <div
      onContextMenu={onContextMenu}
      className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-900/60 transition-colors"
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
      {canManage && (
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
      )}
    </div>
  )
}

export function TagsSettings() {
  const { toast } = useToast()
  const { user: actor } = useAuth()
  // Mirror the backend's @Roles(ADMIN, BUSINESS_ADMIN) on POST/PATCH/DELETE
  // /tags. Read-only access (GET /tags) is open, so non-admins still see
  // the section to know which tags exist — they just can't mutate.
  const canManageTags = isAdminTier(actor?.role)
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(DEFAULT_ENTITY_COLOR)
  const [editTarget, setEditTarget] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setFetchError(false)
    api.get<{ data: Tag[] } | Tag[]>('/tags').then((r) => {
      setTags(Array.isArray(r.data) ? r.data : r.data.data)
      setLoading(false)
    }).catch(() => {
      setFetchError(true)
      setLoading(false)
    })
  }, [reloadKey])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const r = await api.post<Tag>('/tags', { name: newName.trim(), color: newColor })
      setTags((t) => [...t, r.data])
      setNewName('')
      setNewColor(DEFAULT_ENTITY_COLOR)
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
      const r = await api.patch<Tag>(`/tags/${editTarget.id}`, { name: editName.trim(), color: editColor })
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
    try {
      await api.delete(`/tags/${deleteTarget.id}`)
      setTags((t) => t.filter((x) => x.id !== deleteTarget.id))
      toast('Tag excluída.', 'success')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast(typeof msg === 'string' ? msg : 'Erro ao excluir tag.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div>
        <SectionHeader title="Tags" description="Organize conversas com etiquetas personalizadas." />
        <SkeletonList items={5} />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div>
        <SectionHeader title="Tags" description="Organize conversas com etiquetas personalizadas." />
        <ErrorState compact onRetry={() => { setLoading(true); setReloadKey((k) => k + 1) }} />
      </div>
    )
  }

  return (
    <div>
      <SectionHeader
        title="Tags"
        description="Organize conversas com etiquetas personalizadas."
        action={
          canManageTags && !creating ? (
            <Button onClick={() => setCreating(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Nova tag
            </Button>
          ) : null
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
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                loading={saving}
                disabled={!newName.trim()}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Criar
              </Button>
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
              <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button
                onClick={handleSaveEdit}
                loading={saving}
                disabled={!editName.trim()}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tags list */}
      <div className="divide-y divide-surface-800/60">
        {tags.map((tag) => (
          <TagCard
            key={tag.id}
            tag={tag}
            usageCount={TAG_USAGE[tag.id] ?? 0}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
            canManage={canManageTags}
          />
        ))}
      </div>

      {tags.length === 0 && !creating && (
        <EmptyState
          icon={TagIcon}
          title="Nenhuma tag criada ainda"
          hint="Crie etiquetas para organizar e filtrar suas conversas."
          action={canManageTags ? { label: 'Nova tag', onClick: () => setCreating(true) } : undefined}
        />
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
    </div>
  )
}
