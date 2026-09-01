import { dealsApi } from '@/services/api'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'

/** Janela do "Desfazer" logo após fechar um negócio (A4 · SCRUM-926). */
export const UNDO_CLOSE_WINDOW_MS = 5000

/**
 * Confirmação de fechamento com **Desfazer** (P7: confirmar com alcance,
 * desfazer quando não precisa confirmar).
 *
 * O modal de motivo já é a confirmação; o que faltava era a saída para quem
 * arrastou o card errado ou escolheu o motivo errado. "Desfazer" reabre o
 * registro na etapa de ONDE ele saiu — `reopen` sem etapa devolveria à
 * primeira coluna do funil, o que não é desfazer, é mover.
 *
 * Passados os 5 s, reabrir continua possível pelo botão "Reabrir" da linha do
 * registro fechado (ficha, painel e aba).
 */
export function toastDealClosedWithUndo(opts: {
  message: string
  dealId: string
  /** Etapa de origem — para onde o Desfazer devolve o registro. */
  fromStageId: string
  /** Recarregar a superfície depois de reabrir. */
  onUndone?: () => void
}): void {
  showToast(
    opts.message,
    'success',
    {
      label: 'Desfazer',
      onClick: () => {
        void dealsApi
          .setStatus(opts.dealId, { status: 'open', stageId: opts.fromStageId })
          .then(() => {
            showToast('Fechamento desfeito — o negócio voltou para a etapa anterior.', 'info')
            opts.onUndone?.()
          })
          .catch((e: unknown) => {
            // 409 = o contato já tem outro registro aberto neste funil (I1):
            // a mensagem do backend explica melhor do que "erro ao desfazer".
            showToast(getApiErrorMessage(e, 'Não foi possível desfazer o fechamento.'), 'error')
          })
      },
    },
    UNDO_CLOSE_WINDOW_MS,
  )
}
