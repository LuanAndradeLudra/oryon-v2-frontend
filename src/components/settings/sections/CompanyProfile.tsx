import { useState, useEffect } from 'react'
import { Lock, Building2 } from 'lucide-react'
import axios from 'axios'
import { AnimatePresence } from 'framer-motion'
import { ToastContainer } from '@/components/ui/Toast'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ComingSoonBadge } from '@/components/ui/ComingSoonBadge'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { TipCard } from '@/components/ui/TipCard'
import type { Tenant } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'América/São Paulo (GMT-3)' },
  { value: 'America/Manaus',    label: 'América/Manaus (GMT-4)' },
  { value: 'America/Belem',     label: 'América/Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'América/Fortaleza (GMT-3)' },
  { value: 'America/Noronha',   label: 'América/Noronha (GMT-2)' },
]

const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
]

export function CompanyProfile() {
  const { toast, toasts, dismiss } = useToast()
  const { user } = useAuth()
  const { checklist, markDone } = useSetupChecklist(user?.id)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    timezone: '',
    language: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setError(false)
    axios.get(`${API}/settings/company`).then((r) => {
      const d = r.data as Record<string, unknown>
      const mapped = { ...d, name: d.businessName ?? d.name ?? '', email: d.businessEmail ?? d.email ?? '', timezone: d.timezone ?? 'America/Sao_Paulo', language: d.language ?? 'pt-BR' } as Tenant
      setTenant(mapped)
      setForm({
        name: String(mapped.name ?? ''),
        email: String(mapped.email ?? ''),
        timezone: String(mapped.timezone ?? ''),
        language: String(mapped.language ?? ''),
      })
    }).catch(() => {
      setError(true)
    })
  }, [reloadKey])

  const save = async () => {
    setLoading(true)
    try {
      // Map frontend field names to NestJS DTO field names
      await axios.patch(`${API}/settings/company`, {
        businessName: form.name,
        businessEmail: form.email,
      })
      toast('Perfil da empresa salvo com sucesso.', 'success')
      markDone('company')
    } catch {
      toast('Erro ao salvar. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const planBadge: Record<string, string> = {
    free: 'bg-surface-700 text-surface-300',
    starter: 'bg-brand-900/40 text-brand-300',
    pro: 'bg-status-active-bg text-status-active',
    enterprise: 'bg-status-pending-bg text-status-pending',
  }

  if (error) {
    return (
      <div>
        <SectionHeader
          title="Perfil da Empresa"
          description="Informações da sua organização na plataforma Oryon."
        />
        <ErrorState compact onRetry={() => { setTenant(null); setReloadKey((k) => k + 1) }} />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div>
        <SectionHeader
          title="Perfil da Empresa"
          description="Informações da sua organização na plataforma Oryon."
        />
        <div className="flex flex-col gap-6">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader
        title="Perfil da Empresa"
        description="Informações da sua organização na plataforma Oryon."
      />

      <AnimatePresence>
        {!checklist.company && (
          <TipCard
            icon={<Building2 className="w-4 h-4 text-brand-400" />}
            title="Preencha o perfil da sua empresa"
            description="Nome, e-mail e fuso horário são usados em relatórios, templates e comunicações automáticas."
            className="mb-6"
          >
            <button
              onClick={() => markDone('company')}
              className="mt-2 text-xs text-surface-500 hover:text-surface-300 transition-colors"
            >
              Já entendi, ocultar
            </button>
          </TipCard>
        )}
      </AnimatePresence>

      <SettingsSection
        title="Identidade"
        description="O nome da empresa aparece em relatórios, templates e nas comunicações com clientes."
      >
        {/* Logo + plan */}
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-xl font-bold text-surface-950 select-none">
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-surface-50">{tenant.name}</p>
            <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${planBadge[tenant.plan]}`}>
              {tenant.plan}
            </span>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-surface-500">
              Upload de logo <ComingSoonBadge />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField label="Nome da Empresa" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome da empresa"
            />
          </FormField>

          <FormField label="Slug" hint="Identificador único da sua conta — não pode ser alterado.">
            <div className="relative">
              <Input
                value={tenant.slug}
                readOnly
                className="pr-20 opacity-60 cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-surface-500">
                <Lock className="w-3 h-3" />
                Read-only
              </span>
            </div>
          </FormField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Preferências regionais"
        description="E-mail de contato, fuso horário e idioma usados em agendamentos e mensagens automáticas."
      >
        <div className="grid grid-cols-1 gap-4">
          <FormField label="E-mail de contato" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="contato@empresa.com"
            />
          </FormField>

          <FormField label="Fuso horário" comingSoon hint="Ainda não é possível personalizar por conta.">
            <Select value={form.timezone} disabled>
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Idioma" comingSoon hint="Ainda não é possível personalizar por conta.">
            <Select value={form.language} disabled>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={save} loading={loading}>Salvar alterações</Button>
        </div>
      </SettingsSection>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
