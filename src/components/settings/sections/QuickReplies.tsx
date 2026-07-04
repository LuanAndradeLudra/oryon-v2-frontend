import { useCallback, useState, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2, Copy, Zap } from 'lucide-react'
import axios from 'axios'
import { SectionHeader } from '../SectionHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { ConfirmModal } from '@/components/ui/Modal'
import { QuickReplyModal } from '../modals/QuickReplyModal'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { formatRelativeTime } from '@/lib/utils'
import type { CannedResponse } from '@/types'

// ── Row (extracted so it can own its own useContextMenu hook) ────────────────

function QuickReplyRow({
  response,
  onEdit,
  onDelete,
}: {
  response: CannedResponse
  onEdit: (r: CannedResponse) => void
  onDelete: (r: CannedResponse) => void
}) {
  const buildContextMenu = useCallback((): ContextMenuEntry[] => [
    { label: 'Editar', icon: Pencil, onClick: () => onEdit(response) },
    {
      label: 'Copiar atalho',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(`/${response.shortcut}`).catch(() => {}),
    },
    {
      label: 'Copiar conteúdo',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(response.body).catch(() => {}),
    },
    { separator: true },
    { label: 'Excluir', icon: Trash2, danger: true, onClick: () => onDelete(response) },
  ], [response, onEdit, onDelete])
  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <tr onContextMenu={onContextMenu} className="hover:bg-surface-800/50 transition-colors">
      <td className="px-5 py-4">
        <code className="shortcut-tag inline-block max-w-[180px] truncate align-bottom text-xs font-mono text-brand-300 bg-brand-900/20 px-2 py-1 rounded-lg" title={response.shortcut}>
          {response.shortcut}
        </code>
      </td>
      <td className="px-5 py-4">
        <p className="text-sm font-medium text-surface-100">{response.title}</p>
      </td>
      <td className="px-5 py-4 max-w-xs">
        <p className="text-xs text-surface-400 truncate">{response.body}</p>
      </td>
      <td className="px-5 py-4">
        <div>
          <p className="text-xs text-surface-300">{response.createdByName}</p>
          <p className="text-xs text-surface-500">{formatRelativeTime(response.createdAt)}</p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onEdit(response)}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(response)}
            className="p-1.5 rounded-lg text-surface-400 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function errorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const msg = e.response?.data?.message
    if (Array.isArray(msg)) return msg.join(', ')
    if (typeof msg === 'string') return msg
    if (e.response?.status === 403) return 'Você não tem permissão para esta ação.'
  }
  return fallback
}

export function QuickReplies() {
  const { toast, toasts, dismiss } = useToast()
  const [responses, setResponses] = useState<CannedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CannedResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CannedResponse | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setFetchError(false)
    axios.get<{ data: CannedResponse[] } | CannedResponse[]>(`${API}/canned-responses`).then((r) => {
      const list = Array.isArray(r.data) ? r.data : r.data.data
      setResponses(list)
      setLoading(false)
    }).catch(() => {
      setFetchError(true)
      setLoading(false)
    })
  }, [reloadKey])

  const filtered = responses.filter(
    (r) =>
      r.shortcut.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.body.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (data: { shortcut: string; title: string; body: string }) => {
    try {
      if (editTarget) {
        const r = await axios.patch<CannedResponse>(`${API}/canned-responses/${editTarget.id}`, data)
        setResponses((prev) => prev.map((x) => x.id === editTarget.id ? r.data : x))
        toast('Resposta atualizada.', 'success')
      } else {
        const r = await axios.post<CannedResponse>(`${API}/canned-responses`, data)
        setResponses((prev) => [...prev, r.data])
        toast('Resposta criada!', 'success')
      }
      setEditTarget(null)
    } catch (e) {
      toast(errorMessage(e, 'Não foi possível salvar a resposta.'), 'error')
      throw e
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await axios.delete(`${API}/canned-responses/${deleteTarget.id}`)
      setResponses((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      toast('Resposta excluída.', 'success')
      setDeleteTarget(null)
    } catch (e) {
      toast(errorMessage(e, 'Não foi possível excluir a resposta.'), 'error')
    }
  }

  return (
    <div className="max-w-3xl">
      <SectionHeader
        title="Respostas Rápidas"
        description="Crie atalhos de texto para agilizar o atendimento."
        action={
          <Button onClick={() => { setEditTarget(null); setModalOpen(true) }} leftIcon={<Plus className="w-4 h-4" />}>
            Nova resposta
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por atalho, título ou conteúdo..."
          className="pl-9"
        />
      </div>

      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-x-auto">
        {loading ? (
          <SkeletonTable rows={5} cols={4} className="p-3" />
        ) : fetchError ? (
          <ErrorState
            compact
            className="border-0 rounded-none"
            onRetry={() => { setLoading(true); setReloadKey((k) => k + 1) }}
          />
        ) : filtered.length === 0 ? (
          search ? (
            <div className="p-10 text-center text-sm text-surface-400">
              Nenhuma resposta encontrada.
            </div>
          ) : (
            <EmptyState
              icon={Zap}
              title="Nenhuma resposta rápida criada ainda"
              hint="Crie atalhos de texto para responder mais rápido no atendimento."
              className="border-0 rounded-none"
              action={{ label: 'Nova resposta', onClick: () => { setEditTarget(null); setModalOpen(true) } }}
            />
          )
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Atalho</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Título</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Preview</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Criado por</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {filtered.map((cr) => (
                <QuickReplyRow
                  key={cr.id}
                  response={cr}
                  onEdit={(r) => { setEditTarget(r); setModalOpen(true) }}
                  onDelete={(r) => setDeleteTarget(r)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <QuickReplyModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        editing={editTarget}
        onSave={handleSave}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir resposta rápida"
        description={`Tem certeza que deseja excluir o atalho "${deleteTarget?.shortcut}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
