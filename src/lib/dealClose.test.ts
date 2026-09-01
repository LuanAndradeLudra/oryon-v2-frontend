// A4 (SCRUM-926) — "Desfazer" do fechamento: 5 s para devolver o negócio à
// etapa de ONDE ele saiu. Reabrir sem etapa jogaria o registro na primeira
// coluna do funil, o que não é desfazer, é mover.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const setStatus = vi.fn()
const showToast = vi.fn()

vi.mock('@/services/api', () => ({ dealsApi: { setStatus: (...args: unknown[]) => setStatus(...args) } }))
vi.mock('@/hooks/useToast', () => ({ showToast: (...args: unknown[]) => showToast(...args) }))

const { toastDealClosedWithUndo, UNDO_CLOSE_WINDOW_MS } = await import('./dealClose')

type UndoAction = { label: string; onClick: () => void }

describe('toastDealClosedWithUndo', () => {
  beforeEach(() => {
    setStatus.mockReset().mockResolvedValue({ data: {} })
    showToast.mockReset()
  })

  it('anuncia o fechamento com a ação Desfazer, pela janela combinada', () => {
    toastDealClosedWithUndo({ message: 'Ganho.', dealId: 'd1', fromStageId: 's2' })

    expect(showToast).toHaveBeenCalledWith('Ganho.', 'success', expect.objectContaining({ label: 'Desfazer' }), UNDO_CLOSE_WINDOW_MS)
    expect(UNDO_CLOSE_WINDOW_MS).toBe(5000)
  })

  it('Desfazer reabre na etapa de origem e avisa quem chamou', async () => {
    const onUndone = vi.fn()
    toastDealClosedWithUndo({ message: 'Perdido.', dealId: 'd1', fromStageId: 's2', onUndone })

    const action = showToast.mock.calls[0][2] as UndoAction
    action.onClick()
    await vi.waitFor(() => expect(onUndone).toHaveBeenCalled())

    expect(setStatus).toHaveBeenCalledWith('d1', { status: 'open', stageId: 's2' })
  })

  it('falha ao desfazer (409 de I1, por exemplo) vira toast de erro com a mensagem do backend', async () => {
    setStatus.mockRejectedValue({ response: { data: { message: 'Este contato já tem outro negócio aberto neste funil.' } } })
    toastDealClosedWithUndo({ message: 'Perdido.', dealId: 'd1', fromStageId: 's2' })

    const action = showToast.mock.calls[0][2] as UndoAction
    action.onClick()

    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Este contato já tem outro negócio aberto neste funil.', 'error'),
    )
  })
})
