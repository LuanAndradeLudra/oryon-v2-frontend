// ─── Conversas — conteúdo da TopBar (spec 1d CONV-HDR-04/05/06/07/08) ────────
// A TopBar (48px) é do Shell; o que a página de Conversas põe nela é:
//   • subtítulo "N abertas · N pendentes" (CONV-HDR-04) — contagens reais que
//     `useConversations` já devolve (`statusCounts`, calculadas no backend);
//   • chip da linha "Linha X · conectada" (CONV-HDR-05/06) — linha primária
//     (ou a única) do `WorkspaceNumberContext`; some se não houver linha ou se
//     ela não estiver conectada — nunca mostra "conectada" sem evidência;
//   • (PO 01/10) o botão "Nova conversa" saiu daqui: mora ao lado da busca da
//     lista (ConversationList, prop onNewConversation) — revoga CONV-HDR-08.
// Fica em `layout/` (arquivo do orquestrador) e a página só o monta, pra não
// competir com a leva 1d nos arquivos de `conversations/`.
//
// Vocabulário: o mock diz "aguardando"; o app chama o status `pending` de
// "Pendentes" nas abas da lista — o header usa a MESMA palavra das abas pra
// não parecer que são duas contagens diferentes (decisão registrada no GAPS).
import { useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { usePrimaryConnectedLine } from '@/hooks/usePrimaryConnectedLine'
import { ConnectedLineChip } from '@/components/layout/ConnectedLineChip'
import { useContagensDaFila } from '@/hooks/useContagensDaFila'
import type { ConversationStatusCounts, PendingCounts } from '@/types'

interface Props {
  statusCounts: ConversationStatusCounts
  /** SCRUM-1161 C5 — vem na leitura da lista; null/ausente = backend antigo. */
  pendingCounts?: PendingCounts | null
  /** Linha do seletor do topo (as contagens seguem a mesma linha). */
  whatsappNumberId?: string
}

export function ConversationsTopBarSlot({ statusCounts, pendingCounts, whatsappNumberId }: Props) {
  const { connected: lineConnected, label: lineLabel } = usePrimaryConnectedLine()

  // SCRUM-1253 (PO, 06/10 — D11): contagens que NÃO dependem da aba ativa — "na fila" (pendentes
  // sem dono) e "aguardando você" (pendentes suas). Revisão 11/10: a fonte e a
  // releitura (socket + ações do próprio operador) moram em useContagensDaFila.
  const fila = useContagensDaFila(pendingCounts, whatsappNumberId)

  useRegisterTopBarSubtitle(
    <>
      {fila
        ? `${fila.naFila} na fila · ${fila.suas} aguardando você`
        : `${statusCounts.open} abertas · ${statusCounts.pending} pendentes`}
      {lineConnected && (
        <span className="ml-3">
          <ConnectedLineChip>Linha {lineLabel} · conectada</ConnectedLineChip>
        </span>
      )}
    </>,
    [statusCounts.open, statusCounts.pending, lineConnected, lineLabel, fila?.naFila, fila?.suas],
  )


  return null
}
