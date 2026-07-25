import { useState, useEffect } from 'react'
import { UserPlus, MoreHorizontal, CheckCircle2, XCircle, Clock, Pencil, Users } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { appLogger } from '@/services/appLogger'
import { isAdminTier } from '@/lib/roleHelpers'
import { SectionHeader } from '../SectionHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { FormDialog } from '@/components/ui/FormDialog'
import { ConfirmModal } from '@/components/ui/Modal'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { CreateUserDrawer } from '../drawers/CreateUserDrawer'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { User, UserRole, Department } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:    'Oryon',
  business_admin: 'Dono',
  admin:          'Admin',
  supervisor:     'Supervisor',
  agent:          'Agente',
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin:    'var(--color-brand-500)',
  business_admin: 'var(--color-status-active)',
  admin:          'var(--color-brand-500)',
  supervisor:     'var(--color-status-pending)',
  agent:          'var(--color-status-muted)',
}

function StatusBadge({ user }: { user: User }) {
  if (user.status === 'pending') {
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-status-pending" />
        <span className="text-xs text-status-pending font-medium">Pendente ativação</span>
      </div>
    )
  }
  if (user.isActive) {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-online" />
        <span className="text-xs text-online font-medium">Ativo</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <XCircle className="w-3.5 h-3.5 text-surface-500" />
      <span className="text-xs text-surface-500 font-medium">Inativo</span>
    </div>
  )
}

function EditAgentModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (updated: User) => void }) {
  const [cargo, setCargo] = useState(user.cargo ?? '')
  const [departmentIds, setDepartmentIds] = useState<string[]>(
    user.departmentIds ?? (user.departmentId ? [user.departmentId] : [])
  )
  const [departments, setDepartments] = useState<Department[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

  useEffect(() => {
    axios.get<{ data: Department[] } | Department[]>(`${API}/departments`).then((r) => setDepartments(Array.isArray(r.data) ? r.data : r.data.data)).catch(() => {})
  }, [API])

  const toggleDept = (id: string) => {
    setDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // NestJS UpdateUserDto only accepts: firstName, lastName, role, isActive, departmentId
      const payload = {
        departmentId: departmentIds[0] ?? null,
      }
      await axios.patch(`${API}/users/${user.id}`, payload)
      const selectedDepts = departments.filter((d) => departmentIds.includes(d.id))
      onSaved({ ...user, cargo: cargo.trim(), departmentId: departmentIds[0], departmentName: selectedDepts[0]?.name, departmentIds, departmentNames: selectedDepts.map((d) => d.name) })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message?.[0] ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Editar usuário"
      onSubmit={handleSave}
      loading={saving}
      error={error}
    >
      <div className="flex items-center gap-3 py-3 border-b border-surface-800">
        <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
        <div>
          <p className="text-sm font-medium text-surface-100">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-surface-400">{user.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">Cargo</label>
        <input
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          placeholder="Ex: Atendente Sênior"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">Setores</label>
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
          {departments.map((d) => {
            const checked = departmentIds.includes(d.id)
            return (
              <label
                key={d.id}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none',
                  checked ? 'border-brand-500/60 bg-brand-900/20' : 'border-surface-700 hover:border-surface-600',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDept(d.id)}
                  className="accent-brand-500"
                />
                <span className="text-sm text-surface-200">{d.name}</span>
              </label>
            )
          })}
          {departments.length === 0 && (
            <p className="text-xs text-surface-500 px-1">Nenhum setor cadastrado.</p>
          )}
        </div>
      </div>
    </FormDialog>
  )
}

