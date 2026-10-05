import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const quem = vi.hoisted(() => ({ role: 'supervisor' as string }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1', role: quem.role } }) }))

import { AvisoAgenteNoAr } from './PaginaDoAgente'
import type { AgentConfig } from '@/services/agentsApi'

const agente = (status: string) => ({ id: 'a1', name: 'Bia', status }) as unknown as AgentConfig

describe('AvisoAgenteNoAr', () => {
  it('supervisor vê o aviso em agente ativo', () => {
    quem.role = 'supervisor'
    render(<AvisoAgenteNoAr agent={agente('active')} />)
    expect(screen.getByText(/só um administrador da empresa pode alterá-lo/)).toBeInTheDocument()
  })

  it('agente pausado: sem aviso', () => {
    quem.role = 'supervisor'
    const { container } = render(<AvisoAgenteNoAr agent={agente('paused')} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('administrador: sem aviso', () => {
    quem.role = 'admin'
    const { container } = render(<AvisoAgenteNoAr agent={agente('active')} />)
    expect(container).toBeEmptyDOMElement()
  })
})
