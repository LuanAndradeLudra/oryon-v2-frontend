import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, GripVertical, ChevronRight, Flag, Layers, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/settings/SectionHeader'
import { StageModal } from '@/components/settings/modals/StageModal'
import { useToast } from '@/hooks/useToast'
import { useDragReorder } from '@/hooks/useDragReorder'
import { stagesApi, contactsApi } from '@/services/api'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { TenantStage } from '@/types'

/**
 * Situação do contato reestruturada (SCRUM-1253, PO 07/10). Primeiro o
 * CICLO DE VIDA desenhado — a ordem é o caminho, quantas pessoas estão em cada
 * passo e onde o ciclo termina —; embaixo a lista para editar, com o "encerra
 * o ciclo" como interruptor na própria linha (antes só dentro do modal).
 * Sem detalhes técnicos (ordem numérica, chave interna).
 */
export function SituacoesPainel() {
  const { stages, refetchStages, setStagesOptimistic } = useCRMConfig()
  const { toast } = useToast()
  const { user } = useAuth()
  const podeGerir = isAdminTier(user?.role)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<TenantStage | null>(null)
  const [excluir, setExcluir] = useState<TenantStage | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  // Duplo clique em "Excluir" (antes do re-render com `loading`) mandava dois DELETEs.
  const excluindoRef = useRef(false)
  const [contagem, setContagem] = useState<Record<string, number>>({})

  // Quantas pessoas em cada situação (uma consulta leve por situação).
  const chaves = stages.map((s) => s.key).join(',')
  useEffect(() => {
    let vivo = true
    Promise.all(stages.map((s) => contactsApi.list({ stage: [s.key] }, 1, 1)
      .then((r) => [s.key, r.data.total] as const)
      .catch(() => [s.key, -1] as const)))
      .then((pares) => { if (vivo) setContagem(Object.fromEntries(pares)) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaves])

  const salvar = async (data: { label: string; color: string; isTerminal: boolean }) => {
    try {
      if (editando) await stagesApi.update(editando.id, data)
      else await stagesApi.create(data)
      toast(editando ? 'Situação atualizada.' : 'Situação criada.', 'success')
      setModalAberto(false)
      setEditando(null)
      refetchStages()
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erro ao salvar a situação.'), 'error')
      throw err
    }
  }
  const alternarFim = async (s: TenantStage) => {
    try {
      await stagesApi.update(s.id, { label: s.label, color: s.color, isTerminal: !s.isTerminal })
      refetchStages()
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erro ao salvar a situação.'), 'error')
    }
  }
  const remover = async () => {
    if (!excluir || excluindoRef.current) return
    excluindoRef.current = true
    setExcluindo(true)
    try {
      await stagesApi.delete(excluir.id)
      toast('Situação excluída.', 'success')
      refetchStages()
      setExcluir(null)
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erro ao excluir a situação.'), 'error')
    } finally {
      excluindoRef.current = false
      setExcluindo(false)
    }
  }

  const { overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(stages, async (nova) => {
    const ordenada = nova.map((s, i) => ({ ...s, order: i + 1 }))
    setStagesOptimistic(ordenada)
    try {
      await stagesApi.reorder(ordenada.map((s) => s.id))
    } catch {
      toast('Erro ao reordenar. Recarregando…', 'error')
      refetchStages()
    }
  })

  const abrirNova = () => { setEditando(null); setModalAberto(true) }
  const qtd = (k: string) => (contagem[k] === undefined ? '…' : contagem[k] < 0 ? '—' : contagem[k].toLocaleString('pt-BR'))
  const caminho = stages.filter((s) => !s.isTerminal)
  const fins = stages.filter((s) => s.isTerminal)

  return (
    <>
      <SectionHeader
        title="Situação do contato"
        description="Em que ponto do ciclo de vida cada pessoa está. É da pessoa, não do negócio — a etapa de um negócio fica em Funis."
        action={podeGerir ? <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={abrirNova}>Nova situação</Button> : undefined}
      />

      {stages.length === 0 ? (
        <EmptyState icon={Layers} title="Nenhuma situação configurada" hint="Crie situações como Lead, Cliente e Inativo." />
      ) : (
        <>
          {/* O ciclo desenhado */}
          <section aria-label="Ciclo de vida" className="mb-6 rounded-[10px] border border-surface-700 bg-surface-800 p-4">
            <p className="mb-3 text-xs font-semibold text-surface-300">Ciclo de vida</p>
            <ol className="flex flex-wrap items-stretch gap-2">
              {caminho.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0 text-surface-500" aria-hidden />}
                  <Link to={`/contacts?etapa=${encodeURIComponent(s.key)}`} className="flex min-w-[112px] flex-col rounded-[10px] border border-surface-700 bg-[var(--sf2)] px-3 py-2 hover:border-[var(--bd2)]" title={`Ver contatos em ${s.label}`}>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-surface-100">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />{s.label}
                    </span>
                    <span className="mt-0.5 text-xl font-semibold tabular-nums leading-tight text-surface-50">{qtd(s.key)}</span>
                    <span className="text-2xs text-surface-500">contatos</span>
                  </Link>
                </li>
              ))}
              {fins.length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="mx-1 h-full w-px self-stretch bg-surface-700" aria-hidden />
                  {fins.map((s) => (
                    <Link key={s.id} to={`/contacts?etapa=${encodeURIComponent(s.key)}`} className="flex min-w-[112px] flex-col rounded-[10px] border border-dashed border-[var(--bd2)] px-3 py-2 hover:border-surface-400" title={`Ver contatos em ${s.label}`}>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-surface-100">
                        <Flag className="h-3 w-3 text-surface-400" aria-hidden />{s.label}
                      </span>
                      <span className="mt-0.5 text-xl font-semibold tabular-nums leading-tight text-surface-50">{qtd(s.key)}</span>
                      <span className="text-2xs text-surface-500">fim do ciclo</span>
                    </Link>
                  ))}
                </li>
              )}
            </ol>
          </section>

          {/* Editar */}
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold text-surface-300">Situações</p>
            {podeGerir && <p className="text-xs text-surface-500">Arraste para mudar a ordem do ciclo.</p>}
          </div>
          <ul className="divide-y divide-surface-700 overflow-hidden rounded-[10px] border border-surface-700 bg-surface-800">
            {stages.map((s, i) => (
              <li
                key={s.id}
                draggable={podeGerir}
                onDragStart={podeGerir ? () => handleDragStart(i) : undefined}
                onDragOver={podeGerir ? (e) => handleDragOver(e, i) : undefined}
                onDrop={podeGerir ? () => handleDrop(i) : undefined}
                onDragEnd={podeGerir ? handleDragEnd : undefined}
                className={cn('group flex items-center gap-3 px-3 py-2.5', overIdx === i ? 'bg-brand-500/10' : 'hover:bg-[var(--rowhover)]')}
              >
                <GripVertical className={cn('h-4 w-4 flex-shrink-0', podeGerir ? 'cursor-grab text-surface-500' : 'text-surface-700')} aria-hidden />
                <span className="w-5 text-right text-xs tabular-nums text-surface-500">{i + 1}</span>
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-surface-100">{s.label}</span>
                <Link to={`/contacts?etapa=${encodeURIComponent(s.key)}`} className="hidden items-center gap-1 text-xs text-surface-400 hover:text-surface-100 sm:inline-flex">
                  {qtd(s.key)} contatos <ArrowUpRight className="h-3 w-3" aria-hidden />
                </Link>
                <label className="flex items-center gap-2 text-xs text-surface-400" title="Quem chega aqui sai do ciclo (ex.: Cliente, Perdido)">
                  Encerra o ciclo
                  <Switch checked={s.isTerminal} onChange={() => void alternarFim(s)} disabled={!podeGerir} />
                </label>
                {podeGerir && (
                  <span className="flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button type="button" onClick={() => { setEditando(s); setModalAberto(true) }} aria-label={`Editar ${s.label}`} title="Renomear e cor" className="rounded-[6px] p-1.5 text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setExcluir(s)} aria-label={`Excluir ${s.label}`} title="Excluir" className="rounded-[6px] p-1.5 text-surface-400 hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <StageModal open={modalAberto} onClose={() => setModalAberto(false)} onSave={salvar} editStage={editando} />
      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={remover}
        title="Excluir situação"
        impact={{ label: `${excluir?.label ?? ''}${excluir && contagem[excluir.key] > 0 ? ` — ${contagem[excluir.key]} contatos nela` : ''}`, tone: 'danger' }}
        description="Só dá para excluir uma situação sem contatos: mova-os para outra antes. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        loading={excluindo}
      />
    </>
  )
}
