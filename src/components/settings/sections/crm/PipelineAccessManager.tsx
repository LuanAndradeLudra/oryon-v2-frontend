import { useState, useEffect, useCallback } from 'react'
import { Info } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { pipelinesApi, departmentsApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { getApiErrorMessage, cn } from '@/lib/utils'
import type { Pipeline, Department } from '@/types'

interface PipelineAccessManagerProps {
  pipeline: Pipeline
  /** Refaz o fetch da lista de funis — a coluna `access[]` de `GET /settings/pipelines`
   *  reflete a mudança sem precisar de um segundo `GET .../access`. */
  onChanged: () => void
}

/** Setores com acesso ao funil (UI sobre a API da B0/SCRUM-940). `PUT` SUBSTITUI
 *  o conjunto — nunca faz merge — então a tela sempre manda tudo o que está
 *  marcado, nunca só o que mudou. */
export function PipelineAccessManager({ pipeline, onChanged }: PipelineAccessManagerProps) {
  const { toast, toasts, dismiss } = useToast()
  const { user: actor } = useAuth()
  const canManage = isAdminTier(actor?.role)

  const [departments, setDepartments] = useState<Department[]>([])
  const [implicitAll, setImplicitAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [depsRes, accessRes] = await Promise.all([
        departmentsApi.list(),
        pipelinesApi.getAccess(pipeline.id),
      ])
      setDepartments(depsRes.data)
      setImplicitAll(accessRes.data.implicitAll)
      setSelected(new Set(accessRes.data.departmentIds))
      setDirty(false)
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao carregar acesso do funil.'), 'error')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline.id])

  useEffect(() => { load() }, [load])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await pipelinesApi.updateAccess(pipeline.id, [...selected])
      toast('Acesso do funil atualizado.', 'success')
      setDirty(false)
      onChanged()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao atualizar acesso do funil.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-surface-500 text-center py-10">Carregando…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {implicitAll && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-xl px-3 py-2.5 text-xs text-surface-300">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-warning" />
          <p>
            Este é o funil padrão do tenant — <strong>todo setor enxerga</strong> além do que está marcado abaixo.
            Desmarcar um setor aqui não revoga o acesso dele a este funil.
          </p>
        </div>
      )}

      {departments.length === 0 ? (
        <p className="text-sm text-surface-500 text-center py-6">Nenhum setor cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {departments.map((d) => (
            <li key={d.id}>
              <label className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg', canManage && 'cursor-pointer hover:bg-surface-800/60')}>
                <input
                  type="checkbox"
                  checked={selected.has(d.id)}
                  onChange={() => toggle(d.id)}
                  disabled={!canManage}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/40"
                />
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-sm text-surface-200">{d.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="self-start px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-50 transition-all"
        >
          {saving ? 'Salvando...' : 'Salvar acesso'}
        </button>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
