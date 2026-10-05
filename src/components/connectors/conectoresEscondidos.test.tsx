import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1', role: 'owner', email: 'x@y.z' } }) }))
const api = vi.hoisted(() => ({ listInstalledConnectorsForAgent: vi.fn(), listAgentMcpProviders: vi.fn() }))
vi.mock('@/services/connectorsApi', () => ({ listInstalledConnectorsForAgent: api.listInstalledConnectorsForAgent }))

import { FEATURE_FLAGS, isRouteVisible } from '@/config/featureFlags'
import { visibleSettingsNav } from '@/components/settings/SettingsLayout'
import { ConnectorTogglesSection } from '@/components/agents/ConnectorTogglesSection'
import { toConnectorView } from './connectorView'

const secoes = (role: string) =>
  visibleSettingsNav(role).flatMap((d) => d.clusters.flatMap((c) => c.items.map((i) => i.section)))

describe('D12 — Conectores escondidos na release', () => {
  it('a flag nasce desligada', () => {
    expect(FEATURE_FLAGS.connectorsSelfService).toBe(false)
  })

  it('sem item de menu nem rota visível (settings e staff)', () => {
    expect(secoes('owner')).not.toContain('connectors')
    expect(isRouteVisible('/settings/connectors')).toBe(false)
    expect(isRouteVisible('/admin/connectors')).toBe(false)
    expect(isRouteVisible('/admin/connector-requests')).toBe(false)
    // O resto de Configurações não muda.
    expect(secoes('owner')).toContain('company')
  })

  it('a seção da aba Skills não monta nem chama a API', () => {
    const { container } = render(<ConnectorTogglesSection agentId="a1" />)
    expect(container).toBeEmptyDOMElement()
    expect(api.listInstalledConnectorsForAgent).not.toHaveBeenCalled()
  })
})

describe('toConnectorView', () => {
  const base = {
    id: 'c1', slug: 'feegow', name: 'Feegow', vendor: null, description: 'ERP', category: 'clinic',
    logo_url: null, status: 'live', docs_url: null, setup_instructions: null, installed: false,
  }

  it('status: instalado > instalável (live/pilot) > em breve', () => {
    expect(toConnectorView({ ...base, installed: true }).status).toBe('installed')
    expect(toConnectorView(base).status).toBe('available')
    expect(toConnectorView({ ...base, status: 'pilot' }).status).toBe('available')
    expect(toConnectorView({ ...base, status: 'requested' }).status).toBe('comingSoon')
  })

  it('categoria em português e nenhum número inventado', () => {
    const v = toConnectorView(base)
    expect(v.category).toBe('Clínicas')
    expect(v.vendor).toBe('Feegow')
    expect(v.agentsUsing).toBeUndefined()
    expect(v.requestCount).toBeUndefined()
  })
})
