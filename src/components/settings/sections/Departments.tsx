import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, Check, Layers, Smartphone, ShieldCheck, ChevronDown, ExternalLink } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { ConfirmModal } from '@/components/ui/Modal'
import { ToastContainer } from '@/components/ui/Toast'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { cn, formatWaSelectLabel } from '@/lib/utils'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'
import { departmentsApi, whatsappNumbersApi } from '@/services/api'
import type { Department, DepartmentPermission, WhatsAppNumber } from '@/types'

// ── Permission definitions ───────────────────────────────────────────────────

const PERMISSION_GROUPS: {
  group: string
  perms: { key: DepartmentPermission; label: string }[]
}[] = [
  {
    group: 'Atendimento',
    perms: [
      { key: 'read_conversations',    label: 'Ler conversas' },
      { key: 'reply_conversations',   label: 'Responder conversas' },
      { key: 'archive_conversations', label: 'Arquivar conversas' },
      { key: 'assign_conversations',  label: 'Atribuir conversas' },
    ],
  },
  {
    group: 'Relatórios',
    perms: [
      { key: 'view_dashboard', label: 'Visualizar dashboard' },
      { key: 'view_reports',   label: 'Ver relatórios detalhados' },
    ],
  },
  {
    group: 'Administração',
    perms: [
      { key: 'manage_agents',      label: 'Gerenciar atendentes' },
      { key: 'create_departments', label: 'Criar setores' },
      { key: 'edit_company',       label: 'Editar dados da empresa' },
      { key: 'manage_bots',        label: 'Gerenciar bots' },
      { key: 'access_settings',    label: 'Acessar configurações' },
    ],
  },
]

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key))

const CONVERSATION_PERMISSIONS: DepartmentPermission[] = [
  'read_conversations', 'reply_conversations', 'archive_conversations', 'assign_conversations',
]

function hasConversationModule(perms: DepartmentPermission[]): boolean {
  return CONVERSATION_PERMISSIONS.some((k) => perms.includes(k))
}

interface DeptFormState {
  name: string
  description: string
  color: string
  whatsappNumberId: string
  permissions: DepartmentPermission[]
}

const DEFAULT_FORM: DeptFormState = {
  name: '', description: '', color: DEFAULT_ENTITY_COLOR, whatsappNumberId: '', permissions: [],
}

