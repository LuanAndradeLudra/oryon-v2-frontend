import { describe, it, expect } from 'vitest'
import { KPI_CATALOG, DEFAULT_KPI_SLOTS, migrarFaixaDaAuditoria } from './dashboard'

describe('auditoria 12/11 — catálogo e faixa salva dos Relatórios', () => {
  it('o padrão só tem indicadores do catálogo (nenhum "agora")', () => {
    const ids = new Set(KPI_CATALOG.map((k) => k.id as string))
    for (const id of DEFAULT_KPI_SLOTS) expect(ids.has(id)).toBe(true)
    for (const agora of ['active_conversations', 'queued', 'agents_online']) expect(ids.has(agora)).toBe(false)
  })

  it('troca o tempo de resposta misturado pela 1ª resposta da IA e põe os novos ao lado dos vizinhos', () => {
    expect(migrarFaixaDaAuditoria(['resolved', 'first_response_time', 'resolution_rate', 'bot_deflection']))
      .toEqual(['resolved', 'ai_first_response', 'resolution_rate', 'recontact_rate', 'bot_deflection', 'expired_review_alerts'])
  })

  it('não duplica e não inventa vizinho que a pessoa tirou', () => {
    expect(migrarFaixaDaAuditoria(['resolved', 'recontact_rate', 'resolution_rate'])).toEqual(['resolved', 'recontact_rate', 'resolution_rate'])
    expect(migrarFaixaDaAuditoria(['resolved', 'queued'])).toEqual(['resolved', 'queued'])
    expect(migrarFaixaDaAuditoria(['first_response_time', 'ai_first_response'])).toEqual(['ai_first_response'])
  })
})
