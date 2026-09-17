// ─── O núcleo contra resposta de shape inesperado ──────────────────────────
// Eixo próprio, e não um caso solto no teste de submissão: o que se prova aqui
// é que uma resposta 200 com a FORMA errada não derruba a tela nem some com o
// resto da carga.
//
// Não é hipótese. O `campaignsApi.list` (`api.ts:1565`) já defende contra
// exatamente isto, com o comentário "Backend returns {data, total, page,
// limit} — extract array for backward compat": este backend devolve as duas
// formas conforme o endpoint, e a defesa existia num lugar só.
//
// Os casos rodam pelo `useWizardDraft` de propósito. O núcleo é COMPARTILHADO,
// e depois do #170 o wizard é o único caminho de criação que existe — é ali que
// o defeito era alcançável, não no Composer desligado.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const templatesApi = { ensureFromMeta: vi.fn(), list: vi.fn() }
const tagsApi = { list: vi.fn() }
const contactsApi = { list: vi.fn() }
const whatsappNumbersApi = { list: vi.fn() }

vi.mock('@/services/api', () => ({
  campaignsApi: { create: vi.fn(), send: vi.fn(), update: vi.fn() },
  templatesApi: {
    ensureFromMeta: () => templatesApi.ensureFromMeta(),
    list: (...a: unknown[]) => templatesApi.list(...a),
  },
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
vi.mock('@/services/appLogger', () => ({
  appLogger: {
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    logActivity: vi.fn(), logWizardEvent: vi.fn(),
  },
}))

const { useWizardDraft } = await import('./useWizardDraft')

const TEMPLATE = { id: 't1', name: 'x', body: 'oi', status: 'APPROVED' }
const CONTATO = { id: 'c1', displayName: 'Marina', waId: '5511999990001' }
const LINHA = { id: 'l1', displayPhoneNumber: '+55 11 9…-1234', label: 'Comercial' }

/** Forma CERTA de cada endpoint, para cada caso trocar só a que ele testa. */
function comFormaCerta() {
  templatesApi.ensureFromMeta.mockResolvedValue({ data: {} })
  templatesApi.list.mockResolvedValue({ data: [TEMPLATE] })
  tagsApi.list.mockResolvedValue({ data: [] })
  contactsApi.list.mockResolvedValue({ data: { data: [CONTATO], total: 1 } })
  whatsappNumbersApi.list.mockResolvedValue({ data: [LINHA] })
}

function montar() {
  return renderHook(() => useWizardDraft(true, vi.fn()))
}

beforeEach(() => {
  vi.clearAllMocks()
  comFormaCerta()
})

describe('useCampaignDraftCore — 200 com a forma errada não para a carga', () => {
  it('forma certa: a carga inteira chega (controle)', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.loadingTemplates).toBe(false))

    expect(result.current.templates).toHaveLength(1)
    expect(result.current.contacts).toHaveLength(1)
    expect(result.current.waNumbers).toHaveLength(1)
  })

  it('/meta/numbers devolvendo envelope não some com o resto da carga', async () => {
    // Era aqui que estourava: `waRes.data.map is not a function`. O throw
    // acontecia DEPOIS de `setContacts`, então a carga parava no meio — sem
    // linhas, sem padrão inteligente — e ninguém era avisado.
    whatsappNumbersApi.list.mockResolvedValue({ data: { data: [LINHA], total: 1 } })
    const { result } = montar()
    await waitFor(() => expect(result.current.loadingTemplates).toBe(false))

    expect(result.current.waNumbers).toEqual([])
    // O que importa: o RESTO sobreviveu.
    expect(result.current.templates).toHaveLength(1)
    expect(result.current.contacts).toHaveLength(1)
    // E o `error` VAZIO e' o que separa "guardou" de "estourou e o `.catch`
    // pegou" — nos dois mundos as tres linhas acima passam. Sem esta, a
    // mutacao desta guarda nao derruba caso nenhum (medido). Lista com forma
    // errada degrada em silencio; nao e' falha de carga, e a tela nao pode
    // dizer que foi.
    expect(result.current.error).toBe('')
  })

  it('/contacts devolvendo array cru não derruba a tela no render', async () => {
    // `contacts` virava `undefined`, e o `useMemo` do `estimatedReach` lê
    // `contacts.length` DURANTE o render — ErrorBoundary, tela derrubada.
    contactsApi.list.mockResolvedValue({ data: [CONTATO] })
    const { result } = montar()
    await waitFor(() => expect(result.current.loadingTemplates).toBe(false))

    expect(result.current.contacts).toEqual([])
    // Ler isto é o que quebrava: se `contacts` for undefined, o acesso lança
    // dentro do render e nem chega aqui.
    expect(result.current.estimatedReach).toBeNull()
    expect(result.current.waNumbers).toHaveLength(1)
    expect(result.current.error).toBe('')
  })

  // As duas de baixo existem porque a MUTACAO cobrou: tirar a guarda de
  // `templates` ou a de `tags` nao derrubava caso nenhum, e guarda que nenhum
  // teste prende e' guarda que o proximo refactor apaga sem ninguem ver.
  it('/templates devolvendo envelope nao derruba a lista de templates', async () => {
    // `templates` virando `undefined` quebra no render de quem filtra a lista.
    templatesApi.list.mockResolvedValue({ data: { data: [TEMPLATE], total: 1 } })
    const { result } = montar()
    await waitFor(() => expect(result.current.loadingTemplates).toBe(false))

    expect(result.current.templates).toEqual([])
    expect(result.current.contacts).toHaveLength(1)
    expect(result.current.waNumbers).toHaveLength(1)
    expect(result.current.error).toBe('')
  })

  it('/tags devolvendo envelope nao derruba o resto', async () => {
    tagsApi.list.mockResolvedValue({ data: { data: [], total: 0 } })
    const { result } = montar()
    await waitFor(() => expect(result.current.loadingTemplates).toBe(false))

    expect(result.current.tags).toEqual([])
    expect(result.current.templates).toHaveLength(1)
    expect(result.current.waNumbers).toHaveLength(1)
    expect(result.current.error).toBe('')
  })

  it('carga que FALHA diz que falhou, em vez de fingir tela vazia', async () => {
    // Sem o `.catch` isto era rejeição não tratada: `loading` voltava a false
    // pelo `.finally` e o operador lia "nenhum template, nenhuma linha" como
    // se fosse verdade. Estado desconhecido não é estado vazio.
    templatesApi.list.mockRejectedValue(new Error('500'))
    const { result } = montar()
    await waitFor(() => expect(result.current.loadingTemplates).toBe(false))

    expect(result.current.error).toMatch(/não foi possível carregar|nao foi possivel carregar/i)
  })
})
