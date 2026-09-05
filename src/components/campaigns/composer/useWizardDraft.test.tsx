// Ressalva de cobertura do Lince no #127, e ela é justa: a prova de
// superfície mostra que as 54 chaves continuam as mesmas, mas superfície é
// FORMATO, não semântica — as chaves seriam idênticas mesmo com o corpo
// reescrito, e o corpo foi reescrito (o `submitCampaign` passou a servir
// criação e edição). O que garantia a paridade era leitura, e leitura não
// sobrevive ao próximo refactor.
//
// Estes testes exercitam o caminho de submissão REAL: o núcleo
// (`useCampaignDraftCore`) NÃO é mockado aqui — só a camada de rede é. É o
// caminho que 100% dos usuários usa hoje, pelo modal do wizard.
//
// Os 3 casos são os que o Lince pediu, e o do meio é o que quebraria calado:
// campanha criada com sucesso mas envio falhando precisa seguir para
// `onCreated` mesmo assim; se virasse "falha", a campanha existiria no banco
// e a tela nunca saberia.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Campaign } from '@/types'

const campaignsApi = {
  create: vi.fn(),
  send: vi.fn(),
  update: vi.fn(),
}
const templatesApi = { ensureFromMeta: vi.fn(), list: vi.fn() }
const tagsApi = { list: vi.fn() }
const contactsApi = { list: vi.fn() }
const whatsappNumbersApi = { list: vi.fn() }

vi.mock('@/services/api', () => ({
  campaignsApi: { create: (...a: unknown[]) => campaignsApi.create(...a), send: (...a: unknown[]) => campaignsApi.send(...a), update: (...a: unknown[]) => campaignsApi.update(...a) },
  templatesApi: { ensureFromMeta: () => templatesApi.ensureFromMeta(), list: (...a: unknown[]) => templatesApi.list(...a) },
  tagsApi: { list: () => tagsApi.list() },
  contactsApi: { list: (...a: unknown[]) => contactsApi.list(...a) },
  whatsappNumbersApi: { list: () => whatsappNumbersApi.list() },
}))

vi.mock('@/hooks/useSmartLineDefault', () => ({
  useSmartLineDefault: () => ({ lineId: null, source: 'unresolved', lineCount: 1, loading: false }),
}))

vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({ stages: [], fieldDefs: [] }),
}))

const wizardEvents: Array<{ action: string; error_message?: string }> = []
vi.mock('@/services/appLogger', () => ({
  appLogger: {
    logWizardEvent: (d: { action: string; error_message?: string }) => { wizardEvents.push(d) },
    logActivity: vi.fn(),
  },
}))

const { useWizardDraft } = await import('./useWizardDraft')

const TEMPLATE = {
  id: 'tpl_9', name: 'novo_lancamento_v2', body: 'Oi', language: 'pt_BR',
  category: 'MARKETING', status: 'APPROVED', bodyVariables: [],
  tenantId: 't1', createdAt: '', updatedAt: '',
}

const CREATED = { id: 'camp_1', name: 'Lançamento', status: 'draft' } as unknown as Campaign
const SENT    = { id: 'camp_1', name: 'Lançamento', status: 'sending' } as unknown as Campaign

const LINE = { id: 'wa_1', displayPhoneNumber: '+55 11 90000-0000', label: 'Comercial' }

beforeEach(() => {
  wizardEvents.length = 0
  vi.clearAllMocks()
  templatesApi.ensureFromMeta.mockResolvedValue(undefined)
  templatesApi.list.mockResolvedValue({ data: [TEMPLATE] })
  tagsApi.list.mockResolvedValue({ data: [] })
  contactsApi.list.mockResolvedValue({ data: { data: [] } })
  whatsappNumbersApi.list.mockResolvedValue({ data: [LINE] })
})

/** Abre o wizard, espera a carga inicial e deixa o rascunho pronto para
 *  submeter: template escolhido, nome preenchido, segmento "todos". */
async function readyDraft(onCreated = vi.fn()) {
  const hook = renderHook(() => useWizardDraft(true, onCreated))
  await waitFor(() => expect(hook.result.current.templates).toHaveLength(1))
  act(() => {
    hook.result.current.setSelectedTemplate(TEMPLATE as never)
    hook.result.current.setCampaignName('  Lançamento  ')
  })
  return { hook, onCreated }
}

