// ─── O botão "Regenerar" do Prompt (A2 / SCRUM-1013) ─────────────────────────
//
// Os 9 casos especificados em `coord/regenerar-plano.md` §3, com a mutação de
// cada um declarada no comentário. O que eles travam não é o desenho do botão —
// é o conjunto de promessas que ele faz:
//
//   preenche o rascunho e NÃO persiste · confirma só contra trabalho não salvo ·
//   desabilita com motivo em vez de sumir · e não afirma "IA" quando foi template.
//
// O caso 6 é o par oposto do 5 e NÃO pode ser cortado: aqui o conserto é
// "passar a pedir confirmação", então tem de cair também o lugar onde confirmar
// está ERRADO. Sem ele, "confirmar sempre" passaria como implementação correta.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AgentConfigWithTools, AgentPromptRequest } from '@/services/agentsApi'

const generateAgentPromptWithSource = vi.fn()
const updateAgent = vi.fn()

vi.mock('@/services/agentsApi', () => ({
  generateAgentPromptWithSource: (r: AgentPromptRequest) => generateAgentPromptWithSource(r),
  updateAgent: (...a: unknown[]) => updateAgent(...a),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', tenantId: 't1' } }),
}))

// O Hub tem banner próprio (`isStale`) que não é assunto deste arquivo.
vi.mock('@/services/companyContextService', () => ({
  loadHub: () => null,
  hubHasContent: () => false,
  isAgentStale: () => false,
  injectHubIntoPrompt: (p: string) => p,
}))

const { PromptSection } = await import('./PromptSection')

const PUBLICADO = '# PROMPT PUBLICADO'

/** `wizard_config` mínimo que o mapeador aceita — basta UMA seção conhecida. */
const WIZARD = {
  identity: { name: 'Sofia', icon: 'bot', sector: 'ecommerce', objective: 'vender' },
  deployment: {
    channels_whatsapp: true,
    handoff_rules: [
      { name: 'Reembolso', description: 'quer reembolso', keywords: ['reembolso'], department: 'Financeiro' },
    ],
  },
}

function agente(over: Partial<AgentConfigWithTools> = {}): AgentConfigWithTools {
  return {
    id: 'a1', tenant_id: 't1', created_by: null, name: 'Sofia', icon: 'bot',
    sector: 'Vendas', objective: null, status: 'active',
    system_prompt: PUBLICADO,
    handoff_rules: {}, channels: {}, wizard_config: WIZARD,
    test_count: 0, last_tested_at: null, conversation_count: 0,
    created_at: '', updated_at: '', tools: [],
    ...over,
  } as unknown as AgentConfigWithTools
}

const montar = (a = agente()) => render(<PromptSection agent={a} onUpdate={vi.fn()} />)

const btnRegenerar = () => screen.getByRole('button', { name: /Regenerar/i })
const textarea = () => screen.getByRole('textbox', { name: 'Prompt do agente' }) as HTMLTextAreaElement

/** O modal e o cabeçalho têm botões homônimos; o do modal é o último. */
const confirmarNoModal = () => {
  const todos = screen.getAllByRole('button', { name: /^Regenerar$/i })
  fireEvent.click(todos[todos.length - 1])
}

async function editar(texto: string) {
  fireEvent.click(screen.getByRole('button', { name: /Editar/i }))
  fireEvent.change(textarea(), { target: { value: texto } })
}

