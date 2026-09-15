import { useState } from 'react'
import { Tag as TagIcon, X, Plus, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TagPickerContent } from '@/components/ui/TagPicker'
import { useTags } from '@/contexts/TagsContext'
import { cn } from '@/lib/utils'
import type { Contact, Tag } from '@/types'

interface TagsCardProps {
  contact: Contact
  onAddTag: (tag: Tag) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
}

export function TagsCard({ contact, onAddTag, onRemoveTag }: TagsCardProps) {
  // Cache compartilhado (TagsContext) — antes era um fetch local próprio
  // deste card, então uma tag criada aqui só aparecia em Conversas/CRM
  // depois de logout/login (e vice-versa).
  const { tags: allTags, loadingTags: loadingAll, createTag, deleteTag } = useTags()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const selectedTags = contact.tags ?? []

  const handleRemoveOnCard = async (tagId: string) => {
    setRemovingId(tagId)
    try {
      await onRemoveTag(tagId)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <>
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-surface-500" />
            <h3 className="text-sm font-semibold text-surface-100">Etiquetas</h3>
            {selectedTags.length > 0 && (
              <span className="text-[11px] text-surface-500">{selectedTags.length}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Gerenciar
          </button>
        </div>

        {selectedTags.length === 0 ? (
          <p className="text-xs text-surface-500 italic">
            Nenhuma etiqueta atribuída. Use "Gerenciar" para adicionar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <span
                key={tag.id}
                className="color-chip inline-flex items-center gap-1.5 whitespace-nowrap text-xs px-2 py-1 rounded-full font-medium border"
                style={{ ['--chip']: tag.color } as React.CSSProperties}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full chip-dot"
                />
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemoveOnCard(tag.id)}
                  disabled={removingId === tag.id}
                  aria-label={`Remover ${tag.name}`}
                  className={cn(
                    'ml-0.5 rounded-full transition-opacity',
                    removingId === tag.id ? 'opacity-50' : 'hover:opacity-70',
                  )}
                >
                  {removingId === tag.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Gerenciar etiquetas"
        className="max-w-md"
      >
        {loadingAll ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          </div>
        ) : (
          <TagPickerContent
            allTags={allTags}
            selectedTags={selectedTags}
            onAdd={(tag) => {
              void onAddTag(tag)
            }}
            onRemove={(tagId) => {
              void onRemoveTag(tagId)
            }}
            onCreate={createTag}
            onDelete={deleteTag}
          />
        )}
      </Modal>
    </>
  )
}
