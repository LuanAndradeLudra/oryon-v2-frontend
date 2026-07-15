import { useState, useEffect, useCallback } from 'react'
import { KanbanSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dealsApi, pipelinesApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { hexToRgba } from '@/lib/utils'

interface DealChip { pipeline: string; pipelineId: string; stage: string; color: string }

/**
 * Indicador de pipeline/estágio do negócio ABERTO do contato, no cabeçalho da
 * conversa. Atualiza ao vivo via socket `deal:changed` (refetch on-event — o
 * payload enriquecido com pipeline/estágio é a SCRUM-314/F4). Não renderiza
 * nada se o contato não tem negócio aberto. Clique leva ao board.
 */
export function ConversationDealIndicator({ contactId }: { contactId: string }) {
  const [chip, setChip] = useState<DealChip | null>(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    Promise.all([dealsApi.list(contactId), pipelinesApi.list()])
      .then(([dealsRes, pipesRes]) => {
        const deals = Array.isArray(dealsRes.data) ? dealsRes.data : []
        const open = deals.find((d) => d.status === 'open')
        const pipes = pipesRes.data ?? []
        if (!open) { setChip(null); return }
        const pipe = pipes.find((p) => p.id === open.pipelineId)
        const stage = pipe?.stages.find((s) => s.id === open.stageId)
        if (!pipe || !stage) { setChip(null); return }
        setChip({ pipeline: pipe.name, pipelineId: pipe.id, stage: stage.label, color: stage.color })
      })
      .catch(() => setChip(null))
  }, [contactId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const socket = connectSocket()
    const onDealChanged = (p: { contactId?: string }) => {
      if (p?.contactId === contactId) load()
    }
    socket.on('deal:changed', onDealChanged)
    return () => { socket.off('deal:changed', onDealChanged) }
  }, [contactId, load])

  if (!chip) return null

  return (
    <button
      type="button"
      onClick={() => navigate(`/contacts?pipeline=${chip.pipelineId}`)}
      title={`${chip.pipeline} · ${chip.stage} — abrir no board`}
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium max-w-full"
      style={{ backgroundColor: hexToRgba(chip.color, 0.15), color: chip.color }}
    >
      <KanbanSquare className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="truncate">{chip.pipeline} · {chip.stage}</span>
    </button>
  )
}
