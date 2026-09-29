import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Avatar } from '@/components/ui/Avatar'
import { Banner } from '@/components/ui/Banner'
import { useEstadoNaUrl } from '@/hooks/useEstadoNaUrl'
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
  profilePictureUrl: string
}

const EMPTY_FORM: ProfileForm = {
  about: '',
  address: '',
  description: '',
  email: '',
  websites: ['', ''],
  vertical: 'UNDEFINED',
  profilePictureUrl: '',
}

export function WhatsAppBusinessProfile() {
  const { toast } = useToast()
  const { numbers, loading: loadingNumbers } = useWorkspaceNumber()
  // Linha escolhida na URL (`?linha=`); sem ela, a primeira (o caso comum: uma só).
  const [linhaUrl, setSelectedId] = useEstadoNaUrl<string>('linha', { padrao: '' })
  const selectedId = linhaUrl && numbers.some((n) => n.id === linhaUrl) ? linhaUrl : (numbers[0]?.id ?? '')
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [loadingProfile, setLoadingProfile] = useState(false)
  // O que veio da Meta: o salvar só envia o que mudou em relação a isto, e
  // fica travado se a leitura falhou (antes, salvar com a leitura falha
  // mandava websites: [] e a categoria padrão, apagando os reais na Meta).
  const [original, setOriginal] = useState<ProfileForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  useEffect(() => {
    if (!selectedId) return
    loadProfile(selectedId)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async (numberId: string) => {
    setLoadingProfile(true)
    setOriginal(null)
    try {
      const { data } = await api.get(`/meta/numbers/${numberId}/business-profile`)
      const lido: ProfileForm = {
        about: data.about ?? '',
        address: data.address ?? '',
        description: data.description ?? '',
        email: data.email ?? '',
        websites: [data.websites?.[0] ?? '', data.websites?.[1] ?? ''],
        vertical: data.vertical ?? 'UNDEFINED',
        profilePictureUrl: data.profile_picture_url ?? '',
      }
      setForm(lido)
      setOriginal(lido)
    } catch {
      // Sem toast: o aviso fixo acima do formulário (com "Tentar de novo") já diz.
    } finally {
      setLoadingProfile(false)
    }
  }

  const save = async () => {
    if (!original) return
    const websites = form.websites.map((w) => w.trim()).filter(Boolean)
    const invalido = websites.find((w) => !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(w))
    if (invalido) {
      toast(`Site inválido: ${invalido}. Use o endereço completo, começando com https://`, 'error')
      return
    }
    const sitesMudaram = websites.join('\n') !== original.websites.filter(Boolean).join('\n')
    setSaving(true)
    try {
      await api.patch(`/meta/numbers/${selectedId}/business-profile`, {
        // Omit blank fields instead of sending '' — the PATCH forwards every
        // included key straight to Meta, so a blank we never touched (e.g.
        // because the initial GET failed) would otherwise silently clear a
        // real value already set on the business profile.
        about: form.about || undefined,
        address: form.address || undefined,
        description: form.description || undefined,
        email: form.email || undefined,
        // Sites e categoria só quando mudaram: são enviados mesmo vazios e
        // substituem o que está na Meta.
        ...(sitesMudaram ? { websites } : {}),
        ...(form.vertical !== original.vertical ? { vertical: form.vertical } : {}),
      })
      setOriginal({ ...form, websites: [websites[0] ?? '', websites[1] ?? ''] })
      toast('Perfil do WhatsApp atualizado.', 'success')
    } catch (err) {
      toast(extractErrorMessage(err, 'Erro ao salvar o perfil.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedId) return

    const formData = new FormData()
    formData.append('file', file)
    setUploadingPhoto(true)
    try {
      // Mesmo bug do upload de mídia do chat (api.ts messagesApi.send): sem
      // boundary o backend nunca interpreta o corpo multipart. `undefined`
      // remove o `application/json` default da instância e deixa o axios
      // calcular o Content-Type certo sozinho a partir do FormData.
      await api.post(`/meta/numbers/${selectedId}/business-profile/photo`, formData, {
        headers: { 'Content-Type': undefined },
      })
      toast('Foto de perfil atualizada.', 'success')
      await loadProfile(selectedId)
    } catch (err) {
      toast(
        extractErrorMessage(err, 'Erro ao enviar a foto. Confira o formato (JPEG/PNG) e o tamanho (até 5MB).'),
        'error',
      )
    } finally {
      setUploadingPhoto(false)
    }
  }

  const selectedNumber = numbers.find((n) => n.id === selectedId)

  if (loadingNumbers) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <SectionHeader
        title="Perfil do WhatsApp"
        description="Edite o perfil do WhatsApp Business de cada número — foto, endereço, e-mail, descrição, sites e categoria."
      />

      {numbers.length === 0 ? (
        <div className="py-[22px] text-[13px] text-surface-500">
          Nenhuma linha WhatsApp conectada. Conecte um número em Configurações → Números WhatsApp.
        </div>
      ) : (
        <>
          <SettingsSection title="Linha e foto" description="Escolha a linha WhatsApp e a foto de perfil exibida no WhatsApp Business.">
            {/* Com uma linha só (o caso de todo cliente hoje) não há o que
                escolher: mostra a linha em texto em vez de um seletor. */}
            <FormField label="Linha WhatsApp">
              {numbers.length > 1 ? (
                <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {numbers.map((n) => (
                    <option key={n.id} value={n.id}>
                      {formatWaSelectLabel(n)}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-sm text-surface-200">{selectedNumber ? formatWaSelectLabel(selectedNumber) : ''}</p>
              )}
            </FormField>

            <div className="flex items-center gap-5 mt-5">
              <button
                type="button"
                className="relative group cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-wait"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label="Trocar foto de perfil"
              >
                <Avatar
                  name={selectedNumber?.displayPhoneNumber ?? 'WA'}
                  imageUrl={form.profilePictureUrl || undefined}
                  size="lg"
                />
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingPhoto ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                onChange={handlePhotoChange}
              />
              <div>
                <p className="text-sm font-semibold text-surface-100">Foto de perfil</p>
                <p className="text-xs text-surface-500">JPEG ou PNG, até 5MB.</p>
              </div>
            </div>
          </SettingsSection>

          {!loadingProfile && !original && selectedId && (
            <Banner variant="danger" className="mb-4">
              <p>Não foi possível ler o perfil desta linha na Meta. Para não sobrescrever os dados reais, o salvar fica bloqueado até a leitura dar certo.</p>
              <button type="button" onClick={() => loadProfile(selectedId)} className="mt-2 font-semibold underline underline-offset-2 hover:opacity-80">
                Tentar de novo
              </button>
            </Banner>
          )}
          <div className={loadingProfile || !original ? 'opacity-50 pointer-events-none' : ''}>
            <SettingsSection title="Perfil de negócio" description="Informações públicas do seu WhatsApp Business.">
              <div className="grid grid-cols-1 gap-3">
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
            </SettingsSection>

            <div className="flex justify-end pt-[22px] border-t border-surface-700">
              <Button variant="primary" onClick={save} loading={saving} disabled={!original}>Salvar alterações</Button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
