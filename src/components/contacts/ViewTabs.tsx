import type { ReactNode } from 'react'
import { Tabs, type TabOption } from '@/components/ui/Tabs'
import { cn } from '@/lib/utils'

// Direção A (DECISOES-PENDENTES #33): segmentos como abas sob a barra. Hoje só
// existe "Todos <n>" — os demais segmentos (Meus, Sem resposta, Quentes, Novos
// hoje…) NÃO são inventados: dependem de dado que a API precisa sustentar
// (responsável, sem resposta, definição de "quente") e da auditoria dos filtros.
// O componente já recebe a lista de visões, então cada uma nova entra como mais
// um item de `views` no chamador, sem mexer aqui.

export interface ContactView {
  id: string
  label: string
  /** Contagem real da visão. Omitida = sem número (nunca inventa). */
  count?: number
}

interface ViewTabsProps {
  views: ContactView[]
  value: string
  onChange: (id: string) => void
  /** Texto mudo à direita (ex.: "ordenado por última interação"). */
  hint?: ReactNode
}

export function ViewTabs({ views, value, onChange, hint }: ViewTabsProps) {
  const tabs: TabOption<string>[] = views.map((v) => ({ id: v.id, label: v.label, count: v.count }))
  return (
    <div className="flex items-end gap-3 px-4 pt-3 border-b border-surface-700 bg-surface-800 flex-shrink-0">
      {/* Mobile: a faixa rola na horizontal (ui/Tabs já tem overflow-x-auto) sem
          mostrar a barra, e em ponteiro grosso cada aba ganha 44px de alto — a
          aba fica com o texto embaixo e o sublinhado no pé, como no desktop. */}
      <Tabs
        tabs={tabs}
        value={value}
        onChange={onChange}
        label="Visões de contatos"
        className={cn(
          'flex-1 min-w-0 border-b-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          '[@media(pointer:coarse)]:[&>[role=tab]]:min-h-11 [@media(pointer:coarse)]:[&>[role=tab]]:items-end',
        )}
      />
      {/* "ordenado por…" só de sm pra cima: em 390 disputaria a largura com as
          abas e empurraria "Quentes" pra fora da tela. */}
      {hint && <span className="hidden sm:inline pb-2 text-[11px] text-surface-500 flex-shrink-0 whitespace-nowrap">{hint}</span>}
    </div>
  )
}
