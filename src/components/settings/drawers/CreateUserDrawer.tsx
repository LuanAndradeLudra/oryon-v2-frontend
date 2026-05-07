import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ChevronRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import axios from 'axios'
import { appLogger } from '@/services/appLogger'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import type { User, UserRole, UserModule, UserPermissions, Department } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const ALL_MODULES: UserModule[] = ['dashboard', 'conversations', 'crm', 'chat-interno']

const MODULE_LABELS: Record<UserModule, string> = {
  dashboard:       'Dashboard',
  conversations:   'Conversas',
  crm:             'CRM',
  'chat-interno':  'Chat Interno',
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:    'Equipe Oryon',
  business_admin: 'Business Admin',
  admin:      'Administrador',
  supervisor: 'Supervisor',
  agent:      'Usuário',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin:    'Equipe interna Oryon',
  business_admin: 'Super administrador do negócio',
  admin:      'Acesso total à plataforma',
  supervisor: 'Gerencia equipe e atendimentos',
  agent:      'Atende conversas atribuídas',
}

const EMPTY_PERMISSIONS: UserPermissions = {
  tags:          { criar: false, atualizar: false, excluir: false },
  conversations: { arquivar: false, bloquearContato: false },
  templates:     { criar: false, atualizar: false, excluir: false },
  campanhas:     { criar: false, iniciar: false, excluir: false },
}

const FULL_PERMISSIONS: UserPermissions = {
  tags:          { criar: true, atualizar: true, excluir: true },
  conversations: { arquivar: true, bloquearContato: true },
  templates:     { criar: true, atualizar: true, excluir: true },
  campanhas:     { criar: true, iniciar: true, excluir: true },
}

const PERM_RESOURCES: { key: keyof UserPermissions; label: string; actions: { key: string; label: string }[] }[] = [
  { key: 'tags',          label: 'Tags',      actions: [{ key: 'criar', label: 'Criar' }, { key: 'atualizar', label: 'Atualizar' }, { key: 'excluir', label: 'Excluir' }] },
  { key: 'conversations', label: 'Conversas', actions: [{ key: 'arquivar', label: 'Arquivar' }, { key: 'bloquearContato', label: 'Bloquear Contato' }] },
  { key: 'templates',     label: 'Templates', actions: [{ key: 'criar', label: 'Criar' }, { key: 'atualizar', label: 'Atualizar' }, { key: 'excluir', label: 'Excluir' }] },
  { key: 'campanhas',     label: 'Disparos em Massa', actions: [{ key: 'criar', label: 'Criar' }, { key: 'iniciar', label: 'Iniciar' }, { key: 'excluir', label: 'Excluir' }] },
]

interface Step1Data {
  firstName: string
  lastName: string
  email: string
  cargo: string
  departmentIds: string[]
}

interface Step2Data {
  role: UserRole
  modules: UserModule[]
  permissions: UserPermissions
}

