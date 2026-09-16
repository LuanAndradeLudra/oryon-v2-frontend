// ─── Conversas — conteúdo da TopBar (spec 1d CONV-HDR-04/05/06/07/08) ────────
// A TopBar (48px) é do Shell; o que a página de Conversas põe nela é:
//   • subtítulo "N abertas · N pendentes" (CONV-HDR-04) — contagens reais que
//     `useConversations` já devolve (`statusCounts`, calculadas no backend);
//   • chip da linha "Linha X · conectada" (CONV-HDR-05/06) — linha primária
//     (ou a única) do `WorkspaceNumberContext`; some se não houver linha ou se
//     ela não estiver conectada — nunca mostra "conectada" sem evidência;
//   • botão "Nova conversa" (CONV-HDR-08) — mesma ação do FAB mobile
//     (abre /contacts para escolher o destinatário).
// Fica em `layout/` (arquivo do orquestrador) e a página só o monta, pra não
// competir com a leva 1d nos arquivos de `conversations/`.
//
// Vocabulário: o mock diz "aguardando"; o app chama o status `pending` de
// "Pendentes" nas abas da lista — o header usa a MESMA palavra das abas pra
// não parecer que são duas contagens diferentes (decisão registrada no GAPS).
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useRegisterTopBarActions, useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { ConversationStatusCounts } from '@/types'

interface Props {
  statusCounts: ConversationStatusCounts
}

const isConnected = (status: string | undefined) =>
  status === 'connected' || status === 'CONNECTED'

export function ConversationsTopBarSlot({ statusCounts }: Props) {
  const navigate = useNavigate()
  const { numbers } = useWorkspaceNumber()
  const line = numbers.find((n) => n.isPrimary) ?? (numbers.length === 1 ? numbers[0] : null)
  const lineLabel = line ? (line.label?.trim() || line.displayPhoneNumber) : null
  const lineConnected = !!line && isConnected(line.status)

  useRegisterTopBarSubtitle(
    <>
      {`${statusCounts.open} abertas · ${statusCounts.pending} pendentes`}
      {lineConnected && (
        // CONV-HDR-05/06: 11.5px/600 na cor --ok, sem fundo/borda; ponto 6px
        // #22C55E fixo nos dois temas.
        <span className="inline-flex items-center gap-1.5 ml-3 text-[11.5px] font-semibold text-success">
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          Linha {lineLabel} · conectada
        </span>
      )}
    </>,
    [statusCounts.open, statusCounts.pending, lineConnected, lineLabel],
  )

  useRegisterTopBarActions(
    // CONV-HDR-08: Button neutral sm (h28, raio 7, borda --bd2, 12px/600), "+" 14px stroke 2.2.
    <Button variant="neutral" size="sm" onClick={() => navigate('/contacts')}>
      <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
      Nova conversa
    </Button>,
    [navigate],
  )

  return null
}
