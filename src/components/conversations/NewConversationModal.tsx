import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, UserPlus, MessageSquare, ChevronLeft } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneField } from '@/components/ui/PhoneField'
import { FormField } from '@/components/ui/FormField'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useContacts } from '@/hooks/useContacts'
import { useToast } from '@/hooks/useToast'
import { contactsApi } from '@/services/api'
import { resolveConversationEntry } from '@/lib/conversationEntry'
import { TemplateSendModal } from '@/components/templates/TemplateSendModal'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import { formatPhoneBR } from '@/lib/utils'
import type { Contact, WhatsAppTemplate } from '@/types'

// "Nova conversa" dentro de /conversations (PO, 24/09): antes o botão da TopBar
// e o FAB mandavam pra /contacts. Dois passos num modal só:
//   1. COM QUEM — busca por nome/telefone; cada resultado mostra o estado real
//      (conversa aberta → abrir; senão → escolher template); sem resultado →
//      criar contato ali mesmo (nome + telefone) e seguir.
//   2. O QUÊ — template aprovado → variáveis + prévia → envio → abre a conversa.

const MAX_RESULTS = 8
const MIN_QUERY = 2
const SEARCH_DEBOUNCE_MS = 300

/** Estado da conversa de um resultado. Ausente no mapa = ainda verificando.
 *  `openConversationId` = conversa ATIVA (aberta/pendente); `null` = não há.
 *  `'error'` = a consulta falhou — NUNCA vira "sem conversa" (não se sabe). */
type EntryState = { openConversationId: string | null } | 'error'

interface Props {
  open: boolean
  onClose: () => void
}

export function NewConversationModal({ open, onClose }: Props) {
  // O fluxo inteiro vive num filho que só monta aberto: cada abertura começa do
  // zero (busca vazia, passo 1) sem precisar de efeito de reset.
  if (!open) return null
  return <NewConversationFlow onClose={onClose} />
}