interface CreateUserDrawerProps {
  open: boolean
  onClose: () => void
  onCreated: (user: User) => void
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  const steps = ['Dados', 'Permissões', 'Revisão']
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const n = i + 1
        const active = n === current
        const done = n < current
        return (
          <div key={n} className="flex items-center gap-2">
            {i > 0 && <div className={cn('w-8 h-px', done ? 'bg-brand-500/60' : 'bg-surface-700')} />}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors',
                active ? 'bg-brand-600 text-surface-950' : done ? 'bg-brand-900/40 text-brand-400' : 'bg-surface-800 text-surface-600',
              )}>
                {done ? <Check className="w-2.5 h-2.5" /> : n}
              </div>
              <span className={cn('text-xs font-medium', active ? 'text-surface-100' : 'text-surface-500')}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CreateUserDrawer({ open, onClose, onCreated }: CreateUserDrawerProps) {
  const [step, setStep] = useState(1)
  const [departments, setDepartments] = useState<Department[]>([])

  const [s1, setS1] = useState<Step1Data>({ firstName: '', lastName: '', email: '', cargo: '', departmentIds: [] })
  const [errors, setErrors] = useState<Partial<Record<keyof Step1Data, string>>>({})
  const [emailChecking, setEmailChecking] = useState(false)

  const [s2, setS2] = useState<Step2Data>({
    role: 'agent',
    modules: ['dashboard', 'conversations'],
    permissions: EMPTY_PERMISSIONS,
  })

  const [submitting, setSubmitting] = useState(false)

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Load departments
  useEffect(() => {
    if (open) {
      axios.get<{ data: Department[] } | Department[]>(`${API}/departments`).then((r) => setDepartments(Array.isArray(r.data) ? r.data : r.data.data)).catch(() => {})
    }
  }, [open])

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1)
      setS1({ firstName: '', lastName: '', email: '', cargo: '', departmentIds: [] })
      setErrors({})
      setEmailChecking(false)
      setS2({ role: 'agent', modules: ['dashboard', 'conversations'], permissions: EMPTY_PERMISSIONS })
      setSubmitting(false)
    }
  }, [open])

  // Auto-select all when Admin role chosen
  useEffect(() => {
    if (s2.role === 'admin') {
      setS2((p) => ({ ...p, modules: [...ALL_MODULES], permissions: FULL_PERMISSIONS }))
    }
  }, [s2.role])

  const checkEmailDuplicate = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return
    setEmailChecking(true)
    try {
      const r = await axios.get<User[] | { data?: User[] }>(`${API}/users?email=${encodeURIComponent(normalizedEmail)}`)
      const users = Array.isArray(r.data) ? r.data : (r.data?.data ?? [])
      const duplicated = users.some((u) => u.email?.trim().toLowerCase() === normalizedEmail)
      if (duplicated) {
        setErrors((e) => ({ ...e, email: 'Este email já está cadastrado.' }))
      } else {
        setErrors((e) => {
          const next = { ...e }
          if (next.email === 'Este email já está cadastrado.') delete next.email
          return next
        })
      }
    } catch {
      // ignore
    } finally {
      setEmailChecking(false)
    }
  }

  const validateS1 = () => {
    const e: typeof errors = {}
    if (!s1.firstName.trim() || s1.firstName.trim().length < 2) e.firstName = 'Mínimo 2 caracteres'
    if (!s1.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s1.email)) e.email = 'E-mail inválido'
    if (!s1.cargo.trim() || s1.cargo.trim().length < 2) e.cargo = 'Mínimo 2 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const step1Invalid =
    s1.firstName.trim().length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s1.email.trim()) ||
    s1.cargo.trim().length < 2 ||
    !!errors.email ||
    emailChecking

  const handleNext = () => {
    if (step === 1 && !validateS1()) return
    if (step === 1 && errors.email) return
    setStep((s) => s + 1)
  }

  const toggleModule = (mod: UserModule) => {
    if (s2.role === 'admin') return
    setS2((p) => ({
      ...p,
      modules: p.modules.includes(mod) ? p.modules.filter((m) => m !== mod) : [...p.modules, mod],
    }))
  }

  const togglePerm = (resource: keyof UserPermissions, action: string) => {
    if (s2.role === 'admin') return
    setS2((p) => ({
      ...p,
      permissions: {
        ...p.permissions,
        [resource]: {
          ...(p.permissions[resource] as Record<string, boolean>),
          [action]: !(p.permissions[resource] as Record<string, boolean>)[action],
        },
      },
    }))
  }

  const handleSubmit = async () => {
    const selectedDepts = departments.filter((d) => s1.departmentIds.includes(d.id))
    setSubmitting(true)
    try {
      // Send only fields the NestJS InviteUserDto accepts
      const r = await axios.post<User>(`${API}/users`, {
        firstName:    s1.firstName.trim(),
        lastName:     s1.lastName.trim(),
        email:        s1.email.trim(),
        role:         s2.role,
        departmentId: s1.departmentIds[0] ?? undefined,
      })
      appLogger.logWizardEvent({
        wizard_type: 'user_create',
        step_number: 3, step_name: 'Revisão & Criação',
        action: 'completed',
        data: { email: s1.email, role: s2.role, modules: s2.modules },
      })
      appLogger.logUserManagement({
        target_user_id: r.data.id,
        target_user_name: `${r.data.firstName} ${r.data.lastName}`.trim(),
        action: 'user_created',
        details: { email: r.data.email, role: r.data.role, modules: s2.modules },
      })
      onCreated(r.data)
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        appLogger.logWizardEvent({
          wizard_type: 'user_create',
          step_number: 3, step_name: 'Revisão & Criação',
          action: 'error', error_message: 'Email já cadastrado (409)',
          data: { email: s1.email },
        })
        setErrors({ email: 'Este email já está cadastrado.' })
        setStep(1)
        return
      }
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  // Review helpers
  const selectedDeptNames = departments.filter((d) => s1.departmentIds.includes(d.id)).map((d) => d.name)
  const deptName = selectedDeptNames.length ? selectedDeptNames.join(', ') : '—'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-surface-950 border-l border-surface-800 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-surface-100">Criar usuário</h2>
                <p className="text-xs text-surface-400 mt-0.5">Um convite por e-mail será enviado automaticamente</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-surface-500 hover:text-surface-200 hover:bg-surface-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-6 py-4 border-b border-surface-800 flex-shrink-0">
              <Stepper current={step} />
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* ── Step 1: User data ─────────────────────────────────────── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.15 }}
                    className="px-6 py-5 flex flex-col gap-4"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Dados do usuário</p>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Nome" required error={errors.firstName}>
                        <Input
                          value={s1.firstName}
                          onChange={(e) => setS1((p) => ({ ...p, firstName: e.target.value }))}
                          onBlur={() => {
                            if (!s1.firstName.trim() || s1.firstName.trim().length < 2) {
                              setErrors((e) => ({ ...e, firstName: 'Mínimo 2 caracteres' }))
                            } else {
                              setErrors((e) => { const n = { ...e }; delete n.firstName; return n })
                            }
                          }}
                          placeholder="João"
                          error={errors.firstName}
                        />
                      </FormField>
                      <FormField label="Sobrenome">
                        <Input
                          value={s1.lastName}
                          onChange={(e) => setS1((p) => ({ ...p, lastName: e.target.value }))}
                          placeholder="Silva"
                        />
                      </FormField>
                    </div>

                    <FormField label="E-mail" required error={errors.email}>
                      <div className="relative">
                        <Input
                          type="email"
                          value={s1.email}
                          onChange={(e) => {
                            setS1((p) => ({ ...p, email: e.target.value }))
                            setErrors((e2) => {
                              if (e2.email && e2.email !== 'Este email já está cadastrado.') {
                                const n = { ...e2 }; delete n.email; return n
                              }
                              return e2
                            })
                          }}
                          onBlur={() => checkEmailDuplicate(s1.email)}
                          placeholder="joao@empresa.com"
                          error={errors.email}
                        />
                        {emailChecking && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-3.5 h-3.5 text-surface-500 animate-spin" />
                          </div>
                        )}
                      </div>
                    </FormField>

                    <FormField label="Cargo" required error={errors.cargo}>
                      <Input
                        value={s1.cargo}
                        onChange={(e) => setS1((p) => ({ ...p, cargo: e.target.value }))}
                        onBlur={() => {
                          if (!s1.cargo.trim() || s1.cargo.trim().length < 2) {
                            setErrors((e) => ({ ...e, cargo: 'Mínimo 2 caracteres' }))
                          } else {
                            setErrors((e) => { const n = { ...e }; delete n.cargo; return n })
                          }
                        }}
                        placeholder="Agente de Suporte"
                        error={errors.cargo}
                      />
                    </FormField>

                    <FormField label="Setores">
                      <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                        {departments.map((d) => {
                          const checked = s1.departmentIds.includes(d.id)
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
                                onChange={() => setS1((p) => ({
                                  ...p,
                                  departmentIds: checked
                                    ? p.departmentIds.filter((x) => x !== d.id)
                                    : [...p.departmentIds, d.id],
                                }))}
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
                    </FormField>
                  </motion.div>
                )}

                {/* ── Step 2: Permissions ───────────────────────────────────── */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.15 }}
                    className="px-6 py-5 flex flex-col gap-5"
                  >
                    {/* Role */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-3">Papel (Role)</p>
                      <div className="flex flex-col gap-2">
                        {(['admin', 'supervisor', 'agent'] as UserRole[]).map((role) => (
                          <label
                            key={role}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                              s2.role === role ? 'border-brand-500/60 bg-brand-900/20' : 'border-surface-800 hover:border-surface-700',
                            )}
                          >
                            <input
                              type="radio"
                              name="role"
                              checked={s2.role === role}
                              onChange={() => setS2((p) => ({ ...p, role }))}
                              className="accent-brand-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-surface-100">{ROLE_LABELS[role]}</p>
                              <p className="text-xs text-surface-400">{ROLE_DESCRIPTIONS[role]}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Modules */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-3">Módulos acessíveis</p>
                      {s2.role === 'admin' && (
                        <p className="text-xs text-brand-400 mb-2">Administradores têm acesso a todos os módulos.</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_MODULES.map((mod) => {
                          const checked = s2.modules.includes(mod)
                          return (
                            <label
                              key={mod}
                              className={cn(
                                'flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors select-none',
                                s2.role === 'admin' ? 'cursor-not-allowed opacity-60' : '',
                                checked && s2.role !== 'admin' ? 'border-brand-500/60 bg-brand-900/10' : 'border-surface-800',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleModule(mod)}
                                disabled={s2.role === 'admin'}
                                className="accent-brand-500"
                              />
                              <span className="text-sm text-surface-200">{MODULE_LABELS[mod]}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* Resource permissions */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-3">Permissões por recurso</p>
                      {s2.role === 'admin' && (
                        <p className="text-xs text-brand-400 mb-2">Administradores têm todas as permissões.</p>
                      )}
                      <div className="flex flex-col gap-2">
                        {PERM_RESOURCES.map(({ key: resource, label, actions }) => (
                          <div key={resource} className="bg-surface-900 border border-surface-800 rounded-xl p-3">
                            <p className="text-xs font-semibold text-surface-400 mb-2">{label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {actions.map(({ key: action, label: actionLabel }) => {
                                const checked = (s2.permissions[resource] as Record<string, boolean>)[action]
                                return (
                                  <button
                                    key={action}
                                    type="button"
                                    onClick={() => togglePerm(resource, action)}
                                    disabled={s2.role === 'admin'}
                                    className={cn(
                                      'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors select-none',
                                      s2.role === 'admin' ? 'cursor-not-allowed' : 'cursor-pointer',
                                      checked
                                        ? 'border-brand-600/60 bg-brand-900/20 text-brand-300'
                                        : 'border-surface-700 text-surface-400 hover:border-surface-600',
                                    )}
                                  >
                                    {checked && <Check className="w-2.5 h-2.5" />}
                                    {actionLabel}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: Review ────────────────────────────────────────── */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.15 }}
                    className="px-6 py-5 flex flex-col gap-4"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Revisão</p>

                    {/* User data summary */}
                    <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
                      <p className="text-xs font-semibold text-surface-500 mb-3">Dados do usuário</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-surface-500">Nome</p>
                          <p className="text-sm text-surface-100 mt-0.5">{s1.firstName} {s1.lastName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-surface-500">E-mail</p>
                          <p className="text-sm text-surface-100 mt-0.5 break-all">{s1.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-surface-500">Cargo</p>
                          <p className="text-sm text-surface-100 mt-0.5">{s1.cargo}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-surface-500">Setor</p>
                          <p className="text-sm text-surface-100 mt-0.5">{deptName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Permissions summary */}
                    <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
                      <p className="text-xs font-semibold text-surface-500 mb-3">Acesso & Permissões</p>
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-surface-500">Papel</p>
                          <p className="text-sm text-surface-100 mt-0.5">{ROLE_LABELS[s2.role]}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-1.5">Módulos</p>
                          <div className="flex flex-wrap gap-1">
                            {s2.modules.length === 0
                              ? <span className="text-xs text-surface-500">Nenhum módulo selecionado</span>
                              : s2.modules.map((m) => (
                                <span key={m} className="text-[10px] font-medium text-brand-300 bg-brand-900/30 border border-brand-800/50 px-2 py-0.5 rounded-full">
                                  {MODULE_LABELS[m]}
                                </span>
                              ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-1.5">Permissões</p>
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const activePerms = PERM_RESOURCES.flatMap(({ key: resource, label, actions }) =>
                                actions
                                  .filter(({ key: action }) => (s2.permissions[resource] as Record<string, boolean>)[action])
                                  .map(({ key: action, label: actionLabel }) => ({ resource, action, label, actionLabel }))
                              )
                              if (activePerms.length === 0) {
                                return <span className="text-xs text-surface-500">Nenhuma permissão adicional</span>
                              }
                              return activePerms.map(({ resource, action, label, actionLabel }) => (
                                <span
                                  key={`${resource}-${action}`}
                                  className="text-[10px] font-medium text-surface-300 bg-surface-800 border border-surface-700 px-2 py-0.5 rounded-full"
                                >
                                  {label}: {actionLabel}
                                </span>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-surface-800 flex-shrink-0">
              <button
                onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
              >
                {step > 1 && <ArrowLeft className="w-3.5 h-3.5" />}
                {step === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {step < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={step === 1 && step1Invalid}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-950 text-sm font-semibold rounded-xl transition-colors"
                >
                  Próximo
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-surface-950 text-sm font-semibold rounded-xl transition-colors"
                >
                  {submitting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando...</>
                    : <><Check className="w-3.5 h-3.5" /> Criar Usuário</>
                  }
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
