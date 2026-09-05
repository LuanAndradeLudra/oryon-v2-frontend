// ─── SampleList ────────────────────────────────────────────────────────────
// As 4 linhas de amostra da coluna direita, com o link "ver os N". A amostra
// vem do próprio `evaluate` (campo `sample`, default 4) — não é uma segunda
// chamada. O link entrega a definição corrente para a D2 abrir o
// `ContactListModal` dela, paginado pelo `useAudiencePreview`.
import { Avatar } from '@/components/ui/Avatar'
import type { SegmentSampleContact } from '@/types/campaignsV2'

interface SampleListProps {
  contacts: SegmentSampleContact[]
  /** Total de elegíveis — o N do "ver os N". */
  total: number
  onViewAll?: () => void
  /** Rótulo da situação, quando as Configurações da conta a definem. */
  stageLabel?: (stage: string) => string
}

export function SampleList({ contacts, total, onViewAll, stageLabel }: SampleListProps) {
  if (contacts.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.1em] text-surface-400">Amostra</span>
        {onViewAll && total > contacts.length && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
          >
            ver os {total.toLocaleString('pt-BR')}
          </button>
        )}
      </div>

      <ul className="flex flex-col">
        {contacts.map((contact) => (
          <li
            key={contact.id}
            className="flex gap-2.5 items-center py-2 text-[12.5px] border-b border-surface-800 last:border-b-0"
          >
            <Avatar name={contact.displayName} size="sm" />
            {/* `truncate` sozinho nao corta dentro de um flex: o item so
                encolhe abaixo do proprio conteudo com `min-w-0`. Sem os dois
                juntos, um nome longo continua empurrando a coluna. */}
            <span className="font-semibold text-surface-100 truncate min-w-0">{contact.displayName}</span>
            {contact.stage && (
              <span className="text-[10px] px-1.5 rounded border border-surface-700 text-surface-400 flex-shrink-0">
                {stageLabel?.(contact.stage) ?? contact.stage}
              </span>
            )}
            <span className="text-surface-500 ml-auto text-[11px] whitespace-nowrap font-mono">
              {contact.waId}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
