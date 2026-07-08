import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, KanbanSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ConfirmModal } from '@/components/ui/Modal'
import { DealModal } from '@/components/contacts/DealModal'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { dealsApi, pipelinesApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { formatBRL } from '@/utils/money'
import type { Deal, DealStatus, Pipeline } from '@/types'

/** Agrupa os negócios do contato por pipeline (contato pode ter deals em pipelines diferentes). */
function groupByPipeline(deals: Deal[]): Array<[string, Deal[]]> {
  const map = new Map<string, Deal[]>()
  for (const d of deals) {
    const key = d.pipelineId || '—'
    const arr = map.get(key) ?? []
    arr.push(d)
    map.set(key, arr)
  }
  return [...map.entries()]
}

const STATUS_META: Record<DealStatus, { label: string; cls: string }> = {
  open: { label: 'Aberto', cls: 'text-brand-300 border-brand-700 bg-brand-900/20' },
  won: { label: 'Ganho', cls: 'text-emerald-300 border-emerald-700 bg-emerald-900/20' },
  lost: { label: 'Perdido', cls: 'text-red-300 border-red-700 bg-red-900/20' },
}

export function DealsTab({ contactId }: { contactId: string }) {
  const { vocab } = useTenantVocab()
  const { toast, toasts, dismiss } = useToast()
  const navigate = useNavigate()
  const [deals, setDeals] = useState<Deal[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null)
  const [deleting, setDeleting] = useState(false)

  const refetch = useCallback(() => {
    setLoading(true)
    dealsApi
      .list(contactId)
      .then((r) => setDeals(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }, [contactId])

  useEffect(() => {
    refetch()
  }, [refetch])

  // Nome do pipeline p/ o cabeçalho de cada grupo. Carregado uma vez.
  useEffect(() => {
    pipelinesApi.list().then((r) => setPipelines(r.data ?? [])).catch(() => {})
  }, [])

  // Realtime: recarrega quando um negócio deste contato muda em qualquer lugar (socket `deal:changed`)
  // — ex.: excluído/editado noutra aba ou por outro operador. Antes a lista ficava stale e abrir um
  // negócio já excluído caía em "negócio não encontrado".
  useEffect(() => {
    const socket = connectSocket()
    const onDealChanged = (p: { contactId?: string }) => {
      if (p?.contactId === contactId) refetch()
    }
    socket.on('deal:changed', onDealChanged)
    return () => {
      socket.off('deal:changed', onDealChanged)
    }
  }, [contactId, refetch])

  const dealWord = vocab.deal.toLowerCase()

  const handleDelete = async () => {
    if (!deleteDeal) return
    setDeleting(true)
    try {
      await dealsApi.remove(deleteDeal.id)
      toast(`${vocab.deal} excluído.`, 'success')
      setDeleteDeal(null)
      refetch()
    } catch {
      toast('Erro ao excluir.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-surface-100">{vocab.deals}</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Produtos/serviços propostos ou vendidos a este contato.
          </p>
        </div>
        <button
          onClick={() => {
            setEditDeal(null)
            setModalOpen(true)
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> Novo {dealWord}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
        </div>
      ) : deals.length === 0 ? (
        <p className="text-sm text-surface-500 text-center py-10">Nenhum {dealWord} ainda.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groupByPipeline(deals).map(([pipelineId, groupDeals]) => {
            const pipeline = pipelines.find((p) => p.id === pipelineId)
            return (
              <div key={pipelineId} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 font-medium truncate">
                    {pipeline?.name ?? 'Sem pipeline'}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/deals')}
                    title="Abrir no board de negócios"
                    className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 transition-colors flex-shrink-0"
                  >
                    <KanbanSquare className="w-3.5 h-3.5" /> Ver no board
                  </button>
                </div>
                <ul className="flex flex-col gap-2">
                  {groupDeals.map((d) => {
                    const meta = STATUS_META[d.status]
                    const count = d.lineItems?.length ?? 0
                    return (
              <li
                key={d.id}
                className="bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 hover:bg-surface-800/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-100 truncate">{d.title}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-surface-500">
                      {formatBRL(d.amountCents)}
                      {count ? ` · ${count} ${count === 1 ? 'item' : 'itens'}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditDeal(d)
                        setModalOpen(true)
                      }}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteDeal(d)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      <DealModal
        open={modalOpen}
        contactId={contactId}
        editDeal={editDeal}
        onClose={() => {
          setModalOpen(false)
          setEditDeal(null)
        }}
        onSaved={() => {
          setModalOpen(false)
          setEditDeal(null)
          refetch()
        }}
      />

      <ConfirmModal
        open={!!deleteDeal}
        onClose={() => setDeleteDeal(null)}
        onConfirm={handleDelete}
        title={`Excluir ${dealWord}`}
        description={`Tem certeza que deseja excluir "${deleteDeal?.title}"?`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