function PermissionMatrix({ value, onChange }: { value: DepartmentPermission[]; onChange: (p: DepartmentPermission[]) => void }) {
  const toggle = (key: DepartmentPermission) => {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key])
  }
  const toggleAll = () => {
    onChange(value.length === ALL_PERMISSIONS.length ? [] : [...ALL_PERMISSIONS])
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={value.length === ALL_PERMISSIONS.length} onChange={toggleAll}
          className="w-4 h-4 rounded border-surface-600 bg-surface-800 accent-brand-500 cursor-pointer" />
        <span className="text-xs font-semibold text-surface-300">Selecionar todas</span>
      </label>

      {PERMISSION_GROUPS.map((group) => {
        const groupKeys = group.perms.map((p) => p.key)
        const allChecked = groupKeys.every((k) => value.includes(k))
        const someChecked = groupKeys.some((k) => value.includes(k))
        const toggleGroup = () => {
          onChange(allChecked ? value.filter((k) => !groupKeys.includes(k)) : [...new Set([...value, ...groupKeys])])
        }
        return (
          <div key={group.group}>
            <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
              <input type="checkbox" checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                onChange={toggleGroup}
                className="w-4 h-4 rounded border-surface-600 bg-surface-800 accent-brand-500 cursor-pointer" />
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wide">{group.group}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 pl-6">
              {group.perms.map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 cursor-pointer select-none group">
                  <input type="checkbox" checked={value.includes(perm.key)} onChange={() => toggle(perm.key)}
                    className="w-3.5 h-3.5 rounded border-surface-600 bg-surface-800 accent-brand-500 cursor-pointer" />
                  <span className="text-xs text-surface-400 group-hover:text-surface-200 transition-colors">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DeptForm({ title, initial, saving, waNumbers, onSave, onCancel }: {
  title: string; initial: DeptFormState; saving: boolean; waNumbers: WhatsAppNumber[]
  onSave: (data: DeptFormState) => void; onCancel: () => void
}) {
  const [form, setForm] = useState<DeptFormState>(initial)
  const [nameError, setNameError] = useState('')
  const [permOpen, setPermOpen] = useState(true)

  const set = <K extends keyof DeptFormState>(key: K, val: DeptFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const needsWhatsapp = hasConversationModule(form.permissions)
  const mustPickNumber = needsWhatsapp && waNumbers.length > 0
  const blockedByNoNumbers = needsWhatsapp && waNumbers.length === 0

  const handlePermissionsChange = (p: DepartmentPermission[]) => {
    setForm((f) => ({ ...f, permissions: p, whatsappNumberId: hasConversationModule(p) ? f.whatsappNumberId : '' }))
  }

  const handleSave = () => {
    if (!form.name.trim() || form.name.trim().length < 2) { setNameError('Mínimo 2 caracteres'); return }
    if (blockedByNoNumbers) return
    if (mustPickNumber && !form.whatsappNumberId.trim()) return
    onSave({ ...form, whatsappNumberId: needsWhatsapp ? form.whatsappNumberId : '' })
  }

  return (
    <div className="bg-surface-900 border border-brand-600/40 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest">{title}</p>
        <button onClick={onCancel} className="text-surface-500 hover:text-surface-300 transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
          <div>
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wide block mb-1.5">Nome <span className="text-danger">*</span></label>
            <input autoFocus value={form.name} onChange={(e) => { set('name', e.target.value); setNameError('') }}
              placeholder="Ex: Suporte, Marketing"
              className={cn('w-full bg-surface-800 border rounded-lg px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500', nameError ? 'border-danger' : 'border-surface-700')} />
            {nameError && <p className="text-xs text-danger mt-1">{nameError}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wide block mb-1.5">Cor</label>
            <div className="w-9 h-9 rounded-xl border-2 border-surface-700 cursor-pointer" style={{ backgroundColor: form.color }} />
          </div>
        </div>

        <ColorPicker value={form.color} onChange={(c) => set('color', c)} />

        <div>
          <label className="text-xs font-medium text-surface-400 uppercase tracking-wide block mb-1.5">Descrição <span className="text-surface-600">(opcional)</span></label>
          <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Breve descrição do setor"
            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
        </div>

        {/* Permissions */}
        <div className="bg-surface-800/40 border border-surface-700 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setPermOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-surface-200">Permissões</span>
              <span className="text-xs text-surface-500">{form.permissions.length}/{ALL_PERMISSIONS.length} selecionadas</span>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-surface-400 transition-transform', permOpen && 'rotate-180')} />
          </button>
          {permOpen && (
            <div className="px-4 pb-4 border-t border-surface-700 pt-3">
              <p className="text-[11px] text-surface-500 mb-3">
                Marque <span className="text-surface-400">Atendimento</span> (conversas) para vincular um número WhatsApp.
              </p>
              <PermissionMatrix value={form.permissions} onChange={handlePermissionsChange} />
            </div>
          )}
        </div>

        {/* WhatsApp — only with conversation permissions */}
        {needsWhatsapp && (
          <div>
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wide block mb-1.5">
              <Smartphone className="w-3 h-3 inline mr-1" />Número WhatsApp vinculado
            </label>
            {waNumbers.length === 0 ? (
              <Banner variant="warning">
                <p>Para atender conversas, conecte pelo menos um número WhatsApp.</p>
                <Link to="/settings/numbers" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-white underline underline-offset-2 hover:text-white/80">
                  <ExternalLink className="w-3.5 h-3.5" />Conectar primeiro número
                </Link>
              </Banner>
            ) : (
              <div className="relative">
                <select value={form.whatsappNumberId} onChange={(e) => set('whatsappNumberId', e.target.value)}
                  className={cn('w-full appearance-none bg-surface-800 border rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 pr-8',
                    mustPickNumber && !form.whatsappNumberId.trim() ? 'border-status-pending' : 'border-surface-700')}>
                  <option value="">Selecione um número…</option>
                  {waNumbers.map((n) => <option key={n.id} value={n.id}>{formatWaSelectLabel(n)}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
              </div>
            )}
            <p className="text-xs text-surface-600 mt-1">Atendentes deste setor só acessam conversas deste número.</p>
            {mustPickNumber && !form.whatsappNumberId.trim() && (
              <p className="text-xs text-status-pending mt-1">Escolha um número para salvar.</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1 flex-wrap">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          {blockedByNoNumbers ? (
            <Link to="/settings/numbers" className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-semibold rounded-xl transition-colors">
              <ExternalLink className="w-4 h-4" />Conectar número para salvar
            </Link>
          ) : (
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!form.name.trim() || (mustPickNumber && !form.whatsappNumberId.trim())}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Salvar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function DeptCard({ dept, waNumbers, onEdit, onDelete }: {
  dept: Department; waNumbers: WhatsAppNumber[]; onEdit: (d: Department) => void; onDelete: (d: Department) => void
}) {
  const linkedNumber = dept.whatsappNumberId ? waNumbers.find((n) => n.id === dept.whatsappNumberId) : null
  const deptNeedsWa = hasConversationModule(dept.permissions ?? [])

  return (
    // Gramática nova: linha de lista sem card — assenta direto no fundo,
    // separada por hairline (divide-y no container), hover sutil.
    <div className="group hover:bg-surface-900/60 transition-colors">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in srgb, ${dept.color || 'var(--color-accent-violet)'} 13%, transparent)`, border: `2px solid color-mix(in srgb, ${dept.color || 'var(--color-accent-violet)'} 33%, transparent)` }}>
            <Layers className="w-4 h-4" style={{ color: dept.color || 'var(--color-accent-violet)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-surface-100">{dept.name}</p>
            {dept.description && <p className="text-xs text-surface-500 truncate">{dept.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {deptNeedsWa ? (
            linkedNumber ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-surface-400">
                <Smartphone className="w-3 h-3 text-status-active" /><span>{formatWaSelectLabel(linkedNumber)}</span>
              </div>
            ) : (
              <Link to="/settings/numbers" className="hidden sm:inline-flex text-xs text-status-pending hover:text-status-pending/80 underline-offset-2 hover:underline">
                Conectar número
              </Link>
            )
          ) : (
            <span className="hidden sm:block text-xs text-surface-600">Sem WhatsApp</span>
          )}

          <div className="flex items-center gap-1 text-xs text-surface-500">
            <ShieldCheck className="w-3 h-3" /><span>{dept.permissions?.length ?? 0}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(dept)} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors" title="Editar">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(dept)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger hover:bg-danger/10 transition-colors" title="Excluir">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {(dept.permissions?.length ?? 0) > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {dept.permissions.slice(0, 5).map((perm) => {
            const label = PERMISSION_GROUPS.flatMap((g) => g.perms).find((p) => p.key === perm)?.label ?? perm
            return <span key={perm} className="inline-flex px-1.5 py-0.5 bg-surface-800 border border-surface-700 text-surface-400 text-[10px] rounded-md">{label}</span>
          })}
          {dept.permissions.length > 5 && <span className="inline-flex px-1.5 py-0.5 text-surface-600 text-[10px]">+{dept.permissions.length - 5} mais</span>}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Departments() {
  const { toast, toasts, dismiss } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [waNumbers, setWaNumbers] = useState<WhatsAppNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editTarget, setEditTarget] = useState<Department | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setFetchError(false)
    Promise.all([
      departmentsApi.list().then((r) => setDepartments(r.data)),
      whatsappNumbersApi.list().then((r) => setWaNumbers(r.data)),
    ]).catch(() => setFetchError(true)).finally(() => setLoading(false))
  }, [reloadKey])

  const handleCreate = async (data: DeptFormState) => {
    setSaving(true)
    try {
      const r = await departmentsApi.create({ name: data.name, description: data.description || undefined, color: data.color, whatsappNumberId: data.whatsappNumberId || null, permissions: data.permissions })
      setDepartments((d) => [...d, r.data])
      setCreating(false)
      toast('Setor criado com sucesso!', 'success')
    } catch { toast('Erro ao criar setor.', 'error') } finally { setSaving(false) }
  }

  const handleSaveEdit = async (data: DeptFormState) => {
    if (!editTarget) return
    setSaving(true)
    try {
      const r = await departmentsApi.update(editTarget.id, { name: data.name, description: data.description || undefined, color: data.color, whatsappNumberId: data.whatsappNumberId || null, permissions: data.permissions })
      setDepartments((d) => d.map((x) => (x.id === editTarget.id ? r.data : x)))
      setEditTarget(null)
      toast('Setor atualizado.', 'success')
    } catch { toast('Erro ao atualizar.', 'error') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await departmentsApi.remove(deleteTarget.id)
      setDepartments((d) => d.filter((x) => x.id !== deleteTarget.id))
      toast('Setor excluído.', 'success')
    } catch { toast('Erro ao excluir.', 'error') } finally { setDeleteTarget(null) }
  }

  const editInitial = editTarget
    ? { name: editTarget.name, description: editTarget.description ?? '', color: editTarget.color, whatsappNumberId: editTarget.whatsappNumberId ?? '', permissions: editTarget.permissions ?? [] }
    : DEFAULT_FORM

  if (loading) {
    return (
      <div>
        <SectionHeader
          title="Setores"
          description="Defina permissões por setor. Número WhatsApp só é necessário quando há acesso ao módulo de conversas."
        />
        <SkeletonList items={4} />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div>
        <SectionHeader
          title="Setores"
          description="Defina permissões por setor. Número WhatsApp só é necessário quando há acesso ao módulo de conversas."
        />
        <ErrorState compact onRetry={() => { setLoading(true); setReloadKey((k) => k + 1) }} />
      </div>
    )
  }

  return (
    <div>
      <SectionHeader
        title="Setores"
        description="Defina permissões por setor. Número WhatsApp só é necessário quando há acesso ao módulo de conversas."
        action={
          !creating && !editTarget && (
            <Button onClick={() => setCreating(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Novo setor
            </Button>
          )
        }
      />

      {creating && <DeptForm key="dept-form-new" title="Novo setor" initial={DEFAULT_FORM} saving={saving} waNumbers={waNumbers} onSave={handleCreate} onCancel={() => setCreating(false)} />}
      {editTarget && <DeptForm key={`dept-form-${editTarget.id}`} title="Editar setor" initial={editInitial} saving={saving} waNumbers={waNumbers} onSave={handleSaveEdit} onCancel={() => setEditTarget(null)} />}

      <div className="divide-y divide-surface-800/60">
        {departments.map((dept) => <DeptCard key={dept.id} dept={dept} waNumbers={waNumbers} onEdit={setEditTarget} onDelete={setDeleteTarget} />)}
      </div>

      {departments.length === 0 && !creating && (
        <EmptyState
          icon={Layers}
          title="Nenhum setor criado"
          hint="Crie setores por equipe ou função. Vincule um WhatsApp quando o setor puder acessar conversas."
          action={{ label: 'Criar primeiro setor', onClick: () => setCreating(true) }}
        />
      )}

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir setor" description={`Tem certeza que deseja excluir o setor "${deleteTarget?.name}"? Os usuários vinculados não serão afetados.`} confirmLabel="Excluir" danger />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
