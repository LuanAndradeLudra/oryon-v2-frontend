// ─── Conversas — conteúdo da TopBar (spec 1d CONV-HDR-04/05/06/07/08) ────────
// A TopBar (48px) é do Shell; o que a página de Conversas põe nela é:
//   • subtítulo "N abertas · N pendentes" (CONV-HDR-04) — contagens reais que
//     `useConversations` já devolve (`statusCounts`, calculadas no backend);
//   • chip da linha "Linha X · conectada" (CONV-HDR-05/06) — linha primária
//     (ou a única) do `WorkspaceNumberContext`; some se não houver linha ou se
//     ela não estiver conectada — nunca mostra "conectada" sem evidência;
//   • botão "Nova conversa" (CONV-HDR-08) — mesma ação do FAB mobile: a página
//     abre o NewConversationModal (escolher contato → template).
// Fica em `layout/` (arquivo do orquestrador) e a página só o monta, pra não
// competir com a leva 1d nos arquivos de `conversations/`.
//
// Vocabulário: o mock diz "aguardando"; o app chama o status `pending` de
// "Pendentes" nas abas da lista — o header usa a MESMA palavra das abas pra
// não parecer que são duas contagens diferentes (decisão registrada no GAPS).
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRegisterTopBarActions, useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { usePrimaryConnectedLine } from '@/hooks/usePrimaryConnectedLine'
import { ConnectedLineChip } from '@/components/layout/ConnectedLineChip'
import type { ConversationStatusCounts } from '@/types'

interface Props {
  statusCounts: ConversationStatusCounts
  /** Abre o modal "Nova conversa" (estado vive na página). */
  onNewConversation: () => void
}

export function ConversationsTopBarSlot({ statusCounts, onNewConversation }: Props) {
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

  useRegisterTopBarActions(
    // CONV-HDR-08: Button neutral sm (h28, raio 7, borda --bd2, 12px/600), "+" 14px stroke 2.2.
    // Ícone pelo prop `leftIcon` (como os demais botões): como filho solto ele
    // quebrava em linha própria acima do texto (PO, 24/09).
    <Button variant="neutral" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2} />} onClick={onNewConversation}>
      Nova conversa
    </Button>,
    [onNewConversation],
  )

  return null
}
