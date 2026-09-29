import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

/**
 * Onda 4 — assistente novo: rascunho no servidor (recarregar não perde),
 * etapas sobre o negócio, publicação atômica e número ligado ao publicar.
 */

const api = vi.hoisted(() => ({
  createSpecDraft: vi.fn(),
  getSpecDraft: vi.fn(),
  saveSpecDraft: vi.fn(),
  getSpecReadiness: vi.fn(),
  publishSpecDraft: vi.fn(),
  getAgent: vi.fn(),
  generateSpecText: vi.fn(),
  chatWithAgent: vi.fn(),
  listAgentTestRuns: vi.fn(async () => []),
  listAgents: vi.fn(),
  linhas: vi.fn(),
  studyBusiness: vi.fn(),
  fetchInterview: vi.fn(),
  fetchAnswerExamples: vi.fn(),
  patch: vi.fn(),
  rodarBateria: vi.fn(async (_opts: unknown) => ({})),
  loadHubAsync: vi.fn(),
  saveHubAndWait: vi.fn(),
  products: vi.fn(),
  practitioners: vi.fn(),
}))
vi.mock('@/services/companyContextService', () => ({ loadHubAsync: api.loadHubAsync, saveHubAndWait: api.saveHubAndWait }))
vi.mock('@/components/agents/bateria/bateria', () => ({ rodarBateria: api.rodarBateria }))
vi.mock('@/services/agentsApi', () => api)
vi.mock('@/services/api', () => ({
  default: { patch: api.patch },
  departmentsApi: { list: vi.fn(async () => ({ data: [{ id: 'd1', name: 'Recepção' }] })) },
  productsApi: { list: api.products },
  practitionersApi: { list: api.practitioners },
  whatsappNumbersApi: { listDetailed: api.linhas },
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1' } }) }))

import { AssistenteDeAgente } from './AssistenteDeAgente'
import { cobertura, completarSpec, faltaNaEtapa, marcarNaoRespondidas, specVazia, textoParaEnsaio } from './especificacao'

const DRAFT = { id: 'draft-1', agent_id: null, spec: specVazia(), step: 1, published_agent_id: null, published_version: null, updated_at: '' }

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
  localStorage.clear()
  api.createSpecDraft.mockResolvedValue({ draft: DRAFT, repeatedFacts: [] })
  api.saveSpecDraft.mockResolvedValue(DRAFT)
  api.loadHubAsync.mockResolvedValue(HUB_VAZIO)
  api.saveHubAndWait.mockResolvedValue('ok')
  api.products.mockResolvedValue({ data: [] })
  api.practitioners.mockResolvedValue({ data: [] })
  api.fetchInterview.mockResolvedValue({ segment: { key: 'saude', label: 'saúde' }, questions: [] })
  api.fetchAnswerExamples.mockResolvedValue({ examples: [] })
  api.linhas.mockResolvedValue({ data: [{ id: 'n1', displayPhoneNumber: '+55 24 99999-0000', agentId: null }] })
  api.listAgents.mockResolvedValue([])
})

const HUB_VAZIO = {
  companyName: '', industry: '', businessType: [], teamSize: '', description: '', productsServices: '',
  website: '', instagram: '', facebook: '', linkedin: '', twitter: '', whatsapp: '', brandFiles: [], lastUpdatedAt: '',
}

describe('regras do assistente', () => {
  it('etapa 1 exige o tipo de negócio e o estudo; a do texto exige nome, persona e fluxo; o ensaio usa só persona e fluxo', () => {
    const s = specVazia()
    expect(faltaNaEtapa(1, s)).toMatch(/tipo de negócio/)
    s.identity.segment = 'Clínica'
    expect(faltaNaEtapa(1, s)).toMatch(/Estudar meu negócio/)
    s.context.studied = true
    expect(faltaNaEtapa(1, s)).toBeNull()
    expect(faltaNaEtapa(2, s)).toBeNull()
    expect(faltaNaEtapa(3, s)).toBeNull()
    expect(faltaNaEtapa(5, s)).toMatch(/nome/)
    s.persona.text = 'Você é a Serrinha, recepcionista virtual.'
    s.flow.text = 'Cumprimente e entenda o pedido antes de responder.'
    expect(textoParaEnsaio(s)).toMatch(/^## Quem você é\nVocê é a Serrinha/)
  })

  it('rascunho antigo, sem contexto, é completado; cobertura sobe com confirmação e escolhas', () => {
    const antigo = { ...specVazia() } as Partial<ReturnType<typeof specVazia>>
    delete antigo.context
    expect(completarSpec(antigo as ReturnType<typeof specVazia>).context.findings).toEqual([])
    const s = specVazia()
    expect(cobertura(s, { catalogo: false, profissionais: false })).toBe(0)
    s.context.findings = [
      { id: 'negocio', title: 'O negócio', text: 'x', source: 'site', confidence: 'confirmado', confirmed: true },
      { id: 'jeito', title: 'Jeito', text: 'y', source: 'site', confidence: 'sugestao', confirmed: false },
    ]
    s.context.pricePolicy = 'evaluation'
    expect(cobertura(s, { catalogo: false, profissionais: true })).toBe(35) // (1 + 0,5 + 1 + 1) / 10
  })
})

describe('AssistenteDeAgente', () => {
  it('cria o rascunho no servidor, guarda o id para retomar e salva ao mudar', async () => {
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    await waitFor(() => expect(api.createSpecDraft).toHaveBeenCalled())
    expect(localStorage.getItem('oryon:agentes:assistente:t1')).toBe('draft-1')
    fireEvent.change(screen.getByLabelText('Tipo de negócio'), { target: { value: 'Clínica' } })
    await waitFor(() => expect(api.saveSpecDraft).toHaveBeenCalled(), { timeout: 2000 })
    expect(api.saveSpecDraft.mock.calls.at(-1)![1].identity.segment).toBe('Clínica')
  })

  it('recarregou: retoma o rascunho guardado na etapa em que estava', async () => {
    localStorage.setItem('oryon:agentes:assistente:t1', 'draft-9')
    api.getSpecDraft.mockResolvedValue({ ...DRAFT, id: 'draft-9', step: 5, spec: { ...specVazia(), identity: { name: 'Serrinha', goal: 'atender_agendar', segment: 'Clínica' } } })
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    expect(await screen.findByText('Como ele conduz a conversa')).toBeInTheDocument()
    expect(api.createSpecDraft).not.toHaveBeenCalled()
  })

  it('não deixa avançar sem o mínimo da etapa', async () => {
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    await waitFor(() => expect(api.createSpecDraft).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Conte o tipo de negócio.')).toBeInTheDocument()
  })

  it('servidor sem as rotas novas: avisa que não está salvo e não deixa publicar', async () => {
    api.createSpecDraft.mockRejectedValue(new Error('Erro 404'))
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    expect(await screen.findByText('Não salvo no servidor')).toBeInTheDocument()
  })

  it('publica numa chamada, liga o número escolhido e abre o agente criado', async () => {
    localStorage.setItem('oryon:agentes:assistente:t1', 'draft-1')
    const pronta = {
      ...specVazia(),
      identity: { name: 'Serrinha', goal: 'atender_agendar' as const, segment: 'Clínica' },
      persona: { tone: 'acolhedor' as const, text: 'Você é a Serrinha, recepcionista virtual.' },
      flow: { text: 'Cumprimente e entenda o pedido antes de responder.' },
      channel: { whatsappNumberId: 'n1' },
      tests: [{ question: 'Oi', answer: 'Olá!', verdict: 'boa' as const }],
    }
    api.getSpecDraft.mockResolvedValue({ ...DRAFT, step: 7, spec: pronta })
    api.getSpecReadiness.mockResolvedValue({ ready: true, items: [{ id: 'identidade', label: 'Nome, persona e fluxo preenchidos', ok: true, blocking: true }] })
    api.publishSpecDraft.mockResolvedValue({ agentId: 'agent-1', version: 1, alreadyPublished: false })
    api.patch.mockResolvedValue({ data: { agentId: 'agent-1' } })
    api.getAgent.mockResolvedValue({ id: 'agent-1' })
    const onCreated = vi.fn()
    render(<AssistenteDeAgente onClose={() => {}} onCreated={onCreated} />)
    const publicar = await screen.findByRole('button', { name: 'Publicar agente' })
    await waitFor(() => expect(publicar).not.toBeDisabled())
    await act(async () => { fireEvent.click(publicar) })
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'agent-1' }))
    expect(api.publishSpecDraft).toHaveBeenCalledWith('draft-1')
    expect(api.patch).toHaveBeenCalledWith('/meta/numbers/n1', { agentId: 'agent-1' })
    expect(localStorage.getItem('oryon:agentes:assistente:t1')).toBeNull()
    // Onda 5 — a bateria do ensaio roda em segundo plano ao publicar.
    await waitFor(() => expect(api.rodarBateria).toHaveBeenCalledTimes(1))
    expect(api.rodarBateria.mock.calls[0][0]).toMatchObject({ trigger: 'publish', tests: [{ question: 'Oi' }] })
  })
})

