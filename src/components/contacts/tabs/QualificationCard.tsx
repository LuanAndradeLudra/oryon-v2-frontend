import { useState } from 'react'
import { Pencil, Save, X as XIcon } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
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
  /** Esconde o título "Qualificação" quando uma seção já o rotula (ex.: acordeão da ficha completa). */
  hideTitle?: boolean
}

export function QualificationCard({ contact, onSave, hideStage = false, hideTitle = false }: QualificationCardProps) {
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

  const actions = !editing ? (
    <button onClick={() => setEditing(true)} className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all">
      <Pencil className="w-3 h-3" />
    </button>
  ) : (
    <div className="flex items-center gap-1">
      <button onClick={handleCancel} disabled={saving} className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all">
        <XIcon className="w-3 h-3" />
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-surface-100 hover:bg-surface-50 text-surface-950 disabled:opacity-60 transition-all"
      >
        <Save className="w-2.5 h-2.5" />
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )

  const body = (
    <>

      {editing ? (
          <>
            {!hideStage && (
              <FormField label="Situação">
                <SelectMenu value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as ContactStage }))}>
                  {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </SelectMenu>
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
              <SelectMenu value={form.intent} onChange={(e) => setForm((f) => ({ ...f, intent: e.target.value as ContactIntent }))}>
                {INTENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </SelectMenu>
            </FormField>
            <FormField label="Origem">
              <SelectMenu value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as ContactSource }))}>
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SelectMenu>
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
              <ReadField label="Situação" value={contact.stage ? (stages.find(s => s.key === contact.stage)?.label ?? contact.stage) : '—'} />
            )}
            <ReadField label={vocab.leadScore} value={contact.leadScore != null ? String(contact.leadScore) : '—'} />
            {contact.leadScore != null && (
              <div className="col-span-2">
                <ProgressBar value={contact.leadScore} max={100} />
              </div>
            )}
            <ReadField label={vocab.intent} value={contact.intent ? (INTENTS.find(x => x.value === contact.intent)?.label ?? '—') : '—'} />
            <ReadField label="Origem" value={contact.source ? SOURCES.find(s => s.value === contact.source)?.label : '—'} />
            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-surface-700">
              <span className="text-sm text-surface-300">Opt-in campanhas</span>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', contact.optIn ? 'text-status-active bg-status-active-bg' : 'text-surface-500 bg-surface-800')}>
                {contact.optIn ? 'Autorizado' : 'Não autorizado'}
              </span>
            </div>
          </div>
        )}
    </>
  )

  if (hideTitle) {
    return (
      <div>
        <div className="flex items-center justify-end mb-2">{actions}</div>
        {body}
      </div>
    )
  }

  return (
    <CollapsibleSection title="Qualificação" storageKey="contact-drawer.qualification" actions={actions} className="border-t border-surface-700">
      {body}
    </CollapsibleSection>
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
