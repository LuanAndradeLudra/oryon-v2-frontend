import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, ExternalLink, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Banner } from '@/components/ui/Banner'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { contactsApi } from '@/services/api'
import type { Contact } from '@/types'

// Mirror of one entry of ContactsMetadata.contacts[] (see registry.tsx).
export interface SharedContact {
  name: string
  phones?: Array<{ phone: string | null; waId: string | null; type: string | null }>
  emails?: Array<{ email: string | null; type: string | null }>
  org?: string | null
}

const digitsOf = (s: string | null | undefined): string => (s ?? '').replace(/\D/g, '')
const isValidWaId = (d: string): boolean => d.length >= 10 && d.length <= 15

/** Phone options derived from the shared contact, normalized to digits (waId
 *  preferred), de-duplicated and constrained to a valid WhatsApp id length. */
function derivePhoneOptions(contact: SharedContact): Array<{ value: string; label: string }> {
  const seen = new Set<string>()
  const out: Array<{ value: string; label: string }> = []
  for (const p of contact.phones ?? []) {
    const d = digitsOf(p.waId || p.phone)
    if (!isValidWaId(d) || seen.has(d)) continue
    seen.add(d)
    const pretty = p.phone || p.waId || d
    out.push({ value: d, label: p.type ? `${pretty} (${p.type})` : pretty })
  }
  return out
}

type Status = 'checking' | 'new' | 'exists' | 'creating' | 'created'

export function AddSharedContactModal({
  open,
  onClose,
  contact,
}: {
  open: boolean
  onClose: () => void
  contact: SharedContact | null
}) {
  const navigate = useNavigate()
  const phoneOptions = useMemo(() => (contact ? derivePhoneOptions(contact) : []), [contact])

  const [displayName, setDisplayName] = useState('')
  const [waId, setWaId] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('new')
  const [existing, setExisting] = useState<Contact | null>(null)
  const [created, setCreated] = useState<Contact | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Re-seed the form whenever the modal opens for a (new) contact.
  useEffect(() => {
    if (!open || !contact) return
    setDisplayName(contact.name ?? '')
    setEmail(contact.emails?.find((e) => e.email)?.email ?? '')
    setCompany(contact.org ?? '')
    setWaId(phoneOptions[0]?.value ?? '')
    setCreated(null)
    setError(null)
  }, [open, contact, phoneOptions])

  // Pre-check duplicates by the currently selected number. A match flips the
  // modal into the "already in CRM → open contact" state.
  useEffect(() => {
    if (!open) return
    const digits = digitsOf(waId)
    if (!isValidWaId(digits)) {
      setStatus('new')
      setExisting(null)
      return
    }
    let alive = true
    setStatus('checking')
    contactsApi
      .lookup(digits)
      .then((r) => {
        if (!alive) return
        if (r.data) {
          setExisting(r.data)
          setStatus('exists')
        } else {
          setExisting(null)
          setStatus('new')
        }
      })
      .catch(() => {
        if (alive) setStatus('new')
      })
    return () => {
      alive = false
    }
  }, [open, waId])

  const openContact = (id: string) => {
    onClose()
    navigate(`/contacts?contact=${id}`)
  }

  const handleCreate = async () => {
    const digits = digitsOf(waId)
    if (!isValidWaId(digits)) {
      setError('Informe um telefone válido (somente dígitos, 10–15).')
      return
    }
    setStatus('creating')
    setError(null)
    try {
      const r = await contactsApi.create({
        displayName: displayName.trim() || digits,
        waId: digits,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        source: 'whatsapp',
      })
      setCreated(r.data)
      setStatus('created')
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: { message?: string | string[] } } })?.response
      const msg = resp?.data?.message
      setError(Array.isArray(msg) ? msg[0] : typeof msg === 'string' ? msg : 'Erro ao adicionar contato.')
      setStatus('new')
    }
  }

  const busy = status === 'creating'

  const footer = (() => {
    if (status === 'created' && created) {
      return (
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-surface-300 hover:bg-surface-800 transition-colors">Fechar</button>
          <button onClick={() => openContact(created.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-surface-950 inline-flex items-center gap-1.5 transition-colors">
            <ExternalLink className="w-4 h-4" /> Abrir contato
          </button>
        </div>
      )
    }
    if (status === 'exists' && existing) {
      return (
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-surface-300 hover:bg-surface-800 transition-colors">Fechar</button>
          <button onClick={() => openContact(existing.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-surface-950 inline-flex items-center gap-1.5 transition-colors">
            <ExternalLink className="w-4 h-4" /> Abrir contato
          </button>
        </div>
      )
    }
    return (
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-surface-300 hover:bg-surface-800 transition-colors">Cancelar</button>
        <button
          onClick={handleCreate}
          disabled={busy || status === 'checking'}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-surface-950 inline-flex items-center gap-1.5 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />} Adicionar ao CRM
        </button>
      </div>
    )
  })()

  return (
    <Modal open={open} onClose={onClose} title="Adicionar contato ao CRM" footer={footer}>
      {status === 'exists' && existing ? (
        <div className="space-y-3">
          <Banner variant="warning">
            <p className="text-sm">Este contato já está no CRM.</p>
          </Banner>
          <div className="flex items-center gap-2.5 rounded-lg bg-surface-800/60 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0">
              <User className="w-4.5 h-4.5 text-surface-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-surface-100 truncate">{existing.displayName}</p>
              <p className="text-xs text-surface-400 flex items-center gap-1 truncate"><Phone className="w-3 h-3" />{existing.waId}</p>
            </div>
          </div>
        </div>
      ) : status === 'created' && created ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-status-active-bg border border-status-active-border px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-status-active flex-shrink-0 mt-0.5" />
          <p className="text-sm text-status-active">Contato adicionado ao CRM com sucesso.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {phoneOptions.length > 1 && (
            <FormField label="Número compartilhado">
              <Select value={waId} onChange={(e) => setWaId(e.target.value)}>
                {phoneOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Nome" required>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome do contato" />
          </FormField>
          <FormField label="Telefone (WhatsApp)" required hint="Somente dígitos, com DDI/DDD (10–15).">
            <Input value={waId} onChange={(e) => setWaId(e.target.value)} placeholder="5511999999999" inputMode="numeric" />
          </FormField>
          <FormField label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </FormField>
          <FormField label="Empresa">
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Empresa" />
          </FormField>
          {status === 'checking' && (
            <p className="text-xs text-surface-400 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Verificando se já existe…</p>
          )}
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> {error}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
