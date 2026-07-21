import { useState, useEffect } from 'react'
import { Eye, EyeOff, Camera, Bell, UserCircle } from 'lucide-react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
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
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Phase 19: notification preferences moved to their own Settings page.

  useEffect(() => {
    setError(false)
    axios.get<User>(`${API}/settings/account`).then((r) => {
      setUser(r.data)
      setForm({ firstName: r.data.firstName ?? '', lastName: r.data.lastName ?? '' })
    }).catch(() => {
      setError(true)
    })
  }, [reloadKey])

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

  if (error) {
    return (
      <div>
        <SectionHeader title="Minha Conta" description="Gerencie suas informações pessoais e preferências." />
        <ErrorState compact onRetry={() => { setUser(null); setReloadKey((k) => k + 1) }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div>
        <SectionHeader title="Minha Conta" description="Gerencie suas informações pessoais e preferências." />
        <div className="flex flex-col gap-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    )
  }

  return (
    <div>
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

      {/* Gramática nova: seções em duas colunas separadas por hairline —
          zero cards. O título à esquerda funciona como índice ao rolar. */}
      <SettingsSection
        title="Informações pessoais"
        description="Seu nome aparece nas conversas, relatórios e para os clientes."
      >
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
          <Button onClick={saveProfile} loading={savingProfile}>Salvar</Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Alterar senha"
        description="Use no mínimo 8 caracteres. Você continuará conectado nesta sessão."
      >
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
          <Button
            onClick={savePassword}
            loading={savingPw}
            disabled={!pwForm.current || !pwForm.next || !pwForm.confirm}
          >
            Alterar senha
          </Button>
        </div>
      </SettingsSection>

      {/* Phase 19: notification preferences moved to their own Settings page
          (backed by a real backend). This section now just points there. */}
      <SettingsSection
        title="Notificações"
        description="Eventos que geram alerta para você e som de notificação."
      >
        <a
          href="/settings/notifications"
          className="inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-200 transition-colors"
        >
          <Bell className="w-4 h-4" />
          Abrir preferências de notificação →
        </a>
      </SettingsSection>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
