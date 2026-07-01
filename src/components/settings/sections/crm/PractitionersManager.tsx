import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { PractitionerModal } from '@/components/settings/modals/PractitionerModal'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { practitionersApi } from '@/services/api'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import type { Practitioner } from '@/types'

export function PractitionersManager() {
  const { practitioners, refetchPractitioners } = useCRMConfig()
  const { toast, toasts, dismiss } = useToast()
  const { user: actor } = useAuth()
  // Espelha @Roles(ADMIN, BUSINESS_ADMIN) na escrita de /practitioners. GET é aberto (a lista
  // aparece p/ todos), mas criar/editar/excluir/ativar fica só p/ admin.
  const canManage = isAdminTier(actor?.role)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPractitioner, setEditPractitioner] = useState<Practitioner | null>(null)
  const [deletePractitioner, setDeletePractitioner] = useState<Practitioner | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Override otimista de `active` por profissional enquanto o PATCH está em voo.
  const [pendingActive, setPendingActive] = useState<Record<string, boolean>>({})

  // Quando a lista recarregada já reflete o valor otimista, descarta o override.
  useEffect(() => {
    setPendingActive((prev) => {
      const next = { ...prev }
      let changed = false
      for (const p of practitioners) {
        if (p.id in next && next[p.id] === p.active) {
          delete next[p.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [practitioners])

  const handleSave = async (data: Partial<Practitioner>) => {
    // Em erro, relança a mensagem do backend para o modal exibi-la inline e permanecer aberto.
    try {
      if (editPractitioner) {
        await practitionersApi.update(editPractitioner.id, data)
        toast('Profissional atualizado com sucesso.', 'success')
      } else {
        await practitionersApi.create(data)
        toast('Profissional criado com sucesso.', 'success')
      }
      setModalOpen(false)
      setEditPractitioner(null)
      refetchPractitioners()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      throw new Error(
        typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar profissional.',
      )
    }
  }

  const handleDelete = async () => {
    if (!deletePractitioner) return
    setDeleting(true)
    try {
      await practitionersApi.remove(deletePractitioner.id)
      toast('Profissional excluído.', 'success')
      refetchPractitioners()
      setDeletePractitioner(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(typeof msg === 'string' ? msg : 'Erro ao excluir profissional.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (p: Practitioner) => {
    if (p.id in pendingActive) return // já há um toggle deste profissional em voo
    const next = !p.active
    setPendingActive((prev) => ({ ...prev, [p.id]: next }))
    try {
      await practitionersApi.update(p.id, { active: next })
      refetchPractitioners() // o efeito acima limpa o override quando a lista refletir
    } catch {
      setPendingActive((prev) => {
        const copy = { ...prev }
        delete copy[p.id]
        return copy
      })
      toast('Erro ao alterar status.', 'error')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-surface-100">Profissionais</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Cadastre os profissionais da equipe. É a fonte única que a IA usa pra saber quem citar.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditPractitioner(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Novo profissional
          </button>
        )}
      </div>

      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {practitioners.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-10">Nenhum profissional cadastrado.</p>
        ) : (
          <ul className="divide-y divide-surface-800">
            {practitioners.map((p) => {
              const isActive = pendingActive[p.id] ?? p.active
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-800/30 transition-colors group"
                >
                  <Users className="w-4 h-4 text-surface-700 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-100 truncate">{p.name}</span>
                      {p.category && (
                        <span className="text-[10px] text-surface-400 bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          {p.category}
                        </span>
                      )}
                      {!isActive && (
                        <span className="text-[10px] text-surface-500 border border-surface-700 px-1.5 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>

                  <Switch
                    checked={isActive}
                    onChange={() => handleToggleActive(p)}
                    disabled={!canManage}
                  />

                  {canManage && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditPractitioner(p)
                          setModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletePractitioner(p)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <PractitionerModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditPractitioner(null)
        }}
        onSave={handleSave}
        editPractitioner={editPractitioner}
      />

      <ConfirmModal
        open={!!deletePractitioner}
        onClose={() => setDeletePractitioner(null)}
        onConfirm={handleDelete}
        title="Excluir profissional"
        description={`Tem certeza que deseja excluir "${deletePractitioner?.name}"? Ele sairá do registro.`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
