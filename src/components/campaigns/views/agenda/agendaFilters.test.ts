import { describe, it, expect } from 'vitest'
import { applyFilter } from './agendaFilters'
import type { Campaign, CampaignStatus, TemplateCategoryType } from '@/types'

function campaign(over: Partial<Campaign> & { id: string }): Campaign {
  return {
    tenantId: 't1',
    name: `Disparo ${over.id}`,
    templateId: 'tpl-1',
    templateName: 'template_teste',
    segment: { type: 'all' },
    variableMappings: [],
    status: 'scheduled' as CampaignStatus,
    stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
    createdByUserId: 'u1',
    createdAt: new Date(2026, 8, 1).toISOString(),
    ...over,
  } as Campaign
}

const mkt = campaign({ id: 'm', templateId: 'tpl-mkt' })
const util = campaign({ id: 'u', templateId: 'tpl-util' })
const semTemplate = campaign({ id: 's', templateId: undefined })
const minha = campaign({ id: 'x', templateId: 'tpl-mkt', createdByUserId: 'eu' })

const categories = new Map<string, TemplateCategoryType>([
  ['tpl-mkt', 'MARKETING'],
  ['tpl-util', 'UTILITY'],
])

describe('applyFilter', () => {
  it('"Todas" não filtra nada', () => {
    const todas = [mkt, util, semTemplate]
    expect(applyFilter(todas, 'all', categories, 'eu')).toBe(todas)
  })

  it('separa por categoria do template', () => {
    expect(applyFilter([mkt, util], 'marketing', categories, 'eu').map((c) => c.id)).toEqual(['m'])
    expect(applyFilter([mkt, util], 'utility', categories, 'eu').map((c) => c.id)).toEqual(['u'])
  })

  it('campanha cujo template não está no mapa fica fora da categoria', () => {
    // Acontece de verdade: o backend corta os templates em 500.
    expect(applyFilter([semTemplate], 'marketing', categories, 'eu')).toEqual([])
  })

  it('"Minhas" sem usuário resolvido devolve vazio, não a lista inteira', () => {
    // Devolver tudo mentiria que o filtro está ativo.
    expect(applyFilter([mkt, minha], 'mine', categories, undefined)).toEqual([])
  })

  it('"Minhas" casa pelo criador', () => {
    expect(applyFilter([mkt, minha], 'mine', categories, 'eu').map((c) => c.id)).toEqual(['x'])
  })
})
