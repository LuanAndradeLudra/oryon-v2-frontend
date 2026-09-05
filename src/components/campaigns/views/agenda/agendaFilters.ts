// ─── Filtros da agenda ─────────────────────────────────────────────────────
// "Marketing" e "Utilidade" são categoria do TEMPLATE, não da campanha — o
// registro de campanha só guarda `templateId`/`templateName`. A junção é uma
// chamada cacheada a `templatesApi.list()` (decisão 7 do Maestro).
//
// "Recorrentes" não existe aqui: depende da BE.4, que não foi começada. Um
// chip que nunca acende é ruído, então ele nem entra na lista.
import type { Campaign, TemplateCategoryType } from '@/types'

export type AgendaFilter = 'all' | 'marketing' | 'utility' | 'mine'

export interface AgendaFilterOption {
  value: AgendaFilter
  label: string
}

export const AGENDA_FILTERS: AgendaFilterOption[] = [
  { value: 'all',       label: 'Todas'      },
  { value: 'marketing', label: 'Marketing'  },
  { value: 'utility',   label: 'Utilidade'  },
  { value: 'mine',      label: 'Minhas'     },
]

const CATEGORY_OF: Record<Exclude<AgendaFilter, 'all' | 'mine'>, TemplateCategoryType> = {
  marketing: 'MARKETING',
  utility: 'UTILITY',
}

export function applyFilter(
  campaigns: Campaign[],
  filter: AgendaFilter,
  categories: Map<string, TemplateCategoryType>,
  currentUserId: string | undefined,
): Campaign[] {
  if (filter === 'all') return campaigns
  if (filter === 'mine') {
    // Sem usuário resolvido, "Minhas" não tem como responder — devolve vazio
    // em vez de devolver tudo, que seria mentir sobre o filtro estar ativo.
    if (!currentUserId) return []
    return campaigns.filter((c) => c.createdByUserId === currentUserId)
  }
  const wanted = CATEGORY_OF[filter]
  return campaigns.filter((c) => c.templateId && categories.get(c.templateId) === wanted)
}
