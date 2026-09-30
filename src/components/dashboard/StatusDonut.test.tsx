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
})