describe('PromptSection · Regenerar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    generateAgentPromptWithSource.mockResolvedValue({ prompt: '# GERADO', source: 'ai' })
    updateAgent.mockResolvedValue(agente())
  })

  // 1 — mutação: ocultar o botão quando não há wizard_config.
  it('sem `wizard_config`, o botão está PRESENTE e desabilitado com motivo', () => {
    montar(agente({ wizard_config: {} as AgentConfigWithTools['wizard_config'] }))
    const b = btnRegenerar()
    // Presente é metade do caso: a capacidade existe no produto, o que falta é
    // a entrada DESTE agente. Ocultar faria a pessoa procurar um botão que ela
    // viu em outro agente e concluir que a tela está quebrada.
    expect(b).toBeInTheDocument()
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('title', expect.stringContaining('wizard'))
  })

  // 2 — mutação: não chamar setEditing após gerar.
  it('clicar gera e PREENCHE o editor, entrando em modo de edição', async () => {
    montar()
    fireEvent.click(btnRegenerar())
    await waitFor(() => expect(textarea()).toBeInTheDocument())
    expect(textarea().value).toBe('# GERADO')
  })

  // 3 — mutação: persistir "para não perder".
  it('o gerado NÃO persiste: nada é salvo sem o Salvar', async () => {
    montar()
    fireEvent.click(btnRegenerar())
    await waitFor(() => expect(textarea().value).toBe('# GERADO'))
    expect(updateAgent).not.toHaveBeenCalled()
  })

  // 4 — mutação: manter o gerado no Cancelar.
  it('Cancelar depois de regenerar devolve o PUBLICADO', async () => {
    montar()
    fireEvent.click(btnRegenerar())
    await waitFor(() => expect(textarea().value).toBe('# GERADO'))

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))
    // Voltou ao modo leitura com o texto publicado — é o que torna o Regenerar
    // reversível, e é por isso que ele não pede confirmação no caso limpo.
    expect(screen.queryByRole('textbox', { name: 'Prompt do agente' })).not.toBeInTheDocument()
    expect(screen.getByText(/PROMPT PUBLICADO/)).toBeInTheDocument()
  })

  // 5 — mutação: pular o modal quando há edição local.
  it('com edição NÃO salva, o clique abre confirmação e NÃO gera antes dela', async () => {
    montar()
    await editar('rascunho da pessoa')

    fireEvent.click(btnRegenerar())

    expect(screen.getByText(/Regenerar o prompt\?/i)).toBeInTheDocument()
    // O ponto do caso: a geração não pode acontecer ANTES do sim.
    expect(generateAgentPromptWithSource).not.toHaveBeenCalled()
    expect(textarea().value).toBe('rascunho da pessoa')

    confirmarNoModal()
    await waitFor(() => expect(textarea().value).toBe('# GERADO'))
  })

  // 6 — A MUTAÇÃO DA CORREÇÃO EXAGERADA: confirmar sempre.
  it('SEM edição não salva, NÃO abre confirmação', async () => {
    montar()
    fireEvent.click(btnRegenerar())

    // Reversível contra o publicado não pede confirmação. Confirmar aqui
    // ensinaria a pessoa a clicar "sim" sem ler — e aí o modal do caso 5,
    // que protege trabalho de verdade, também seria atravessado.
    expect(screen.queryByText(/Regenerar o prompt\?/i)).not.toBeInTheDocument()
    await waitFor(() => expect(generateAgentPromptWithSource).toHaveBeenCalled())
  })

  // 7 — mutação: passar só o `wizard_config` ao mapeador.
  it('o estado VIVO vence o retrato: a regra criada no workspace entra no pedido', async () => {
    montar(agente({
      handoff_rules: {
        rules: [{ name: 'Cancelamento', description: 'quer cancelar', keywords: ['cancelar'], department: 'Retenção' }],
      },
    } as unknown as Partial<AgentConfigWithTools>))

    fireEvent.click(btnRegenerar())
    await waitFor(() => expect(generateAgentPromptWithSource).toHaveBeenCalled())

    const req = generateAgentPromptWithSource.mock.calls.at(-1)![0] as AgentPromptRequest
    // A regra do workspace entrou…
    expect(req.deployment.escalation_keywords).toContain('cancelar')
    expect(req.deployment.escalation_department).toBe('Retenção')
    // …e a do retrato, que é a ANTIGA, ficou de fora. Sem isto, quem cria pelo
    // wizard e edita as regras depois regenera com as regras velhas, calado.
    expect(req.deployment.escalation_keywords).not.toContain('reembolso')
  })

  // 8 — mutação: tirar a guarda de geração.
  it('resposta de agente ANTIGO não cai no rascunho do agente NOVO', async () => {
    let resolver!: (v: { prompt: string; source: string }) => void
    generateAgentPromptWithSource.mockReturnValue(new Promise((r) => { resolver = r }))

    const { rerender } = montar(agente({ id: 'a1' }))
    fireEvent.click(btnRegenerar())
    await waitFor(() => expect(generateAgentPromptWithSource).toHaveBeenCalled())

    // Trocou de agente com a geração em voo.
    rerender(<PromptSection agent={agente({ id: 'a2', system_prompt: '# OUTRO AGENTE' })} onUpdate={vi.fn()} />)
    resolver({ prompt: '# DO AGENTE ANTIGO', source: 'ai' })

    await waitFor(() => expect(screen.getByText(/OUTRO AGENTE/)).toBeInTheDocument())
    expect(screen.queryByText(/DO AGENTE ANTIGO/)).not.toBeInTheDocument()
  })

  // 9 — mutação: avisar sempre (ou nunca).
  it('avisa a ORIGEM quando veio do template, e fica CALADO quando veio da IA', async () => {
    generateAgentPromptWithSource.mockResolvedValue({ prompt: '# GERADO', source: 'local_fallback' })
    const { unmount } = montar()
    fireEvent.click(btnRegenerar())
    await waitFor(() => expect(screen.getByText(/sem IA/i)).toBeInTheDocument())
    unmount()

    // O par oposto: avisar sempre ensina a ignorar o aviso, e aí ele deixa de
    // valer no caso em que importa.
    vi.resetAllMocks()
    generateAgentPromptWithSource.mockResolvedValue({ prompt: '# GERADO', source: 'ai' })
    montar()
    fireEvent.click(btnRegenerar())
    await waitFor(() => expect(textarea().value).toBe('# GERADO'))
    expect(screen.queryByText(/sem IA/i)).not.toBeInTheDocument()
  })
})
