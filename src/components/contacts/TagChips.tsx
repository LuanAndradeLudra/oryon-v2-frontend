import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { Contact } from '@/types'

/** Etiquetas em chips (até `max`, resto em "+N") — mesma peça na coluna
 *  Etiquetas da tabela, inline na célula Nome e na linha da lista de Leads.
 *  `inline`: sem quebra de linha e chips truncáveis (linha de altura fixa). */
export function TagChips({ tags, max = 2, emptyDash = false, inline = false }: {
  tags: Contact['tags']
  max?: number
  emptyDash?: boolean
  inline?: boolean
}) {
  const list = tags ?? []
  if (list.length === 0) return emptyDash ? <span className="text-surface-500 text-xs">—</span> : null
  return (
    <div className={cn('flex gap-1', inline ? 'items-center flex-nowrap' : 'flex-wrap')}>
      {list.slice(0, max).map((tag) => (
        <span
          key={tag.id}
          className={cn(
            'color-chip inline-flex items-center h-[18px] whitespace-nowrap align-middle text-[10.5px] font-semibold px-[7px] rounded-xs border',
            inline && 'max-w-[96px] min-w-0',
          )}
          style={{ ['--chip']: tag.color } as CSSProperties}
          title={tag.name}
        >
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
      {list.length > max && <span className="text-[11px] text-surface-500 flex-none">+{list.length - max}</span>}
    </div>
  )
}
