// A tela chama estas mutações de dentro de um ConfirmModal (que tipa `onConfirm`
// como `() => void` e descarta a promessa) e de `void run(...)` nos cartões.
// Nos dois caminhos, uma rejeição não teria quem a pegasse — então ela não pode
// existir: erro vira toast aqui dentro.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const pause = vi.fn()
const resume = vi.fn()
const cancel = vi.fn()
const showToast = vi.fn()

vi.mock('@/services/campaignsV2Api', () => ({
  campaignLifecycleApi: {
    pause: (...a: unknown[]) => pause(...a),
    resume: (...a: unknown[]) => resume(...a),
    cancel: (...a: unknown[]) => cancel(...a),
  },
}))
vi.mock('@/hooks/useToast', () => ({ showToast: (...a: unknown[]) => showToast(...a) }))

import { useCampaignLifecycle } from './useCampaignLifecycle'

describe('useCampaignLifecycle — a ação nunca falha calada', () => {
  beforeEach(() => {
    pause.mockReset(); resume.mockReset(); cancel.mockReset(); showToast.mockReset()
  })

  it('500 vira toast e `null`, sem rejeitar para quem chamou', async () => {
    pause.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500 } }))
    const onUpdated = vi.fn()
    const { result } = renderHook(() => useCampaignLifecycle(onUpdated))

    let devolvido: unknown = 'não resolveu'
    await act(async () => { devolvido = await result.current.run('pause', 'c1') })

    expect(devolvido).toBeNull()
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('pausar'), 'error')
    expect(onUpdated).not.toHaveBeenCalled()
    // E o controle continua disponível: um 500 não é "o endpoint não existe".
    expect(result.current.can('pause')).toBe(true)
    expect(result.current.busy).toBeNull()
  })

  it('cada ação diz o que NÃO mudou', async () => {
    cancel.mockRejectedValue(new Error('rede caiu'))
    const { result } = renderHook(() => useCampaignLifecycle(vi.fn()))
    await act(async () => { await result.current.run('cancel', 'c1') })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Nada mudou'), 'error')
  })

  it('404 continua sendo o caminho de "ainda não existe", não o de erro', async () => {
    cancel.mockRejectedValue(Object.assign(new Error('nope'), { response: { status: 404 } }))
    const { result } = renderHook(() => useCampaignLifecycle(vi.fn()))
    await act(async () => { await result.current.run('cancel', 'c1') })

    expect(result.current.can('cancel')).toBe(false)
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('próxima atualização'), 'info')
  })
})

// `POST /campaigns/:id/resume` não existe no backend do 992: o
// `campaigns.controller.ts:150` tem só o comentário dizendo que ele saiu do PR.
// `cancel` (:136) e `pause` (:143) existem.
describe('useCampaignLifecycle — a rota que não existe', () => {
  beforeEach(() => {
    pause.mockReset(); resume.mockReset(); cancel.mockReset(); showToast.mockReset()
  })

  it('não oferece "Retomar" nem tenta a rota, porque a capacidade não existe', async () => {
    const { result } = renderHook(() => useCampaignLifecycle(vi.fn()))
    expect(result.current.can('resume')).toBe(false)

    await act(async () => { await result.current.run('resume', 'c1') })
    expect(resume).not.toHaveBeenCalled()
    // Nem toast: um botão que não está na tela não tem por que explicar nada.
    expect(showToast).not.toHaveBeenCalled()
  })

  it('e as duas que EXISTEM continuam de pé ao lado dela', () => {
    const { result } = renderHook(() => useCampaignLifecycle(vi.fn()))
    expect(result.current.can('pause')).toBe(true)
    expect(result.current.can('cancel')).toBe(true)
  })

  // O defeito que a bandeira única produzia: pausar funcionava, o clique em
  // "Retomar" respondia 404, e a campanha ficava PRESA — sem retomar, porque a
  // rota não existe, e sem cancelar, porque o botão sumia por causa do erro de
  // OUTRA rota. Só um refresh soltava.
  it('um 404 numa ação NÃO derruba as outras duas', async () => {
    pause.mockRejectedValue(Object.assign(new Error('nope'), { response: { status: 404 } }))
    const { result } = renderHook(() => useCampaignLifecycle(vi.fn()))
    await act(async () => { await result.current.run('pause', 'c1') })

    expect(result.current.can('pause')).toBe(false)
    expect(result.current.can('cancel')).toBe(true)
  })

  it('o aviso nomeia SÓ a ação que saiu do ar', async () => {
    pause.mockRejectedValue(Object.assign(new Error('nope'), { response: { status: 404 } }))
    const { result } = renderHook(() => useCampaignLifecycle(vi.fn()))
    await act(async () => { await result.current.run('pause', 'c1') })

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/^Pausar um disparo/), 'info')
    expect(showToast).not.toHaveBeenCalledWith(expect.stringContaining('cancelar'), 'info')
  })

  it('sucesso entrega a campanha atualizada ao chamador', async () => {
    // `api.post<Campaign>` — o corpo da resposta JÁ é a campanha, sem envelope.
    pause.mockResolvedValue({ data: { id: 'c1', status: 'paused' } })
    const onUpdated = vi.fn()
    const { result } = renderHook(() => useCampaignLifecycle(onUpdated))
    await act(async () => { await result.current.run('pause', 'c1') })
    expect(onUpdated).toHaveBeenCalledWith({ id: 'c1', status: 'paused' })
    expect(showToast).not.toHaveBeenCalled()
  })
})
