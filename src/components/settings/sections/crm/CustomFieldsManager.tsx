import { useState } from 'react'
import { Plus, Pencil, Trash2, Star, ListPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/settings/SectionHeader'
import { CustomFieldModal } from '@/components/settings/modals/CustomFieldModal'
import { useToast } from '@/hooks/useToast'
import { customFieldsApi } from '@/services/api'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import type { ContactCustomFieldDef } from '@/types'

const TYPE_LABELS: Record<ContactCustomFieldDef['type'], string> = {
  text:        'Texto',
  textarea:    'Texto longo',
  number:      'Número',
  date:        'Data',
  boolean:     'Sim/Não',
  url:         'URL',
  email:       'E-mail',
  phone:       'Telefone',
  select:      'Seleção única',
  multiselect: 'Múltipla escolha',
}

export function CustomFieldsManager() {
  const { fieldDefs, refetchFieldDefs } = useCRMConfig()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editField, setEditField] = useState<ContactCustomFieldDef | null>(null)
  const [deleteField, setDeleteField] = useState<ContactCustomFieldDef | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async (data: Omit<ContactCustomFieldDef, 'order'>) => {
    try {
      if (editField) {
        await customFieldsApi.update(editField.key, data)
        toast('Campo atualizado com sucesso.', 'success')
      } else {
        await customFieldsApi.create(data)
        toast('Campo criado com sucesso.', 'success')
      }
      setModalOpen(false)
      setEditField(null)
      refetchFieldDefs()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar campo.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteField) return
    setDeleting(true)
    try {
      await customFieldsApi.delete(deleteField.key)
      toast('Campo excluído.', 'success')
      refetchFieldDefs()
      setDeleteField(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir campo.'
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(axiosMsg ?? msg, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const existingKeys = fieldDefs.map((f) => f.key)

  return (
    <>
      <SectionHeader
        title="Campos personalizados"
        description="Adicione campos extras aos contatos para capturar dados do seu negócio."
        action={
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => { setEditField(null); setModalOpen(true) }}
          >
            Novo campo
          </Button>
        }
      />

      <div className="border-y border-surface-700">
        {fieldDefs.length === 0 ? (
          <EmptyState
            icon={ListPlus}
            title="Nenhum campo personalizado configurado"
            hint="Adicione campos extras aos contatos para capturar dados do seu negócio."
            className="border-0 rounded-none py-10"
            action={{ label: 'Novo campo', onClick: () => { setEditField(null); setModalOpen(true) } }}
          />
        ) : (
          <ul className="divide-y divide-surface-700">
            {fieldDefs.map((field) => (
              <li key={field.key} className="flex items-center gap-3 px-1 py-3 hover:bg-[var(--rowhover)] transition-colors group">

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-100">{field.label}</span>
                    {field.required && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-status-pending bg-status-pending-bg border border-status-pending-border px-1.5 py-0.5 rounded-xs">
                        <Star className="w-2.5 h-2.5" /> Obrigatório
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-surface-600 font-mono">{field.key}</p>
                </div>

                <span className="text-xs text-surface-500 bg-[var(--sf2)] border border-surface-700 px-2 py-0.5 rounded-xs tabular-nums">
                  {TYPE_LABELS[field.type]}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditField(field); setModalOpen(true) }}
                    className="p-1.5 rounded-xs text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteField(field)}
                    className="p-1.5 rounded-xs text-surface-400 hover:text-danger hover:bg-danger/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CustomFieldModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editField={editField}
        existingKeys={existingKeys}
      />

      <ConfirmModal
        open={!!deleteField}
        onClose={() => setDeleteField(null)}
        onConfirm={handleDelete}
        title="Excluir campo"
        impact={{ label: `Campo ${deleteField?.label ?? ''}`.trim(), tone: 'danger' }}
        description="Os dados já salvos nos contatos serão perdidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />
    </>
  )
}
