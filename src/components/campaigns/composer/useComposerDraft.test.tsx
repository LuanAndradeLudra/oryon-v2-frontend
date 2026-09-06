// Testes do estado derivado do Composer (D2/SCRUM-1020): conclusão por
// bloco, primeiro bloco pendente e — o ponto que mais dói na prática — a
// regra de que uma contagem `null` transitória do `AudienceBlock` NÃO pode
// derrubar o bloco Público para pendente (coord/D2-plano.md §9.3).
//
// O núcleo (`useCampaignDraftCore`) faz rede no mount; aqui ele é mockado
// por completo, porque o que está sob teste é só a derivação do Composer.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { CampaignSegmentDefinition } from '@/types/campaignsV2'

const coreState = {
  selectedTemplate: null as { id: string; name: string } | null,
  campaignName: '',
  mappings: [] as unknown[],
  mappingsComplete: true,
  scheduleReady: true,
  needsExplicitLine: false,
}

const submitCampaign = vi.fn()

vi.mock('./useCampaignDraftCore', () => ({
  useCampaignDraftCore: () => ({ ...coreState, submitCampaign }),
}))

const { useComposerDraft } = await import('./useComposerDraft')

// `SegmentGroup` (types/campaignsV2.ts) NAO tem `id`: os ids de grupo e
// condicao existem so no reducer do Crivo, como chave de React, e nunca vao
// para a API (D6-plano.md §2). Por isso as duas definicoes se distinguem
// pelo conteudo, que e exatamente o que viaja no body.
const DEF_A: CampaignSegmentDefinition = { groups: [{ op: 'and', conditions: [] }] }
const DEF_B: CampaignSegmentDefinition = { groups: [{ op: 'or', conditions: [] }] }

/** Deixa os blocos Template/Variáveis/Envio verdes, isolando o Público. */
function readyCore() {
  coreState.selectedTemplate = { id: 'tpl-1', name: 'boas_vindas' }
  coreState.campaignName = 'Campanha de teste'
  coreState.mappings = []
  coreState.mappingsComplete = true
  coreState.scheduleReady = true
  coreState.needsExplicitLine = false
}

beforeEach(() => {
  submitCampaign.mockReset()
  coreState.selectedTemplate = null
  coreState.campaignName = ''
  coreState.mappings = []
  coreState.mappingsComplete = true
  coreState.scheduleReady = true
  coreState.needsExplicitLine = false
})

describe('useComposerDraft — conclusão por bloco', () => {
  it('nasce com Template pendente e é ele o "Falta"', () => {
    const { result } = renderHook(() => useComposerDraft())
    expect(result.current.blocks.template).toBe('pending')
    expect(result.current.firstPending).toBe('template')
    expect(result.current.canSchedule).toBe(false)
  })

  it('Template só fica verde com template E nome preenchidos', () => {
    coreState.selectedTemplate = { id: 'tpl-1', name: 'boas_vindas' }
    coreState.campaignName = '   '
    const { result } = renderHook(() => useComposerDraft())
    expect(result.current.blocks.template).toBe('pending')
  })

  it('Público exige público confirmado com pelo menos 1 elegível', () => {
    readyCore()
    const { result } = renderHook(() => useComposerDraft())
    expect(result.current.blocks.publico).toBe('pending')
    expect(result.current.firstPending).toBe('publico')

    act(() => { result.current.setAudience({ definition: DEF_A }) })
    // Público escolhido mas ainda sem contagem — continua pendente.
    expect(result.current.blocks.publico).toBe('pending')

    act(() => { result.current.onAudienceResolved({ eligible: 184, matched: 311 }) })
    expect(result.current.blocks.publico).toBe('done')
    expect(result.current.audienceCount).toBe(184)
    expect(result.current.canSchedule).toBe(true)
  })

  it('público que resolve para 0 elegíveis não libera o disparo', () => {
    readyCore()
    const { result } = renderHook(() => useComposerDraft())
    act(() => { result.current.setAudience({ definition: DEF_A }) })
    act(() => { result.current.onAudienceResolved({ eligible: 0, matched: 12 }) })
    expect(result.current.blocks.publico).toBe('pending')
    expect(result.current.canSchedule).toBe(false)
  })

  it('Variáveis fica pendente enquanto houver mapeamento incompleto', () => {
    readyCore()
    coreState.mappings = [{ position: 1 }]
    coreState.mappingsComplete = false
    const { result } = renderHook(() => useComposerDraft())
    expect(result.current.blocks.variaveis).toBe('pending')
  })

  it('Envio fica pendente sem escolha de linha em tenant multi-WABA', () => {
    readyCore()
    coreState.needsExplicitLine = true
    const { result } = renderHook(() => useComposerDraft())
    expect(result.current.blocks.envio).toBe('pending')
  })

  it('"Falta" aponta o primeiro pendente na ordem canônica', () => {
    coreState.mappings = [{ position: 1 }]
    coreState.mappingsComplete = false
    coreState.scheduleReady = false
    const { result } = renderHook(() => useComposerDraft())
    // Template, Público, Variáveis e Envio pendentes → aponta o Template.
    expect(result.current.firstPending).toBe('template')
  })
})

