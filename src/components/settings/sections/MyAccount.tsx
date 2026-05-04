import { useState, useEffect } from 'react'
import { Eye, EyeOff, Camera, Bell, UserCircle } from 'lucide-react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionHeader } from '../SectionHeader'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Avatar } from '@/components/ui/Avatar'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import type { User } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Equipe Oryon',
  business_admin: 'Dono',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agent: 'Agente',
}

export function MyAccount() {
  const { toast, toasts, dismiss } = useToast()
  const { user: authUser } = useAuth()
  const { checklist, markDone } = useSetupChecklist(authUser?.id)
  const [user, setUser] = useState<User | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '' })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  // Phase 19: notification preferences moved to their own Settings page.

  useEffect(() => {
    axios.get<User>(`${API}/settings/account`).then((r) => {
      setUser(r.data)
      setForm({ firstName: r.data.firstName ?? '', lastName: r.data.lastName ?? '' })
    }).catch(() => {
      // Fallback: show empty form instead of infinite loading
      setUser({ firstName: '', lastName: '', email: '' } as User)
    })
  }, [])

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await axios.patch(`${API}/settings/account`, form)
      toast('Perfil atualizado com sucesso.', 'success')
      markDone('profile')
    } catch {
      toast('Erro ao salvar.', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async () => {
    if (pwForm.next !== pwForm.confirm) {
      toast('As senhas não coincidem.', 'error')
      return
    }
    if (pwForm.next.length < 8) {
      toast('A senha deve ter no mínimo 8 caracteres.', 'error')
      return
    }
    setSavingPw(true)
    try {
      await axios.patch(`${API}/settings/password`, { currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwForm({ current: '', next: '', confirm: '' })
      toast('Senha alterada com sucesso.', 'success')
    } catch {
      toast('Senha atual incorreta.', 'error')
    } finally {
      setSavingPw(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader title="Minha Conta" description="Gerencie suas informações pessoais e preferências." />

      <AnimatePresence>
        {!checklist.profile && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-4 bg-brand-950/50 border border-brand-500/20 rounded-2xl px-5 py-4 mb-6"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <UserCircle className="w-4 h-4 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-100">Complete seu perfil</p>
              <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">
                Seu nome e cargo aparecem nas conversas, relatórios e para os clientes no atendimento.
              </p>
              <button
                onClick={() => markDone('profile')}
                className="mt-2 text-xs text-surface-500 hover:text-surface-300 transition-colors"
              >
                Já entendi, ocultar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personal info */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Informações pessoais</h3>

        <div className="flex items-center gap-5 mb-6">
          <div className="relative group cursor-pointer">
            <Avatar name={`${user.firstName} ${user.lastName}`} size="lg" />
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-surface-100">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-surface-400">{user.email}</p>
            <span className="mt-1 inline-flex px-2 py-0.5 bg-brand-900/40 text-brand-300 rounded-full text-xs font-semibold">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormField label="Nome" required>
            <Input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="Nome"
            />
          </FormField>
          <FormField label="Sobrenome" required>
            <Input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="Sobrenome"
            />
          </FormField>
        </div>

        <FormField label="E-mail" hint="O e-mail não pode ser alterado.">
          <Input value={user.email} readOnly className="opacity-60 cursor-not-allowed" />
        </FormField>

        <div className="flex justify-end mt-4">
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-surface-950 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            {savingProfile && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Salvar
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Alterar senha</h3>

        <div className="flex flex-col gap-4">
          {(['current', 'next', 'confirm'] as const).map((field) => {
            const labels = { current: 'Senha atual', next: 'Nova senha', confirm: 'Confirmar nova senha' }
            const placeholders = { current: '••••••••', next: 'Mín. 8 caracteres', confirm: 'Repita a nova senha' }
            return (
              <FormField key={field} label={labels[field]}>
                <div className="relative">
                  <Input
                    type={showPw[field] ? 'text' : 'password'}
                    value={pwForm[field]}
                    onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholders[field]}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => ({ ...s, [field]: !s[field] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200"
                  >
                    {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormField>
            )
          })}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={savePassword}
            disabled={savingPw || !pwForm.current || !pwForm.next || !pwForm.confirm}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-surface-950 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            {savingPw && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Alterar senha
          </button>
        </div>
      </div>

      {/* Phase 19: notification preferences moved to their own Settings page
          (backed by a real backend). This card now just points there. */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-2">Notificações</h3>
        <p className="text-xs text-surface-400 mb-3">
          Escolha quais eventos geram notificação para você e ajuste o som em uma página dedicada.
        </p>
        <a
          href="/settings/notifications"
          className="inline-flex items-center gap-2 text-xs text-brand-300 hover:text-brand-200 transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          Abrir preferências de notificação →
        </a>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
