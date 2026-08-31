// ─── AnomalyDetailModal — "Marcar como verificada" (SCRUM-806) ───────────────
// O rodapé do modal é a porta de reconhecimento da verificação pendente.
// Regras cobertas:
//   1. O botão só existe para anomalia de HANDOFF e quando o chamador informa
//      o conversationId — anomalia "corrected" nunca entra na triagem.
//   2. Confirmar chama a API da conversa (não da mensagem) e fecha o modal;
//      badge/contagem atualizam via socket, fora do escopo deste componente.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AnomalyDetailModal } from '@/components/conversations/ChatWindow/AnomalyDetailModal'
import { conversationsApi } from '@/services/api'
import type { Message } from '@/types'

vi.mock('@/services/api', () => ({
  conversationsApi: { resolveReview: vi.fn(async () => ({ data: {} })) },
}))

type Anomaly = NonNullable<Message['anomaly']>

const base = {
  claimType: null,
  matchedText: null,
  outcome: null,
  occurredAt: null,
  requiredSkill: null,
  skillFailures: [],
} satisfies Partial<Anomaly>

const handoff = { ...base, kind: 'handoff' } as Anomaly
const corrected = { ...base, kind: 'corrected' } as Anomaly

const BOTAO = /Marcar como verificada/

describe('rodapé "Marcar como verificada"', () => {
  it('aparece para handoff com conversationId', () => {
    render(
      <AnomalyDetailModal open onClose={() => {}} anomaly={handoff} conversationId="conv-1" />,
    )
    expect(screen.getByRole('button', { name: BOTAO })).toBeInTheDocument()
  })

  it('NÃO aparece para anomalia corrigida nem sem conversationId', () => {
    const { unmount } = render(
      <AnomalyDetailModal open onClose={() => {}} anomaly={corrected} conversationId="conv-1" />,
    )
    expect(screen.queryByRole('button', { name: BOTAO })).toBeNull()
    unmount()

    render(<AnomalyDetailModal open onClose={() => {}} anomaly={handoff} />)
    expect(screen.queryByRole('button', { name: BOTAO })).toBeNull()
  })

  it('confirma → chama a API com o id da CONVERSA e fecha o modal', async () => {
    const onClose = vi.fn()
    const onResolved = vi.fn()
    render(
      <AnomalyDetailModal
        open
        onClose={onClose}
        anomaly={handoff}
        conversationId="conv-1"
        onResolved={onResolved}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: BOTAO }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(vi.mocked(conversationsApi.resolveReview)).toHaveBeenCalledWith('conv-1')
    expect(onResolved).toHaveBeenCalled()
  })

  it('já verificada → sem botão, mostra quem/quando verificou', () => {
    const reviewed = { ...handoff, reviewedAt: '2026-08-30T21:40:00Z', reviewedBy: 'Ana Souza' } as Anomaly
    render(<AnomalyDetailModal open onClose={() => {}} anomaly={reviewed} conversationId="conv-1" />)
    expect(screen.queryByRole('button', { name: BOTAO })).toBeNull()
    expect(screen.getByTestId('anomaly-reviewed')).toHaveTextContent(/Verificada por Ana Souza em/)
    expect(screen.getByText('Verificada pelo atendente')).toBeInTheDocument()
  })

  it('falha da API mantém o modal aberto e mostra o erro', async () => {
    const onClose = vi.fn()
    vi.mocked(conversationsApi.resolveReview).mockRejectedValueOnce(new Error('500'))
    render(
      <AnomalyDetailModal open onClose={onClose} anomaly={handoff} conversationId="conv-1" />,
    )
    fireEvent.click(screen.getByRole('button', { name: BOTAO }))
    await waitFor(() =>
      expect(screen.getByText(/Não foi possível marcar como verificada/)).toBeInTheDocument(),
    )
    expect(onClose).not.toHaveBeenCalled()
  })
})
