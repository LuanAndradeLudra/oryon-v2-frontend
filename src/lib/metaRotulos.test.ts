import { describe, it, expect } from 'vitest'
import { statusDoModelo, limiteDoNumero, qualidadeDoNumero, rotuloDaCategoria } from './metaRotulos'

describe('metaRotulos (plano MA, Fase 6)', () => {
  it('status conhecido tem rótulo; desconhecido não quebra e não passa por enviável', () => {
    expect(statusDoModelo('APPROVED')).toMatchObject({ label: 'Aprovado', bloqueia: false })
    expect(statusDoModelo('ARCHIVED')).toMatchObject({ label: 'Arquivado', bloqueia: true })
    expect(statusDoModelo('PENDING_DELETION').label).toBe('Excluindo')
    expect(statusDoModelo('ALGO_NOVO_DA_META')).toMatchObject({ label: 'Algo novo da meta', bloqueia: true })
    expect(statusDoModelo(undefined).label).toBe('Sem status')
  })

  it('limite de envio: máximo diário vence o tier; ilimitado e não definido têm texto; ausente = null', () => {
    expect(limiteDoNumero('TIER_1K', 10000)).toBe('10.000 contatos / 24 h')
    expect(limiteDoNumero('TIER_250', null)).toBe('250 contatos / 24 h')
    expect(limiteDoNumero('TIER_UNLIMITED')).toBe('Ilimitado')
    expect(limiteDoNumero('TIER_NOT_SET')).toBe('Ainda não definido pela Meta')
    expect(limiteDoNumero(null, null)).toBeNull()
  })

  it('qualidade do número aceita MAIÚSCULAS (backend) e minúsculas (legado)', () => {
    expect(qualidadeDoNumero('RED').label).toBe('Baixa')
    expect(qualidadeDoNumero('green').label).toBe('Alta')
    expect(qualidadeDoNumero(null).label).toBe('Sem nota')
  })

  it('categoria em português', () => {
    expect(rotuloDaCategoria('UTILITY')).toBe('Utilidade')
    expect(rotuloDaCategoria('marketing')).toBe('Marketing')
  })
})
