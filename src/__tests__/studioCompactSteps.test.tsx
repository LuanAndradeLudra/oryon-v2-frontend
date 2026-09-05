import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { HandoffRule } from '@/services/agentsApi'
import { DEFAULT_DATA, type WizardData } from '@/components/agents/studio/types'
import { Step4NegocioCompacto } from '@/components/agents/studio/blueprint/Step4NegocioCompacto'
import { Step6ConhecimentoCompacto } from '@/components/agents/studio/blueprint/Step6ConhecimentoCompacto'
import { draftAgent, draftSystemPrompt } from '@/components/agents/studio/blueprint/draftAgent'
import { toggleCrmCapability, isCrmCapabilityEnabled } from '@/components/agents/studio/crmCapabilities'

/**
 * Os passos 4 e 6 têm corpo reduzido no Studio e corpo inteiro no modal
 * (`coord/A3-decisoes.md` §1). Enquanto os dois caminhos existirem, o que
 * garante que não divergem é escreverem no MESMO `WizardData` — é isso que
 * estes testes travam.
 */
function aplicar(data: WizardData, calls: unknown[]): WizardData {
  return calls.reduce<WizardData>(
    (acc, u) => (typeof u === 'function' ? (u as (d: WizardData) => WizardData)(acc) : (u as WizardData)),
    data,
  )
}

describe('Step4NegocioCompacto', () => {
  it('escreve nos mesmos campos do WizardData que o Step4 inteiro lê', () => {
    const setData = vi.fn()
    render(<Step4NegocioCompacto data={DEFAULT_DATA} setData={setData} />)

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'Nuvem Moda' } })
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Moda feminina.' } })

    const final = aplicar(DEFAULT_DATA, setData.mock.calls.map(c => c[0]))
    expect(final.company_name).toBe('Nuvem Moda')
    expect(final.company_description).toBe('Moda feminina.')
  })

  it('mostra o que já veio pré-preenchido do hub', () => {
    render(
      <Step4NegocioCompacto
        data={{ ...DEFAULT_DATA, company_name: 'Do hub' }}
        setData={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Empresa')).toHaveValue('Do hub')
  })
})

describe('Step6ConhecimentoCompacto', () => {
  const comDoc: WizardData = {
    ...DEFAULT_DATA,
    knowledge_docs: [{ id: 'k1', name: 'frete.pdf', content: 'x', source_type: 'file' }],
  }

  it('lista os documentos já adicionados', () => {
    render(<Step6ConhecimentoCompacto data={comDoc} setData={vi.fn()} />)
    expect(screen.getByText('frete.pdf')).toBeInTheDocument()
  })

  it('remove um documento do mesmo WizardData', () => {
    const setData = vi.fn()
    render(<Step6ConhecimentoCompacto data={comDoc} setData={setData} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remover frete.pdf' }))
    expect(aplicar(comDoc, setData.mock.calls.map(c => c[0])).knowledge_docs).toEqual([])
  })

  it('sem fontes, avisa a consequência em vez de só mostrar um vazio', () => {
    render(<Step6ConhecimentoCompacto data={DEFAULT_DATA} setData={vi.fn()} />)
    expect(screen.getByText(/Sem fontes, o agente responde só com o que você escreveu/)).toBeInTheDocument()
  })
})

describe('draftSystemPrompt', () => {
  it('descreve o que já foi decidido', () => {
    const p = draftSystemPrompt({
      ...DEFAULT_DATA,
      name: 'Sofia', company_name: 'Nuvem Moda', sector: 'ecommerce',
      objective: 'Qualificar leads.', tone: 'entusiasmado',
      can_do: ['Consultar estoque'], cannot_do: ['Prometer prazos'],
    })
    expect(p).toContain('Sofia')
    expect(p).toContain('Nuvem Moda')
    expect(p).toContain('Qualificar leads.')
    expect(p).toContain('Consultar estoque')
    expect(p).toContain('Prometer prazos')
  })

  it('sem base de conhecimento, proíbe inventar prazo e política', () => {
    // É a lacuna que o card âmbar avisa — o prompt tem de agir de acordo,
    // senão a prévia inventa justamente o que o card diz que falta.
    expect(draftSystemPrompt(DEFAULT_DATA)).toMatch(/Não invente preços, prazos/)
  })

  it('com base de conhecimento, some com esse aviso', () => {
    const p = draftSystemPrompt({
      ...DEFAULT_DATA,
      knowledge_docs: [{ id: 'k', name: 'n', content: 'c', source_type: 'file' }],
    })
    expect(p).not.toMatch(/Não invente preços, prazos/)
  })

  it('avisa que é prévia de agente em construção', () => {
    expect(draftSystemPrompt(DEFAULT_DATA)).toMatch(/PRÉVIA/)
  })
})

describe('draftAgent', () => {
  const regra: HandoffRule = {
    id: 'r1', name: 'Financeiro', priority: 1, enabled: true, matchMode: 'any_keyword',
    keywords: ['reembolso'], action: 'human_handoff', department: 'Setor Financeiro',
    aiGenerated: false, createdAt: '', updatedAt: '',
  }

  it('leva as regras não publicadas para o simulador', () => {
    expect(draftAgent({ ...DEFAULT_DATA, handoff_rules: [regra] }).handoff_rules.rules).toEqual([regra])
  })

  it('usa o prompt gerado quando a etapa 7 já rodou', () => {
    const a = draftAgent({ ...DEFAULT_DATA, generated_prompt: 'PROMPT FINAL' })
    expect(a.system_prompt).toBe('PROMPT FINAL')
  })

  it('cai no provisório enquanto a etapa 7 não rodou', () => {
    expect(draftAgent({ ...DEFAULT_DATA, name: 'Sofia' }).system_prompt).toMatch(/PRÉVIA/)
  })

  it('é rascunho e não tem id — ainda não existe agente', () => {
    const a = draftAgent(DEFAULT_DATA)
    expect(a.status).toBe('draft')
    expect(a.id).toBe('')
  })
})

describe('toggleCrmCapability', () => {
  it('aplica os defaultConstraints conservadores do catálogo ao ligar', () => {
    // O padrão de manage_conversation_status bloqueia 'resolved' para o LLM não
    // encerrar conversa sozinho. Um caminho que esquecesse disso habilitaria a
    // capacidade sem limite — falha silenciosa, não detalhe de UI.
    const d = toggleCrmCapability(DEFAULT_DATA, 'manage_conversation_status', true)
    const cfg = d.crm_capabilities.capabilities.find(c => c.id === 'manage_conversation_status')
    expect(cfg?.enabled).toBe(true)
    expect(cfg?.constraints?.allowedStatuses).not.toContain('resolved')
  })

  it('desligar remove a capacidade', () => {
    const ligada = toggleCrmCapability(DEFAULT_DATA, 'tag_contact', true)
    expect(isCrmCapabilityEnabled(ligada, 'tag_contact')).toBe(true)
    expect(isCrmCapabilityEnabled(toggleCrmCapability(ligada, 'tag_contact', false), 'tag_contact')).toBe(false)
  })

  it('ligar duas vezes não duplica a entrada', () => {
    const uma = toggleCrmCapability(DEFAULT_DATA, 'tag_contact', true)
    const duas = toggleCrmCapability(uma, 'tag_contact', true)
    expect(duas.crm_capabilities.capabilities.filter(c => c.id === 'tag_contact')).toHaveLength(1)
  })
})