export function AgentManagement() {
  const { toast, toasts, dismiss } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    setFetchError(false)
    axios.get<User[]>(`${API}/users`).then((r) => {
      setUsers(Array.isArray(r.data) ? r.data : [])
      setLoading(false)
    }).catch(() => {
      setFetchError(true)
      setLoading(false)
    })
  }, [reloadKey])

  const { user: actor } = useAuth()
  // Backend's POST /users is gated to ADMIN, BUSINESS_ADMIN, SUPER_ADMIN
  // via @Roles in users.controller.ts. Mirror that here so the UI doesn't
  // expose an affordance that always 403s. `isAdminTier` matches the
  // backend allowlist exactly — keeping both in sync via the helper means
  // any future role addition only needs to be wired in one place.
  const canCreateUsers = isAdminTier(actor?.role)

  const handleCreated = (newUser: User) => {
    setUsers((u) => [...u, newUser])
    setDrawerOpen(false)
    toast(`Usuário criado. Um e-mail foi enviado para ${newUser.email}.`, 'success')
    appLogger.logUserManagement({
      tenant_id: actor?.tenantId ?? null,
      actor_id: actor?.id ?? null,
      actor_name: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
      target_user_id: newUser.id,
      target_user_name: `${newUser.firstName} ${newUser.lastName}`.trim(),
      action: 'user_created',
      details: { email: newUser.email, role: newUser.role },
    })
    appLogger.logActivity({
      tenant_id: actor?.tenantId ?? null, actor_id: actor?.id ?? null,
      actor_name: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
      action: 'user_created', entity_type: 'user',
      entity_id: newUser.id,
      entity_name: `${newUser.firstName} ${newUser.lastName}`.trim(),
      description: `Usuário "${newUser.firstName} ${newUser.lastName}" criado com papel ${newUser.role}`,
      details: { email: newUser.email, role: newUser.role },
      source: 'ui',
    })
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const targetUser = users.find((u) => u.id === userId)
    const oldRole = targetUser?.role
    await axios.patch(`${API}/users/${userId}`, { role })
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, role } : x)))
    toast('Papel atualizado.', 'success')
    appLogger.logUserManagement({
      tenant_id: actor?.tenantId ?? null,
      actor_id: actor?.id ?? null,
      actor_name: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
      target_user_id: userId,
      target_user_name: targetUser ? `${targetUser.firstName} ${targetUser.lastName}`.trim() : undefined,
      action: 'role_changed',
      details: { old_role: oldRole, new_role: role },
    })
    appLogger.logActivity({
      tenant_id: actor?.tenantId ?? null, actor_id: actor?.id ?? null,
      actor_name: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
      action: 'user_role_changed', entity_type: 'user',
      entity_id: userId,
      entity_name: targetUser ? `${targetUser.firstName} ${targetUser.lastName}`.trim() : null,
      description: `Papel de "${targetUser?.firstName ?? userId}" alterado de ${oldRole} para ${role}`,
      details: { old_role: oldRole, new_role: role },
      source: 'ui',
    })
  }

  const handleAgentSaved = (updated: User) => {
    setUsers((u) => u.map((x) => (x.id === updated.id ? updated : x)))
    toast('Usuário atualizado com sucesso.', 'success')
    appLogger.logUserManagement({
      tenant_id: actor?.tenantId ?? null,
      actor_id: actor?.id ?? null,
      actor_name: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
      target_user_id: updated.id,
      target_user_name: `${updated.firstName} ${updated.lastName}`.trim(),
      action: 'user_updated',
      details: { cargo: updated.cargo, department_ids: updated.departmentIds },
    })
  }

  const handleToggleActive = async () => {
    if (!deactivateTarget) return
    const nextActive = !deactivateTarget.isActive
    await axios.patch(`${API}/users/${deactivateTarget.id}`, { isActive: nextActive })
    setUsers((u) => u.map((x) => (x.id === deactivateTarget.id ? { ...x, isActive: nextActive, status: nextActive ? 'active' : 'inactive' } : x)))
    toast(`Usuário ${nextActive ? 'ativado' : 'desativado'} com sucesso.`, 'success')
    appLogger.logUserManagement({
      tenant_id: actor?.tenantId ?? null,
      actor_id: actor?.id ?? null,
      actor_name: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
      target_user_id: deactivateTarget.id,
      target_user_name: `${deactivateTarget.firstName} ${deactivateTarget.lastName}`.trim(),
      action: nextActive ? 'user_activated' : 'user_deactivated',
      details: { is_active: nextActive },
    })
    appLogger.logActivity({
      tenant_id: actor?.tenantId ?? null, actor_id: actor?.id ?? null,
      actor_name: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
      action: nextActive ? 'user_activated' : 'user_deactivated', entity_type: 'user',
      entity_id: deactivateTarget.id,
      entity_name: `${deactivateTarget.firstName} ${deactivateTarget.lastName}`.trim(),
      description: `Usuário "${deactivateTarget.firstName}" ${nextActive ? 'ativado' : 'desativado'}`,
      details: { is_active: nextActive },
      source: 'ui',
    })
    setDeactivateTarget(null)
  }

  return (
    <div>
      <SectionHeader
        title="Usuários"
        description={`${users.length} membro${users.length !== 1 ? 's' : ''} na equipe`}
        action={
          canCreateUsers ? (
            <Button onClick={() => setDrawerOpen(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
              Criar usuário
            </Button>
          ) : null
        }
      />

      {/* Gramática nova: tabela densa é o conteúdo principal — largura total,
          assentada direto no fundo, sem chrome de card. Header hairline +
          divisores hairline fazem o trabalho que a borda do card fazia. */}
      <div className="overflow-x-auto">
        {loading ? (
          <SkeletonTable rows={5} cols={4} className="py-3" />
        ) : fetchError ? (
          <ErrorState
            compact
            onRetry={() => { setLoading(true); setReloadKey((k) => k + 1) }}
          />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum usuário na equipe"
            hint="Crie o primeiro usuário para começar a atender."
            action={canCreateUsers ? { label: 'Criar usuário', onClick: () => setDrawerOpen(true) } : undefined}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Usuário</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider hidden lg:table-cell">Cargo / Setor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Papel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-900/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" online={user.isActive && user.status !== 'pending'} />
                      <div>
                        <p className="text-sm font-medium text-surface-100">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-surface-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <p className="text-sm text-surface-300">{user.cargo ?? '—'}</p>
                    {(() => {
                      const names = user.departmentNames?.length
                        ? user.departmentNames.join(', ')
                        : user.departmentName ?? null
                      return names ? <p className="text-xs text-surface-500">{names}</p> : null
                    })()}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn('color-chip inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border')} style={{ ['--chip']: ROLE_COLORS[user.role] } as React.CSSProperties}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge user={user} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Dropdown
                      open={openDropdown === user.id}
                      onClose={() => setOpenDropdown(null)}
                      align="right"
                      anchor={
                        <button
                          onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      }
                    >
                      <DropdownItem
                        onClick={() => { setEditTarget(user); setOpenDropdown(null) }}
                      >
                        <span className="flex items-center gap-2">
                          <Pencil className="w-3.5 h-3.5" />
                          Editar cargo e setor
                        </span>
                      </DropdownItem>
                      {(['agent', 'supervisor', 'admin', 'business_admin'] as UserRole[]).map((role) => (
                        <DropdownItem
                          key={role}
                          onClick={() => { handleRoleChange(user.id, role); setOpenDropdown(null) }}
                          active={user.role === role}
                        >
                          Tornar {ROLE_LABELS[role]}
                        </DropdownItem>
                      ))}
                      {user.status === 'pending' && (
                        <DropdownItem
                          onClick={() => {
                            axios.post(`${API}/users/${user.id}/resend-invitation`).then(() => {
                              toast('Convite reenviado com sucesso!', 'success')
                            }).catch(() => {
                              toast('Erro ao reenviar convite.', 'error')
                            })
                            setOpenDropdown(null)
                          }}
                        >
                          Reenviar convite
                        </DropdownItem>
                      )}
                      <DropdownItem
                        onClick={() => { setDeactivateTarget(user); setOpenDropdown(null) }}
                        danger={user.isActive}
                      >
                        {user.isActive ? 'Desativar usuário' : 'Reativar usuário'}
                      </DropdownItem>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Defense in depth — even if some future caller flips drawerOpen
          true (or React DevTools edits state in prod), a non-admin actor
          never sees the create flow. The button itself is also hidden
          above; this is the second wall. */}
      {canCreateUsers && (
        <CreateUserDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {editTarget && (
        <EditAgentModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleAgentSaved}
        />
      )}

      <ConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleToggleActive}
        title={deactivateTarget?.isActive ? 'Desativar usuário' : 'Reativar usuário'}
        description={`Tem certeza que deseja ${deactivateTarget?.isActive ? 'desativar' : 'reativar'} ${deactivateTarget?.firstName}? ${deactivateTarget?.isActive ? 'Ele perderá acesso à plataforma.' : 'Ele voltará a ter acesso normalmente.'}`}
        confirmLabel={deactivateTarget?.isActive ? 'Desativar' : 'Reativar'}
        danger={deactivateTarget?.isActive}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