function NewConversationFlow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [creating, setCreating] = useState(false)
  // Passo 2: contato escolhido (ou recém-criado) e template em revisão.
  const [contact, setContact] = useState<Contact | null>(null)
  const [pending, setPending] = useState<WhatsAppTemplate | null>(null)
  const [templateQuery, setTemplateQuery] = useState('')
  const [entries, setEntries] = useState<Record<string, EntryState>>({})
  const requested = useRef(new Set<string>())

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const searching = debounced.length >= MIN_QUERY
  const { contacts, loading, setFilters } = useContacts({}, { enabled: searching, withDealsSummary: false })
  useEffect(() => { setFilters({ search: debounced }) }, [debounced, setFilters])

  const results = searching ? contacts.slice(0, MAX_RESULTS) : []

  // Estado real de cada resultado: só consulta quem está na tela e ainda não foi
  // consultado. Sem resposta = "verificando"; falha = aviso + "verificar de novo"
  // (não se sabe se há conversa — não assume nenhum dos dois caminhos).
  useEffect(() => {
    for (const c of results) {
      if (requested.current.has(c.id)) continue
      requested.current.add(c.id)
      resolveConversationEntry(c.id)
        .then((entry) => setEntries((prev) => ({ ...prev, [c.id]: { openConversationId: entry.openConversationId } })))
        .catch(() => {
          setEntries((prev) => ({ ...prev, [c.id]: 'error' }))
          toast(`Não foi possível verificar a conversa de ${c.displayName || 'este contato'}.`, 'error')
        })
    }
  })

  const recheck = (id: string) => {
    requested.current.delete(id)
    setEntries((prev) => { const next = { ...prev }; delete next[id]; return next })
  }

  const openConversation = (conversationId: string) => {
    onClose()
    navigate(`/conversations?id=${conversationId}`)
  }

  // Esc/X no passo 2 volta ao passo 1 (não fecha tudo); "Cancelar" fecha.
  const backToWho = () => { setContact(null); setTemplateQuery('') }
  const handleModalClose = contact ? backToWho : onClose

  // Fluxo ÚNICO, sem sobreposição: na revisão (etapa 3) o modal de seleção
  // deixa de ser renderizado (desmonta, sem fade de saída sobreposto) e o
  // TemplateSendModal fica sozinho na tela. O estado
  // (contato, busca, filtro de templates) vive aqui, então "Voltar" reabre o
  // passo 2 exatamente como estava (a lista de templates só recarrega).
  return (
    <>
    {!pending && (
    <Modal
      open
      onClose={handleModalClose}
      title="Nova conversa"
      className="max-w-[480px] h-[min(560px,90vh)] max-sm:h-[calc(100dvh-2rem)] max-sm:max-w-none max-sm:max-h-none"
      fillHeight
      footer={contact ? (
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" leftIcon={<ChevronLeft className="w-3.5 h-3.5" />} onClick={backToWho}>Voltar</Button>
          <Button variant="neutral" onClick={onClose}>Cancelar</Button>
        </div>
      ) : undefined}
    >
      {contact ? (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          <p className="text-xs text-surface-400">
            Escolha o template para iniciar a conversa com{' '}
            <span className="font-semibold text-surface-200">{contact.displayName || formatPhoneBR(contact.waId)}</span>.
          </p>
          <Input
            value={templateQuery}
            onChange={(e) => setTemplateQuery(e.target.value)}
            placeholder="Filtrar templates"
            aria-label="Filtrar templates"
          />
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            <TemplatePicker onSelect={setPending} query={templateQuery} />
          </div>
        </div>
      ) : creating ? (
        <CreateContactForm
          initialQuery={query.trim()}
          onBack={() => setCreating(false)}
          onCreated={(c) => { setCreating(false); setContact(c) }}
        />
      ) : (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar contato por nome ou telefone"
              aria-label="Buscar contato por nome ou telefone"
              className="pl-8"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1" aria-busy={searching && loading}>
            {!searching ? (
              <p className="text-xs text-surface-500 px-1 py-2">
                Digite pelo menos {MIN_QUERY} letras do nome ou dígitos do telefone.
              </p>
            ) : loading && results.length === 0 ? (
              <ResultSkeleton />
            ) : results.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Nenhum contato encontrado"
                hint="Crie o contato agora e siga para o envio do template."
                action={{ label: 'Criar contato', onClick: () => setCreating(true) }}
              />
            ) : (
              <ul className="flex flex-col" aria-label="Resultados da busca">
                {results.map((c) => (
                  <ResultRow
                    key={c.id}
                    contact={c}
                    entry={entries[c.id]}
                    onOpen={openConversation}
                    onChooseTemplate={setContact}
                    onRecheck={recheck}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
    )}

    {/* Etapa 3 — variáveis + prévia + envio (o mesmo modal de Conversas/Leads);
        "Voltar" (e Esc) retornam ao passo 2; ao enviar, abre a conversa já com o
        template e fecha o fluxo. */}
    {contact && (
      <TemplateSendModal
        template={pending}
        contactId={contact.id}
        recipientName={contact.displayName || undefined}
        cancelLabel="Voltar"
        cancelIcon={<ChevronLeft className="w-3.5 h-3.5" />}
        onClose={() => setPending(null)}
        onSent={(res) => {
          setPending(null)
          openConversation(res.conversationId)
        }}
      />
    )}
    </>
  )
}

function ResultSkeleton() {
  return (
    <div aria-hidden className="flex flex-col animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[52px] flex items-center gap-3 px-2">
          <span className="w-8 h-8 rounded-full bg-[var(--sf2)] flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <span className="h-3 w-36 rounded-2xs bg-[var(--sf2)]" />
            <span className="h-2.5 w-24 rounded-2xs bg-[var(--sf2)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ResultRow({ contact, entry, onOpen, onChooseTemplate, onRecheck }: {
  contact: Contact
  entry: EntryState | undefined
  onOpen: (conversationId: string) => void
  onChooseTemplate: (contact: Contact) => void
  onRecheck: (id: string) => void
}) {
  const name = contact.displayName || formatPhoneBR(contact.waId) || 'Sem nome'
  return (
    <li className="h-[52px] flex items-center gap-3 px-2 rounded-sm hover:bg-[var(--rowhover)] transition-colors">
      <Avatar name={name} imageUrl={contact.profilePicUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-[18px] text-surface-100 truncate">{name}</p>
        <p className="text-xs leading-4 text-surface-400 truncate tabular-nums">
          {formatPhoneBR(contact.waId)}
          {entry && entry !== 'error' && entry.openConversationId && <span className="text-surface-500"> · Conversa aberta</span>}
        </p>
      </div>
      {entry === undefined ? (
        <Loader2 className="w-3.5 h-3.5 text-surface-500 animate-spin flex-shrink-0" aria-label="Verificando conversa" />
      ) : entry === 'error' ? (
        <Button variant="neutral" size="sm" onClick={() => onRecheck(contact.id)} aria-label={`Verificar de novo a conversa de ${name}`}>
          Verificar de novo
        </Button>
      ) : entry.openConversationId ? (
        <Button variant="neutral" size="sm" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => onOpen(entry.openConversationId!)} aria-label={`Abrir conversa com ${name}`}>
          Abrir conversa
        </Button>
      ) : (
        <Button variant="neutral" size="sm" onClick={() => onChooseTemplate(contact)} aria-label={`Escolher template para ${name}`}>
          Escolher template
        </Button>
      )}
    </li>
  )
}

// Mesma regra do NewContactDrawer: nome obrigatório, telefone só dígitos (10–15);
// funil é opcional (F9) — aqui não há escolha de funil.
function CreateContactForm({ initialQuery, onBack, onCreated }: {
  initialQuery: string
  onBack: () => void
  onCreated: (contact: Contact) => void
}) {
  const { toast } = useToast()
  const queryDigits = initialQuery.replace(/\D/g, '')
  const looksLikePhone = queryDigits.length >= 8 && queryDigits.length === initialQuery.replace(/[\s()+-]/g, '').length
  const [displayName, setDisplayName] = useState(looksLikePhone ? '' : initialQuery)
  const [waId, setWaId] = useState(looksLikePhone ? queryDigits : '')
  const [errors, setErrors] = useState<{ displayName?: string; waId?: string }>({})
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: typeof errors = {}
    if (!displayName.trim()) e.displayName = 'Nome é obrigatório'
    if (!waId.trim()) e.waId = 'Número WhatsApp é obrigatório'
    else if (!/^\d{10,15}$/.test(waId.replace(/\D/g, ''))) e.waId = 'Formato inválido (somente números)'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setSaving(true)
    try {
      const res = await contactsApi.create({ displayName: displayName.trim(), waId: waId.replace(/\D/g, '') })
      onCreated(res.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
      toast(Array.isArray(msg) ? String(msg[0]) : (typeof msg === 'string' ? msg : 'Erro ao criar contato.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(ev) => { ev.preventDefault(); void submit() }}
    >
      <p className="text-xs text-surface-400">Novo contato — depois de criar, você escolhe o template.</p>
      <FormField label="Nome" required error={errors.displayName}>
        <Input
          value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); setErrors((v) => ({ ...v, displayName: undefined })) }}
          placeholder="Nome do contato"
          autoFocus
        />
      </FormField>
      <FormField label="WhatsApp" required error={errors.waId}>
        <PhoneField
          value={waId}
          onChange={(digits) => { setWaId(digits); setErrors((v) => ({ ...v, waId: undefined })) }}
        />
      </FormField>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="neutral" onClick={onBack} disabled={saving}>Voltar à busca</Button>
        <Button type="submit" variant="primary" loading={saving}>Criar e continuar</Button>
      </div>
    </form>
  )
}
