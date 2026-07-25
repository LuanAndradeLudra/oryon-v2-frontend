import { useState, type RefObject } from 'react'
import { StickyNote } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { MockBadge } from './MockBadge'
import { useAuth } from '@/contexts/AuthContext'

interface TimelineComposerProps {
  onSubmit: (body: string) => void
  /** Ref externa para o header poder focar o campo ("+ Nota"). */
  textareaRef?: RefObject<HTMLTextAreaElement | null>
}

/**
 * Composer de nota no topo da timeline (padrão HubSpot). Fase visual-only:
 * a nota vive em memória na página — o selo deixa isso explícito.
 */
export function TimelineComposer({ onSubmit, textareaRef }: TimelineComposerProps) {
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Você'

  const submit = () => {
    const trimmed = body.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setBody('')
  }

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-800 p-3 transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30">
      <div className="flex items-start gap-3">
        <Avatar name={userName} imageUrl={user?.avatarUrl} size="sm" />
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() }
          }}
          aria-label="Nova nota interna"
          placeholder="Escreva uma nota interna sobre este contato..."
          rows={2}
          className="flex-1 min-w-0 resize-none bg-transparent text-sm text-surface-100 placeholder:text-surface-500 outline-none pt-1"
        />
      </div>
      <div className="flex items-center justify-between mt-2 pl-11">
        <MockBadge />
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<StickyNote className="w-3.5 h-3.5" />}
          onClick={submit}
          disabled={!body.trim()}
        >
          Adicionar nota
        </Button>
      </div>
    </div>
  )
}
