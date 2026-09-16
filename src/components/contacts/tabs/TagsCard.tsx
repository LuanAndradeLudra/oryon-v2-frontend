import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TagPickerContent } from '@/components/ui/TagPicker'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { useTags } from '@/contexts/TagsContext'
import { cn } from '@/lib/utils'
import type { Contact, Tag } from '@/types'

interface TagsCardProps {
  contact: Contact
  onAddTag: (tag: Tag) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
  /** Esconde o título "Etiquetas" quando uma seção já o rotula (ex.: acordeão da ficha completa). */
  hideTitle?: boolean
}

export function TagsCard({ contact, onAddTag, onRemoveTag, hideTitle = false }: TagsCardProps) {
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

  const actions = (
    <button
      type="button"
      onClick={() => setPickerOpen(true)}
      className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
    >
      <Plus className="w-3 h-3" />
      Gerenciar
    </button>
  )

  const body = (
    <>
      {selectedTags.length === 0 ? (
          <p className="text-xs text-surface-600">
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
    </>
  )

  return (
    <>
      {hideTitle ? (
        <div>
          <div className="flex items-center justify-end mb-2">{actions}</div>
          {body}
        </div>
      ) : (
        <CollapsibleSection
          title="Etiquetas"
          count={selectedTags.length > 0 ? selectedTags.length : undefined}
          storageKey="contact-drawer.tags"
          actions={actions}
        >
          {body}
        </CollapsibleSection>
      )}

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
