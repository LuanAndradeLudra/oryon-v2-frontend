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
import type { ConversationStatusCounts } from '@/types'

interface Props {
  statusCounts: ConversationStatusCounts
}

export function ConversationsTopBarSlot({ statusCounts }: Props) {
  const { connected: lineConnected, label: lineLabel } = usePrimaryConnectedLine()

  useRegisterTopBarSubtitle(
    <>
      {`${statusCounts.open} abertas · ${statusCounts.pending} pendentes`}
      {lineConnected && (
        <span className="ml-3">
          <ConnectedLineChip>Linha {lineLabel} · conectada</ConnectedLineChip>
        </span>
      )}
    </>,
    [statusCounts.open, statusCounts.pending, lineConnected, lineLabel],
  )


  return null
}