describe('useComposerDraft — contagem não pode piscar (§9.3)', () => {
  it('null transitório mantém o bloco Público verde', () => {
    readyCore()
    const { result } = renderHook(() => useComposerDraft())
    act(() => { result.current.setAudience({ definition: DEF_A }) })
    act(() => { result.current.onAudienceResolved({ eligible: 184, matched: 311 }) })
    expect(result.current.blocks.publico).toBe('done')

    // Debounce do evaluate / modo fallback: chega `null` sem que a
    // definição tenha mudado.
    act(() => { result.current.onAudienceResolved(null) })
    expect(result.current.audienceCount).toBe(184)
    expect(result.current.blocks.publico).toBe('done')
    expect(result.current.canSchedule).toBe(true)
  })

  it('trocar a definição invalida a contagem e derruba o bloco', () => {
    readyCore()
    const { result } = renderHook(() => useComposerDraft())
    act(() => { result.current.setAudience({ definition: DEF_A }) })
    act(() => { result.current.onAudienceResolved({ eligible: 184, matched: 311 }) })

    act(() => { result.current.setAudience({ definition: DEF_B }) })
    act(() => { result.current.onAudienceResolved(null) })
    expect(result.current.audienceCount).toBeNull()
    expect(result.current.blocks.publico).toBe('pending')
  })

  it('reenviar a MESMA definição não invalida a contagem', () => {
    readyCore()
    const { result } = renderHook(() => useComposerDraft())
    act(() => { result.current.setAudience({ definition: DEF_A }) })
    act(() => { result.current.onAudienceResolved({ eligible: 42, matched: 90 }) })

    // Mesmo conteúdo, objeto novo — o `AudienceBlock` recria a definição a
    // cada render, então a comparação precisa ser estrutural, não por
    // referência.
    act(() => { result.current.setAudience({ definition: { groups: [{ op: 'and', conditions: [] }] } }) })
    act(() => { result.current.onAudienceResolved(null) })
    expect(result.current.audienceCount).toBe(42)
    expect(result.current.blocks.publico).toBe('done')
  })
})

describe('useComposerDraft — submissão', () => {
  it('segmento salvo intocado viaja por segmentId', async () => {
    readyCore()
    submitCampaign.mockResolvedValue({ ok: true, campaign: { id: 'camp-1' } })
    const { result } = renderHook(() => useComposerDraft())
    act(() => { result.current.setAudience({ segmentId: 'seg-9', definition: DEF_A }) })

    await act(async () => { await result.current.submit() })
    expect(submitCampaign).toHaveBeenCalledWith({
      audienceFields: { segmentId: 'seg-9' },
      campaignId: undefined,
    })
  })

  it('público montado à mão viaja inline, nunca como segment legado', async () => {
    readyCore()
    submitCampaign.mockResolvedValue({ ok: true, campaign: { id: 'camp-1' } })
    const { result } = renderHook(() => useComposerDraft())
    act(() => { result.current.setAudience({ definition: DEF_A }) })

    await act(async () => { await result.current.submit() })
    expect(submitCampaign).toHaveBeenCalledWith({
      audienceFields: { audience: DEF_A },
      campaignId: undefined,
    })
  })

  it('modo edição repassa o campaignId e avisa quem salvou', async () => {
    readyCore()
    const onSaved = vi.fn()
    submitCampaign.mockResolvedValue({ ok: true, campaign: { id: 'camp-7' } })
    const { result } = renderHook(() => useComposerDraft({ campaignId: 'camp-7', onSaved }))
    act(() => { result.current.setAudience({ definition: DEF_A }) })

    await act(async () => { await result.current.submit() })
    expect(submitCampaign).toHaveBeenCalledWith({
      audienceFields: { audience: DEF_A },
      campaignId: 'camp-7',
    })
    expect(onSaved).toHaveBeenCalledWith({ id: 'camp-7' })
  })

  it('sem público escolhido não chama o backend', async () => {
    readyCore()
    const { result } = renderHook(() => useComposerDraft())
    await act(async () => { await result.current.submit() })
    expect(submitCampaign).not.toHaveBeenCalled()
  })

  it('falha do backend não avisa quem salvou', async () => {
    readyCore()
    const onSaved = vi.fn()
    submitCampaign.mockResolvedValue({ ok: false, rawMessage: 'boom' })
    const { result } = renderHook(() => useComposerDraft({ onSaved }))
    act(() => { result.current.setAudience({ definition: DEF_A }) })

    await act(async () => { await result.current.submit() })
    expect(onSaved).not.toHaveBeenCalled()
  })
})
