// Revisão 03/10: "Copiar configuração de outro agente" só oferece agentes da
// MESMA empresa — a lista vem de todas (tela da equipe Oryon).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/services/agentSkillsApi', () => ({ updateAgentSkill: vi.fn(), listSkillExecutions: vi.fn(async () => []) }))
vi.mock('@/services/skillTemplatesApi', () => ({
  listSkillTemplateInstances: vi.fn(async () => [
    { id: 's-mesma', agent_id: 'a2', agent_name: 'Bia (mesma clínica)', tenant_id: 't1', config: {}, llm_name_override: null, llm_description_override: null, enabled: true, created_at: '', updated_at: '', has_drift: false, missing_required: [], extra_keys: [] },
    { id: 's-outra', agent_id: 'a9', agent_name: 'Bia (outra clínica)', tenant_id: 't2', config: {}, llm_name_override: null, llm_description_override: null, enabled: true, created_at: '', updated_at: '', has_drift: false, missing_required: [], extra_keys: [] },
  ]),
}))

import { EditAgentSkillConfigModal } from './EditAgentSkillConfigModal'

const skill = {
  skill_id: 's1', agent_id: 'a1', tenant_id: 't1', template_id: 'tpl', config: {}, enabled: true,
  llm_name_override: null, llm_description_override: null, template_name: 'Feegow', template_slug: 'feegow__x',
  template_config_schema: { type: 'object', properties: {} },
} as never

describe('copiar configuração de outro agente', () => {
  it('lista só agentes da mesma empresa', async () => {
    render(<EditAgentSkillConfigModal open onClose={vi.fn()} onSaved={vi.fn()} skill={skill} />)
    fireEvent.click(screen.getByRole('button', { name: /Copiar configuração de outro agente/ }))
    expect(await screen.findByText(/Bia \(mesma clínica\)/)).toBeInTheDocument()
    expect(screen.queryByText(/Bia \(outra clínica\)/)).toBeNull()
  })
})