describe('revisar agente existente', () => {
  it('abre na etapa do texto e aponta os fatos repetidos', async () => {
    api.createSpecDraft.mockResolvedValue({
      draft: { ...DRAFT, agent_id: 'a1', spec: { ...specVazia(), identity: { name: 'Antigo', goal: 'outro', segment: 'Clínica' }, persona: { tone: 'acolhedor', text: 'Consulta R$ 155. Ligue (24) 99999-1234.' } } },
      repeatedFacts: [{ kind: 'preco', excerpt: 'R$ 155' }, { kind: 'telefone', excerpt: '(24) 99999-1234' }],
    })
    render(<AssistenteDeAgente agentId="a1" onClose={() => {}} onCreated={() => {}} />)
    expect(await screen.findByText(/repete fatos que já vêm das fontes/)).toBeInTheDocument()
    expect(screen.getByText('preço: R$ 155')).toBeInTheDocument()
    expect(api.createSpecDraft).toHaveBeenCalledWith({ agentId: 'a1' })
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    expect(localStorage.getItem('oryon:agentes:assistente:t1:agente:a1')).toBe('draft-1')
  })
})

// ── SCRUM-1190 — estudar o negócio antes de perguntar ──────────────────────
describe('estudar o negócio', () => {
  const ESTUDO = {
    sources: [
      { id: 'cadastro', label: 'Cadastro da empresa', state: 'ok', detail: '' },
      { id: 'instagram', label: 'Instagram', state: 'partial', detail: 'Só a bio' },
    ],
    findings: [
      { id: 'negocio', title: 'O negócio', text: 'Clínica odontológica familiar.', source: 'suas respostas', confidence: 'confirmado' },
      { id: 'duvidas', title: 'Dúvidas mais comuns', text: 'Valor da avaliação e convênio.', source: 'típico do segmento', confidence: 'segmento' },
    ],
    summaryError: null,
  }
  const abrirNaEtapa1 = async () => {
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    await waitFor(() => expect(api.createSpecDraft).toHaveBeenCalled())
    fireEvent.change(await screen.findByLabelText('Tipo de negócio'), { target: { value: 'clínica odontológica' } })
  }

  it('conta nova: 4 campos, grava no Contexto da IA, estuda e mostra o resumo para conferir', async () => {
    api.studyBusiness.mockResolvedValue(ESTUDO)
    await abrirNaEtapa1()
    expect(await screen.findByText('Conte rapidinho sobre a empresa')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nome da empresa'), { target: { value: 'Sorriso Serra' } })
    fireEvent.change(screen.getByLabelText('Cidade ou região'), { target: { value: 'Teresópolis' } })
    fireEvent.change(screen.getByLabelText('O que a empresa faz, numa frase'), { target: { value: 'Clínica odontológica familiar' } })
    fireEvent.change(screen.getByLabelText('Site ou Instagram (opcional)'), { target: { value: '@sorrisoserra' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Estudar meu negócio' })) })

    expect(api.saveHubAndWait).toHaveBeenCalledWith('t1', expect.objectContaining({
      companyName: 'Sorriso Serra', description: 'Clínica odontológica familiar Em Teresópolis.', instagram: '@sorrisoserra', industry: 'clínica odontológica',
    }))
    expect(api.studyBusiness).toHaveBeenCalledWith(expect.objectContaining({
      company: expect.objectContaining({ name: 'Sorriso Serra', city: 'Teresópolis' }),
      catalog: { count: 0, names: [] }, practitioners: { count: 0 }, links: ['@sorrisoserra'],
    }))
    // Etapa 2: o que veio escrito já está confirmado; o do segmento espera o dono.
    expect(await screen.findByText('Clínica odontológica familiar.')).toBeInTheDocument()
    const botoes = screen.getAllByRole('button', { name: /Confirmado|Está certo/ })
    expect(botoes.map((b) => b.textContent)).toEqual(['Confirmado', 'Está certo'])
    fireEvent.click(botoes[1])
    await waitFor(() => {
      const ultimo = api.saveSpecDraft.mock.calls.at(-1)![1]
      expect(ultimo.context.findings.map((f: { confirmed: boolean }) => f.confirmed)).toEqual([true, true])
    }, { timeout: 2000 })
    expect(screen.getByText('Instagram')).toBeInTheDocument()
  })

  it('sem permissão de administrador: guarda a empresa no agente e avisa', async () => {
    api.saveHubAndWait.mockResolvedValue('forbidden')
    api.studyBusiness.mockResolvedValue({ ...ESTUDO, findings: [] })
    await abrirNaEtapa1()
    fireEvent.change(await screen.findByLabelText('Nome da empresa'), { target: { value: 'Sorriso Serra' } })
    fireEvent.change(screen.getByLabelText('O que a empresa faz, numa frase'), { target: { value: 'Clínica' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Estudar meu negócio' })) })
    expect(await screen.findByText(/ficou guardada só neste agente/)).toBeInTheDocument()
    await waitFor(() => expect(api.saveSpecDraft.mock.calls.at(-1)![1].context.pendingCompany).toMatchObject({ name: 'Sorriso Serra' }), { timeout: 2000 })
  })

  it('catálogo vazio vira escolha de comportamento', async () => {
    api.studyBusiness.mockResolvedValue({ ...ESTUDO, findings: [] })
    api.loadHubAsync.mockResolvedValue({ ...HUB_VAZIO, companyName: 'Sorriso Serra', description: 'Clínica familiar' })
    await abrirNaEtapa1()
    expect(await screen.findByText('Do Contexto da IA')).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Estudar meu negócio' })) })
    expect(api.saveHubAndWait).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: /Preço só na avaliação/ }))
    await waitFor(() => expect(api.saveSpecDraft.mock.calls.at(-1)![1].context.pricePolicy).toBe('evaluation'), { timeout: 2000 })
  })

  it('pular: segue sem estudo e diz que a IA vai perguntar o que faltar', async () => {
    await abrirNaEtapa1()
    fireEvent.click(await screen.findByRole('button', { name: 'Pular e responder tudo' }))
    expect(await screen.findByText(/Nada para conferir ainda/)).toBeInTheDocument()
    expect(api.studyBusiness).not.toHaveBeenCalled()
  })

  it('a IA diz o que supôs; responder refaz o texto com a resposta guardada', async () => {
    localStorage.setItem('oryon:agentes:assistente:t1', 'draft-1')
    api.getSpecDraft.mockResolvedValue({ ...DRAFT, step: 5, spec: { ...specVazia(), identity: { name: 'Clara', goal: 'atender_agendar', segment: 'Clínica' } } })
    api.generateSpecText
      .mockResolvedValueOnce({ persona: 'Você é a Clara.', flow: '1. Cumprimente.', warnings: [], generatorVersion: 'v2',
        assumptions: [{ text: 'Supus que só a equipe confirma horário.', question: 'A Clara pode confirmar sozinha?' }] })
      .mockResolvedValueOnce({ persona: 'Você é a Clara, da recepção.', flow: '1. Cumprimente.', warnings: [], generatorVersion: 'v2', assumptions: [] })
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    const escrever = await screen.findByRole('button', { name: /Escrever com IA/ })
    await act(async () => { fireEvent.click(escrever) })
    expect(await screen.findByText('Supus que só a equipe confirma horário.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('A Clara pode confirmar sozinha?'), { target: { value: 'Sim, pode confirmar.' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refazer com as respostas' })) })
    expect(api.generateSpecText.mock.calls[1][0].context.answers).toEqual([{ question: 'A Clara pode confirmar sozinha?', answer: 'Sim, pode confirmar.' }])
    await waitFor(() => expect(screen.queryByText('Supus que só a equipe confirma horário.')).not.toBeInTheDocument())
  })
})

// ── SCRUM-1192 — entrevista, jeito de responder e para onde foi cada coisa ──
describe('entrevista e jeito de responder', () => {
  const PERGUNTAS = [
    { id: 'urgencia', question: 'Atendem urgência no mesmo dia?', why: 'para prometer encaixe ou chamar a equipe.', kind: 'single', options: ['Sim, com encaixe no mesmo dia', 'Não'], destination: 'behavior', prefill: 'Sim, com encaixe no mesmo dia' },
    { id: 'antes_agendar', question: 'O que precisa saber antes de agendar?', why: 'para perguntar na ordem.', kind: 'multi', options: ['Nome completo', 'CPF', 'Convênio ou particular'], destination: 'behavior', prefill: null },
    { id: 'convenios', question: 'Atendem por convênio? Quais?', why: 'dúvida comum.', kind: 'text', placeholder: 'Ex.: Unimed', destination: 'fact', prefill: null },
    { id: 'atraso', question: 'Existe política de atraso?', why: 'para avisar antes.', kind: 'text', destination: 'fact', prefill: null },
  ]
  const naEtapa = (step: number, context: Partial<ReturnType<typeof specVazia>['context']> = {}) => {
    localStorage.setItem('oryon:agentes:assistente:t1', 'draft-1')
    const base = specVazia()
    api.getSpecDraft.mockResolvedValue({ ...DRAFT, step, spec: { ...base, identity: { name: 'Clara', goal: 'atender_agendar', segment: 'clínica odontológica' }, context: { ...base.context, studied: true, ...context } } })
  }
  const ultimoSalvo = () => api.saveSpecDraft.mock.calls.at(-1)![1]

  it('pré-preenche o que o estudo sabia, responde, deixa para depois e vira pendência ao sair', async () => {
    api.fetchInterview.mockResolvedValue({ segment: { key: 'saude', label: 'saúde' }, questions: PERGUNTAS })
    naEtapa(3)
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    expect(await screen.findByText('1. Atendem urgência no mesmo dia?')).toBeInTheDocument()
    expect(screen.getByText('Das fontes — confira')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sim, com encaixe no mesmo dia/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'CPF' }))
    fireEvent.change(screen.getByLabelText('Atendem por convênio? Quais?'), { target: { value: 'Unimed e Amil' } })
    // Ações e transferência agora são seções da entrevista.
    expect(screen.getByRole('heading', { name: 'O que ele faz sozinho' })).toBeInTheDocument()
    expect(screen.getByText('Setor que recebe')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => {
      const i = ultimoSalvo().context.interview
      expect(i.find((x: { id: string }) => x.id === 'urgencia')).toMatchObject({ answer: 'Sim, com encaixe no mesmo dia', skipped: false })
      expect(i.find((x: { id: string }) => x.id === 'antes_agendar')).toMatchObject({ answer: ['CPF'] })
      expect(i.find((x: { id: string }) => x.id === 'convenios')).toMatchObject({ answer: 'Unimed e Amil', destination: 'fact' })
      expect(i.find((x: { id: string }) => x.id === 'atraso')).toMatchObject({ answer: null, skipped: true })
    }, { timeout: 2000 })
  })

  it('jeito de responder: sugere ao entrar, escolher vira exemplo e dá para ajustar', async () => {
    api.fetchAnswerExamples.mockResolvedValue({ examples: [{
      question: 'Aceita convênio?',
      answers: [{ style: 'direta', text: 'Aceitamos alguns. Qual é o seu?' }, { style: 'acolhedora', text: 'Aceitamos sim! Me conta qual é o seu 😊' }],
    }] })
    naEtapa(4)
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    const acolhedora = await screen.findByRole('radio', { name: /Mais acolhedora/ })
    expect(api.fetchAnswerExamples).toHaveBeenCalledTimes(1)
    fireEvent.click(acolhedora)
    fireEvent.change(await screen.findByLabelText('Ajustar a resposta: Aceita convênio?'), { target: { value: 'Aceitamos sim! Qual é o seu?' } })
    await waitFor(() => expect(ultimoSalvo().context.examples).toEqual([{ question: 'Aceita convênio?', answer: 'Aceitamos sim! Qual é o seu?' }]), { timeout: 2000 })
  })

  it('texto de teste: regras e exemplos entram; fato não', () => {
    const s = specVazia()
    s.persona.text = 'Você é a Clara.'
    s.flow.text = '1. Cumprimente.'
    s.context.interview = [
      { id: 'nunca', question: 'O que o atendente nunca pode fazer?', destination: 'behavior', answer: ['Dar desconto ou condição especial'], skipped: false },
      { id: 'convenios', question: 'Convênios?', destination: 'fact', answer: 'Unimed', skipped: false },
      { id: 'atraso', question: 'Atraso?', destination: 'fact', answer: null, skipped: false },
    ]
    s.context.examples = [{ question: 'Aceita convênio?', answer: 'Aceitamos alguns.' }]
    const t = textoParaEnsaio(s)
    expect(t).toContain('## Regras deste negócio\n- O que o atendente nunca pode fazer? Dar desconto ou condição especial')
    expect(t).toContain('Cliente: Aceita convênio?\nVocê: Aceitamos alguns.')
    expect(t).not.toContain('Unimed')
    expect(marcarNaoRespondidas(s).context.interview.find((i) => i.id === 'atraso')?.skipped).toBe(true)
  })

  it('colocar no ar mostra para onde foi cada coisa; fatos que falharam não fecham o assistente em silêncio', async () => {
    naEtapa(7, {
      interview: [
        { id: 'convenios', question: 'Atendem por convênio? Quais?', destination: 'fact', answer: 'Unimed', skipped: false },
        { id: 'atraso', question: 'Existe política de atraso?', destination: 'fact', answer: null, skipped: true },
      ],
    })
    api.getSpecReadiness.mockResolvedValue({ ready: true, items: [{ id: 'identidade', label: 'Nome, persona e fluxo preenchidos', ok: true, blocking: true }] })
    api.publishSpecDraft.mockResolvedValue({ agentId: 'agent-1', version: 1, alreadyPublished: false, factsDoc: 'error' })
    api.getAgent.mockResolvedValue({ id: 'agent-1' })
    const onCreated = vi.fn()
    render(<AssistenteDeAgente onClose={() => {}} onCreated={onCreated} />)
    expect(await screen.findByText('Para onde foi cada coisa que você contou')).toBeInTheDocument()
    expect(screen.getByText('Atendem por convênio? Quais?')).toBeInTheDocument()
    expect(screen.getByText('Existe política de atraso?')).toBeInTheDocument()
    const publicar = screen.getByRole('button', { name: 'Publicar agente' })
    await waitFor(() => expect(publicar).not.toBeDisabled())
    await act(async () => { fireEvent.click(publicar) })
    expect(await screen.findByText(/não foram para a base de conhecimento/)).toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o agente' }))
    expect(onCreated).toHaveBeenCalledWith({ id: 'agent-1' })
  })
})


