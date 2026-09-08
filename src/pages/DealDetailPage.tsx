// B2 (SCRUM-928) — /deals/:id como PÁGINA (deep link compartilhável). O
// mesmo `DealDetailPanel` que abre como painel em /contacts e /conversations
// (via `DealPanelContext`) — aqui sem `onClose`/`onExpand` (já é a página).
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DealDetailPanel } from '@/components/deals/DealDetailPanel'

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) return <Navigate to="/home" replace />

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-800 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-surface-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>
      </div>
      <div className="flex-1 min-h-0 flex justify-center">
        <div className="w-full max-w-3xl flex flex-col min-h-0">
          <DealDetailPanel dealId={id} />
        </div>
      </div>
    </div>
  )
}
