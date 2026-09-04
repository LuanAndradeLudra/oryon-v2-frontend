import { useState } from 'react'
import { Pencil, Save, X as XIcon, BarChart3 } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { useToast } from '@/hooks/useToast'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { Contact, ContactStage, ContactIntent, ContactSource } from '@/types'
import { EmojiText } from '@/lib/emojiText'
const INTENTS: { value: ContactIntent; label: string }[] = [
  { value: 'high',    label: 'Alta' },
  { value: 'medium',  label: 'Média' },
  { value: 'low',     label: 'Baixa' },
  { value: 'unknown', label: 'Indefinida' },
]
const SOURCES: { value: ContactSource; label: string }[] = [
  { value: 'whatsapp',   label: 'WhatsApp' },
  { value: 'instagram',  label: 'Instagram' },
  { value: 'facebook',   label: 'Facebook' },
  { value: 'website',    label: 'Website' },
  { value: 'referral',   label: 'Indicação' },
  { value: 'campaign',   label: 'Campanha' },
  { value: 'meta_ads',   label: 'Meta Ads' },
  { value: 'manual',     label: 'Manual' },
  { value: 'import',     label: 'Importação' },
  { value: 'other',      label: 'Outro' },
]

interface QualificationCardProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
  /** Esconde o campo Estágio (quando um StageCard dedicado já o gerencia na
   *  mesma tela) — evita a triplicação e o duplo caminho de escrita do estágio. */
  hideStage?: boolean
}

export function QualificationCard({ contact, onSave, hideStage = false }: QualificationCardProps) {
  const [editing, setEditing] = useState(false)
  const { stages } = useCRMConfig()
  const { vocab } = useTenantVocab()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    stage: contact.stage ?? 'lead',
    leadScore: contact.leadScore ?? 0,
    intent: contact.intent ?? 'unknown',
    source: contact.source ?? 'whatsapp',
    optIn: contact.optIn ?? false,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      // Quando o Estágio é gerido por um StageCard dedicado, não reenviamos
      // stage daqui (evita concorrência de escrita com o StageCard).
      const payload: Partial<typeof form> = { ...form }
      if (hideStage) delete payload.stage
      await onSave(payload)
      setEditing(false)
    } catch (err) {
      console.error('[QualificationCard] save failed:', err)
      toast(getApiErrorMessage(err, 'Não foi possível salvar a qualificação.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      stage: contact.stage ?? 'lead',
      leadScore: contact.leadScore ?? 0,
      intent: contact.intent ?? 'unknown',
      source: contact.source ?? 'whatsapp',
      optIn: contact.optIn ?? false,
    })
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-surface-400" /> Qualificação
        </h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={handleCancel} disabled={saving} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
              <XIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-60 transition-all"
            >
              <Save className="w-3 h-3" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {editing ? (
          <>
            {!hideStage && (
              <FormField label="Estágio">
                <Select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as ContactStage }))}>
                  {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </Select>
              </FormField>
            )}
            <FormField label={`${vocab.leadScore}: ${form.leadScore}`}>
              <Input
                type="number" min={0} max={100}
                value={form.leadScore}
                onChange={(e) => setForm((f) => ({ ...f, leadScore: Number(e.target.value) }))}
              />
              <ProgressBar value={form.leadScore} max={100} className="mt-2" />
            </FormField>
            <FormField label={vocab.intent}>
              <Select value={form.intent} onChange={(e) => setForm((f) => ({ ...f, intent: e.target.value as ContactIntent }))}>
                {INTENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Origem">
              <Select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as ContactSource }))}>
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </FormField>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-200">Opt-in para campanhas</p>
                <p className="text-[11px] text-surface-500">Autoriza receber mensagens de marketing</p>
              </div>
              <Switch checked={form.optIn} onChange={(v) => setForm((f) => ({ ...f, optIn: v }))} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {!hideStage && (
              <ReadField label="Estágio" value={contact.stage ? (stages.find(s => s.key === contact.stage)?.label ?? contact.stage) : '—'} />
            )}
            <ReadField label={vocab.leadScore} value={contact.leadScore != null ? String(contact.leadScore) : '—'} />
            {contact.leadScore != null && (
              <div className="col-span-2">
                <ProgressBar value={contact.leadScore} max={100} />
              </div>
            )}
            <ReadField label={vocab.intent} value={contact.intent ? (INTENTS.find(x => x.value === contact.intent)?.label ?? '—') : '—'} />
            <ReadField label="Origem" value={contact.source ? SOURCES.find(s => s.value === contact.source)?.label : '—'} />
            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-surface-800">
              <span className="text-sm text-surface-300">Opt-in campanhas</span>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', contact.optIn ? 'text-status-active bg-status-active-bg' : 'text-surface-500 bg-surface-800')}>
                {contact.optIn ? 'Autorizado' : 'Não autorizado'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] text-surface-500 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-surface-200">
        {value ? <EmojiText text={value} /> : '—'}
      </p>
    </div>
  )
}
