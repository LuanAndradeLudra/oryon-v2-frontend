import { useState, useEffect } from 'react'
import { Camera, Lock, Building2 } from 'lucide-react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { ToastContainer } from '@/components/ui/Toast'
import { SectionHeader } from '../SectionHeader'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
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

  useEffect(() => {
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
      setTenant({ name: '', email: '', timezone: 'America/Sao_Paulo', language: 'pt-BR' } as Tenant)
    })
  }, [])

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

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader
        title="Perfil da Empresa"
        description="Informações da sua organização na plataforma Oryon."
      />

      <AnimatePresence>
        {!checklist.company && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-4 bg-brand-950/50 border border-brand-500/20 rounded-2xl px-5 py-4 mb-6"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Building2 className="w-4 h-4 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-100">Preencha o perfil da sua empresa</p>
              <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">
                Nome, e-mail e fuso horário são usados em relatórios, templates e comunicações automáticas.
              </p>
              <button
                onClick={() => markDone('company')}
                className="mt-2 text-xs text-surface-500 hover:text-surface-300 transition-colors"
              >
                Já entendi, ocultar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity card */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Identidade</h3>

        {/* Logo + plan */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative group cursor-pointer">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-xl font-bold text-surface-950 select-none">
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <p className="text-base font-semibold text-surface-50">{tenant.name}</p>
            <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${planBadge[tenant.plan]}`}>
              {tenant.plan}
            </span>
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
      </div>

      {/* Config card */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Configurações</h3>

        <div className="grid grid-cols-1 gap-4">
          <FormField label="E-mail de contato" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="contato@empresa.com"
            />
          </FormField>

          <FormField label="Fuso horário">
            <Select
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Idioma">
            <Select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={loading}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-surface-950 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          Salvar alterações
        </button>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