describe('useWizardDraft — submissão real (núcleo NÃO mockado)', () => {
  it('criação com envio: cria, dispara e entrega a campanha já enviada', async () => {
    campaignsApi.create.mockResolvedValue({ data: CREATED })
    campaignsApi.send.mockResolvedValue({ data: SENT })
    const { hook, onCreated } = await readyDraft()

    await act(async () => { await hook.result.current.handleSubmit() })

    // Nome vai aparado, segmento no formato legado, sem scheduledAt no modo
    // "agora", e a linha escolhida junto.
    expect(campaignsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Lançamento',
      templateId: 'tpl_9',
      segment: { type: 'all' },
      scheduledAt: undefined,
      whatsappNumberId: 'wa_1',
    }))
    expect(campaignsApi.send).toHaveBeenCalledWith('camp_1')
    // Quem recebe é a campanha DEPOIS do envio, não a recém-criada.
    expect(onCreated).toHaveBeenCalledWith(SENT)
    expect(hook.result.current.error).toBe('')
    expect(hook.result.current.saving).toBe(false)
    expect(wizardEvents.filter((e) => e.action === 'completed').length).toBeGreaterThan(0)
  })

  it('criação OK com envio falhando: avisa o erro E segue para onCreated', async () => {
    // Este é o caso que quebraria calado. A campanha JÁ EXISTE no banco;
    // tratar como falha deixaria a tela sem saber disso.
    campaignsApi.create.mockResolvedValue({ data: CREATED })
    campaignsApi.send.mockRejectedValue({ response: { data: { message: 'Linha sem saldo' } } })
    const { hook, onCreated } = await readyDraft()

    await act(async () => { await hook.result.current.handleSubmit() })

    expect(hook.result.current.error).toBe('Linha sem saldo')
    // Segue com a campanha criada — o usuário consegue disparar pela lista.
    expect(onCreated).toHaveBeenCalledWith(CREATED)
    expect(wizardEvents.some((e) => e.action === 'completed')).toBe(true)
    expect(wizardEvents.some((e) => e.action === 'error')).toBe(false)
  })

  it('falha na criação: não avisa onCreated e registra o erro na telemetria', async () => {
    campaignsApi.create.mockRejectedValue({ response: { data: { message: 'Template não aprovado' } } })
    const { hook, onCreated } = await readyDraft()

    await act(async () => { await hook.result.current.handleSubmit() })

    expect(hook.result.current.error).toBe('Template não aprovado')
    expect(campaignsApi.send).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
    const erro = wizardEvents.find((e) => e.action === 'error')
    expect(erro?.error_message).toBe('Template não aprovado')
    expect(hook.result.current.saving).toBe(false)
  })
})

describe('useWizardDraft — detalhes do caminho legado que a superfície não prova', () => {
  it('modo "agendar" manda ISO em UTC e NÃO dispara o envio', async () => {
    campaignsApi.create.mockResolvedValue({ data: CREATED })
    const { hook, onCreated } = await readyDraft()

    act(() => {
      hook.result.current.setScheduleMode('later')
      hook.result.current.setScheduledAt('2026-09-08T18:00')
    })
    await act(async () => { await hook.result.current.handleSubmit() })

    const dto = campaignsApi.create.mock.calls[0][0]
    expect(dto.scheduledAt).toBe(new Date('2026-09-08T18:00').toISOString())
    expect(campaignsApi.send).not.toHaveBeenCalled()
    expect(onCreated).toHaveBeenCalledWith(CREATED)
  })

  it('segmento por tags viaja como o modelo legado', async () => {
    campaignsApi.create.mockResolvedValue({ data: CREATED })
    campaignsApi.send.mockResolvedValue({ data: SENT })
    const { hook } = await readyDraft()

    act(() => {
      hook.result.current.setSegmentType('tag')
      hook.result.current.setSelectedTagIds(['tag_a', 'tag_b'])
    })
    await act(async () => { await hook.result.current.handleSubmit() })

    expect(campaignsApi.create.mock.calls[0][0].segment)
      .toEqual({ type: 'tag', tagIds: ['tag_a', 'tag_b'] })
  })

  it('mensagem em lista do Nest vira uma linha só', async () => {
    campaignsApi.create.mockRejectedValue({ response: { data: { message: ['campo a', 'campo b'] } } })
    const { hook } = await readyDraft()

    await act(async () => { await hook.result.current.handleSubmit() })
    expect(hook.result.current.error).toBe('campo a; campo b')
  })

  it('sem mensagem do backend cai no texto padrão de criação', async () => {
    campaignsApi.create.mockRejectedValue({ response: { data: {} } })
    const { hook } = await readyDraft()

    await act(async () => { await hook.result.current.handleSubmit() })
    expect(hook.result.current.error).toBe('Erro ao criar campanha. Verifique os campos e tente novamente.')
  })
})
