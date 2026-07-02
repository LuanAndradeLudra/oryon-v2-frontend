import { useEffect, useState } from 'react'
import { SectionHeader } from '../SectionHeader'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { api } from '@/services/api'
import { formatWaSelectLabel } from '@/lib/utils'

/** NestJS's ValidationPipe returns `message` as a string[] when class-validator
 *  rejects multiple fields — normalize to one readable string either way. */
function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message
  if (Array.isArray(message)) return message.join(' ')
  return message ?? fallback
}

const VERTICAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'UNDEFINED', label: 'Não definido' },
  { value: 'OTHER', label: 'Outro' },
  { value: 'AUTO', label: 'Automotivo' },
  { value: 'BEAUTY', label: 'Beleza' },
  { value: 'APPAREL', label: 'Vestuário' },
  { value: 'EDU', label: 'Educação' },
  { value: 'ENTERTAIN', label: 'Entretenimento' },
  { value: 'EVENT_PLAN', label: 'Planejamento de eventos' },
  { value: 'FINANCE', label: 'Finanças' },
  { value: 'GROCERY', label: 'Mercearia' },
  { value: 'GOVT', label: 'Governo' },
  { value: 'HOTEL', label: 'Hotelaria' },
  { value: 'HEALTH', label: 'Saúde' },
  { value: 'NONPROFIT', label: 'Sem fins lucrativos' },
  { value: 'PROF_SERVICES', label: 'Serviços profissionais' },
  { value: 'RETAIL', label: 'Varejo' },
  { value: 'TRAVEL', label: 'Viagens' },
  { value: 'RESTAURANT', label: 'Restaurante' },
  { value: 'ALCOHOL', label: 'Bebidas alcoólicas' },
  { value: 'ONLINE_GAMBLING', label: 'Jogos de azar online' },
  { value: 'PHYSICAL_GAMBLING', label: 'Jogos de azar físico' },
  { value: 'OTC_DRUGS', label: 'Medicamentos sem receita' },
]

const ABOUT_MAX_LENGTH = 139

interface ProfileForm {
  about: string
  address: string
  description: string
  email: string
  websites: [string, string]
  vertical: string
}

const EMPTY_FORM: ProfileForm = {
  about: '',
  address: '',
  description: '',
  email: '',
  websites: ['', ''],
  vertical: 'UNDEFINED',
}

export function WhatsAppBusinessProfile() {
  const { toast, toasts, dismiss } = useToast()
  const { numbers, loading: loadingNumbers } = useWorkspaceNumber()
  const [selectedId, setSelectedId] = useState<string>('')
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selectedId && numbers.length > 0) {
      setSelectedId(numbers[0].id)
    }
  }, [numbers, selectedId])

  useEffect(() => {
    if (!selectedId) return
    loadProfile(selectedId)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async (numberId: string) => {
    setLoadingProfile(true)
    try {
      const { data } = await api.get(`/meta/numbers/${numberId}/business-profile`)
      setForm({
        about: data.about ?? '',
        address: data.address ?? '',
        description: data.description ?? '',
        email: data.email ?? '',
        websites: [data.websites?.[0] ?? '', data.websites?.[1] ?? ''],
        vertical: data.vertical ?? 'UNDEFINED',
      })
    } catch {
      toast('Erro ao carregar o perfil do WhatsApp.', 'error')
    } finally {
      setLoadingProfile(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const websites = form.websites.filter(Boolean)
      await api.patch(`/meta/numbers/${selectedId}/business-profile`, {
        // Omit blank fields instead of sending '' — the PATCH forwards every
        // included key straight to Meta, so a blank we never touched (e.g.
        // because the initial GET failed) would otherwise silently clear a
        // real value already set on the business profile.
        about: form.about || undefined,
        address: form.address || undefined,
        description: form.description || undefined,
        email: form.email || undefined,
        websites,
        vertical: form.vertical,
      })
      toast('Perfil do WhatsApp atualizado.', 'success')
    } catch (err) {
      toast(extractErrorMessage(err, 'Erro ao salvar o perfil.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loadingNumbers) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader
        title="Perfil do WhatsApp"
        description="Edite o perfil do WhatsApp Business de cada número — endereço, e-mail, descrição, sites e categoria."
      />

      {numbers.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 text-sm text-surface-400">
          Nenhuma linha WhatsApp conectada. Conecte um número em Configurações → Números WhatsApp.
        </div>
      ) : (
        <>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 mb-6">
            <FormField label="Linha WhatsApp">
              <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {numbers.map((n) => (
                  <option key={n.id} value={n.id}>
                    {formatWaSelectLabel(n)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className={loadingProfile ? 'opacity-50 pointer-events-none' : ''}>
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-surface-300 mb-4">Perfil de negócio</h3>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  label="Recado (about)"
                  hint={`${form.about.length}/${ABOUT_MAX_LENGTH} caracteres`}
                >
                  <Textarea
                    rows={2}
                    maxLength={ABOUT_MAX_LENGTH}
                    value={form.about}
                    onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                    placeholder="Ex.: Atendimento das 9h às 18h"
                  />
                </FormField>

                <FormField label="Descrição">
                  <Textarea
                    rows={3}
                    maxLength={512}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Descreva sua empresa"
                  />
                </FormField>

                <FormField label="Endereço">
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Rua, número, cidade"
                  />
                </FormField>

                <FormField label="E-mail">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="contato@empresa.com"
                  />
                </FormField>

                <FormField label="Site 1">
                  <Input
                    value={form.websites[0]}
                    onChange={(e) => setForm((f) => ({ ...f, websites: [e.target.value, f.websites[1]] }))}
                    placeholder="https://empresa.com"
                  />
                </FormField>

                <FormField label="Site 2">
                  <Input
                    value={form.websites[1]}
                    onChange={(e) => setForm((f) => ({ ...f, websites: [f.websites[0], e.target.value] }))}
                    placeholder="https://empresa.com/loja"
                  />
                </FormField>

                <FormField label="Categoria">
                  <Select
                    value={form.vertical}
                    onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}
                  >
                    {VERTICAL_OPTIONS.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </Select>
                </FormField>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-surface-950 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Salvar alterações
              </button>
            </div>
          </div>
        </>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
