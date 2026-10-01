// R1 (revisão da release 2026-09-29): a rosca mostrava as pendentes (todas)
// como "Em Fila", e o KPI "Em Fila" da mesma tela é outro número (pendentes
// sem dono, D5). Dois números com o mesmo nome.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/useChartColors', () => ({ useChartColors: () => new Proxy({}, { get: () => '#888' }) }))

import { StatusDonut } from './StatusDonut'

describe('StatusDonut — R1', () => {
  it('rotula as pendentes como "Pendentes", não "Em Fila"', () => {
    render(<StatusDonut data={{ open: 40, pending: 26, resolved: 72, abandoned: 15 }} />)
    expect(screen.getAllByText('Pendentes').length).toBeGreaterThan(0)
    expect(screen.queryByText('Em Fila')).toBeNull()
  })

  it('C5 (revisão 30/09): ativas/pendentes de agora, resolvidas/arquivadas do período; o centro não soma os dois', () => {
    render(<StatusDonut data={{ open: 40, pending: 26, resolved: 72, abandoned: 15 }} periodo="nos últimos 7 dias" />)
    expect(screen.getByText('66')).toBeInTheDocument() // 40 + 26 em andamento
    expect(screen.getByText('em andamento')).toBeInTheDocument()
    expect(screen.queryByText('153')).toBeNull() // nada de somar resolvidas do período com o "agora"
    expect(screen.getByText('Arquivadas')).toBeInTheDocument()
    expect(screen.queryByText('Abandonadas')).toBeNull()
    expect(screen.getAllByText('· nos últimos 7 dias')).toHaveLength(2)
    expect(screen.getAllByText('· agora')).toHaveLength(2)
  })
})
