// A situação do contato e a etiqueta eram visualmente a mesma coisa: ambas
// `color-chip` + `rounded-full` + borda, mudando só o padding. Estes testes
// fixam a distinção por FORMA — é ela que o operador usa para saber o que é
// estado exclusivo e o que é rótulo livre.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StageBadge } from './StageBadge'
import type { TenantStage } from '@/types'

const STAGES: TenantStage[] = [
  { id: '1', tenantId: 't', key: 'proposta', label: 'Proposta enviada', color: '#e879f9', order: 1 } as TenantStage,
  { id: '2', tenantId: 't', key: 'cliente', label: 'Cliente', color: '#22c55e', order: 2 } as TenantStage,
]

describe('StageBadge — situação não se confunde com etiqueta', () => {
  it('não usa a receita da etiqueta: sem `color-chip`, sem `rounded-full`', () => {
    const { container } = render(<StageBadge stage="proposta" stages={STAGES} />)
    const badge = container.firstElementChild!
    expect(badge.className).not.toContain('color-chip')
    expect(badge.className).not.toContain('rounded-full')
    expect(badge.className).toContain('rounded-none')
  })

  it('fundo neutro — a cor da situação vive só no ponto', () => {
    const { container } = render(<StageBadge stage="proposta" stages={STAGES} />)
    const badge = container.firstElementChild!
    expect(badge.className).toContain('bg-surface-800')
    const dot = badge.querySelector('span[style]') as HTMLElement
    expect(dot).toBeTruthy()
    expect(dot.style.backgroundColor).toBeTruthy()
  })

  it('mostra o rótulo da situação e se anuncia como situação', () => {
    render(<StageBadge stage="cliente" stages={STAGES} />)
    expect(screen.getByText('Cliente')).toBeInTheDocument()
    expect(screen.getByTitle('Situação: Cliente')).toBeInTheDocument()
  })

  it('chave órfã (situação removida das Configurações): mesma forma, sem ponto', () => {
    const { container } = render(<StageBadge stage="fantasma" stages={STAGES} />)
    const badge = container.firstElementChild!
    expect(badge.className).toContain('rounded-none')
    expect(badge.querySelector('span[style]')).toBeNull()
    expect(screen.getByText('fantasma')).toBeInTheDocument()
  })
})