// ── Linha de WhatsApp no assistente ─────────────────────────────────────────
describe('linha de WhatsApp', () => {
  const PRONTA = {
    ...specVazia(),
    identity: { name: 'Serrinha', goal: 'atender_agendar' as const, segment: 'Clínica' },
    persona: { tone: 'acolhedor' as const, text: 'Você é a Serrinha, recepcionista virtual.' },
    flow: { text: 'Cumprimente e entenda o pedido antes de responder.' },
    channel: { whatsappNumberId: 'n1' },
  }
  const LINHAS = [
    { id: 'n1', displayPhoneNumber: '+55 24 99999-0000', label: 'Linha 1', agentId: 'bia' },
    { id: 'n2', displayPhoneNumber: '+55 24 98888-0000', label: null, agentId: null },
  ]
  const naEtapaFinal = (spec = PRONTA) => {
    localStorage.setItem('oryon:agentes:assistente:t1', 'draft-1')
    api.getSpecDraft.mockResolvedValue({ ...DRAFT, step: 7, spec })
    api.getSpecReadiness.mockResolvedValue({ ready: true, items: [{ id: 'identidade', label: 'ok', ok: true, blocking: true }] })
    api.linhas.mockResolvedValue({ data: LINHAS })
    api.listAgents.mockResolvedValue([{ id: 'bia', name: 'Bia' }])
  }

  it('linha ocupada mostra o nome do agente que sai dela', async () => {
    naEtapaFinal()
    render(<AssistenteDeAgente onClose={() => {}} onCreated={() => {}} />)
    expect(await screen.findByRole('option', { name: 'Linha 1 · +55 24 99999-0000 — hoje atendida por Bia' })).toBeInTheDocument()
    expect(screen.getByText(/passa a ser\s+atendida por este agente/)).toBeInTheDocument()
    expect(screen.getByText('Bia', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Número de WhatsApp que ele atende'), { target: { value: 'n2' } })
    expect(screen.queryByText('Bia', { selector: 'strong' })).not.toBeInTheDocument()
  })

  it('falha ao ligar a linha: não fecha, avisa que publicou e deixa tentar de novo', async () => {
    naEtapaFinal()
    api.publishSpecDraft.mockResolvedValue({ agentId: 'agent-1', version: 1, alreadyPublished: false })
    api.getAgent.mockResolvedValue({ id: 'agent-1' })
    api.patch.mockRejectedValueOnce({ response: { status: 403 } })
    const onCreated = vi.fn()
    render(<AssistenteDeAgente onClose={() => {}} onCreated={onCreated} />)
    const publicar = await screen.findByRole('button', { name: 'Publicar agente' })
    await waitFor(() => expect(publicar).not.toBeDisabled())
    await act(async () => { fireEvent.click(publicar) })
    expect(await screen.findByText(/O agente foi publicado. Falta só ligar a linha/)).toBeInTheDocument()
    expect(screen.getByText(/Só um administrador da empresa pode ligar a linha/)).toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
    expect(publicar).toBeDisabled()

    api.patch.mockResolvedValueOnce({ data: {} })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tentar ligar de novo' })) })
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'agent-1' }))
    expect(api.patch).toHaveBeenCalledTimes(2)
    expect(api.patch).toHaveBeenLastCalledWith('/meta/numbers/n1', { agentId: 'agent-1' })
  })

  it('falha ao ligar a linha: "Abrir o agente" leva ao agente publicado', async () => {
    naEtapaFinal()
    api.publishSpecDraft.mockResolvedValue({ agentId: 'agent-1', version: 1, alreadyPublished: false })
    api.getAgent.mockResolvedValue({ id: 'agent-1' })
    api.patch.mockRejectedValue(new Error('rede'))
    const onCreated = vi.fn()
    render(<AssistenteDeAgente onClose={() => {}} onCreated={onCreated} />)
    const publicar = await screen.findByRole('button', { name: 'Publicar agente' })
    await waitFor(() => expect(publicar).not.toBeDisabled())
    await act(async () => { fireEvent.click(publicar) })
    expect(await screen.findByText(/O servidor não respondeu ao ligar a linha/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o agente' }))
    expect(onCreated).toHaveBeenCalledWith({ id: 'agent-1' })
  })

  it('revisão: pré-preenche a linha que o agente atende hoje, não a da spec', async () => {
    api.createSpecDraft.mockResolvedValue({
      draft: { ...DRAFT, agent_id: 'bia', spec: { ...PRONTA, channel: { whatsappNumberId: null } } },
      repeatedFacts: [],
    })
    api.linhas.mockResolvedValue({ data: LINHAS })
    api.listAgents.mockResolvedValue([{ id: 'bia', name: 'Bia' }])
    render(<AssistenteDeAgente agentId="bia" onClose={() => {}} onCreated={() => {}} />)
    await waitFor(() => expect(api.createSpecDraft).toHaveBeenCalled())
    await waitFor(() => expect(api.saveSpecDraft).toHaveBeenCalled(), { timeout: 2000 })
    expect(api.saveSpecDraft.mock.calls.at(-1)![1].channel.whatsappNumberId).toBe('n1')
  })
})
