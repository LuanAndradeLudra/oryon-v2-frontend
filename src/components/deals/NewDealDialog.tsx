import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { Search, User as UserIcon, Wallet } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Textarea } from '@/components/ui/Textarea'
import { Stepper } from '@/components/ui/Stepper'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuth } from '@/contexts/AuthContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { dealsApi, contactsApi, usersApi } from '@/services/api'
import { getPipelineStages, getActivePipelines, getApiErrorMessage, cn } from '@/lib/utils'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { formatBRL } from '@/utils/money'
import { DealItemsEditor } from './DealItemsEditor'
import { itemsTotalCents, toLineItemPayload, validateItems, type DealItemDraft } from './dealItems'
import type { Contact, Deal, Pipeline, User } from '@/types'

/**
 * A3 (SCRUM-925) — "Novo negócio" em 2 passos, superfície única de criação de
 * negócio de VENDA em todo o produto (chat desktop e mobile, board, ficha,
 * tabela). Funil de PROCESSO continua no "Adicionar ao funil" de 1 clique:
 * registro de processo não tem valor nem composição (F8-873).
 *
 * Os dois passos existem para separar perguntas de natureza diferente —
 * "quem e onde" (identidade do negócio) e "quanto" (dinheiro) — e para que a
 * criação mínima (contato + funil) caiba numa tela de celular sem rolagem.
 *
 * Decisões de produto que este componente materializa:
 *   * **D0-2** — valor digitado e itens COEXISTEM. Não há modo persistente: a
 *     escolha é feita no gesto, com os dois botões, e só quando há divergência
 *     de fato (`updateAmount` da A2 · SCRUM-924).
 *   * **D0-9** — dono é OPCIONAL. Nasce pré-preenchido com quem está criando e
 *     pode ser removido; "sem dono" é estado legítimo, com fila própria.
 *   * **I1** — `409 open_exists` nunca vira erro cru: sobe para o chamador, que
 *     abre o `PipelineConflictModal` (a 3ª saída chega na C2 · SCRUM-933).
 */
export interface NewDealDialogProps {
  open: boolean
  onClose: () => void
  /**
   * Contato já conhecido (chat, ficha, tabela). Ausente = o passo 1 pede a
   * busca — é o caminho do board, onde a coluna não sabe de quem é o negócio.
   */
  contactId?: string | null
  contactName?: string | null
  /** Funis do tenant; o diálogo mostra só os de venda e ativos. */
  pipelines: Pipeline[]
  /** Funil pré-selecionado (coluna do board, "Adicionar ao funil ▾"). */
  initialPipelineId?: string | null
  /** Etapa pré-selecionada — a coluna de onde o botão foi clicado. */
  initialStageId?: string | null
  /** Conversa de origem: o negócio nasce ligado a ela (§4.7, passo 1). */
  originConversationId?: string | null
  onCreated: (deal: Deal) => void
  onConflict?: (info: { openDealId: string; pipelineId: string }) => void
}

type Step = 'quem' | 'quanto'

export function NewDealDialog({
  open,
  onClose,
  contactId,
  contactName,
  pipelines,
  initialPipelineId,
  initialStageId,
  originConversationId,
  onCreated,
  onConflict,
}: NewDealDialogProps) {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const { vocab } = useTenantVocab()

  const [step, setStep] = useState<Step>('quem')
  // Contato: `contactId` da prop manda; sem ele, o operador busca (board).
  const [pickedContact, setPickedContact] = useState<{ id: string; name: string } | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Contact[]>([])
  const [searching, setSearching] = useState(false)

  const [pipelineId, setPipelineId] = useState('')
  const [stageId, setStageId] = useState('')
  const [title, setTitle] = useState('')
  // `null` = "sem dono" escolhido de propósito; `undefined` = ainda não mexeram
  // (o backend aplica o default humano — quem criou). Ver D0-9/D0-12.
  const [ownerUserId, setOwnerUserId] = useState<string | null | undefined>(undefined)
  const [users, setUsers] = useState<User[]>([])

  const [amountCents, setAmountCents] = useState(0)
  // O valor só viaja no POST quando foi DIGITADO. Sem esta marca, um campo
  // intocado (0) viraria `amountCents: 0` e apagaria a soma dos itens.
  const [amountTouched, setAmountTouched] = useState(false)
  const [items, setItems] = useState<DealItemDraft[]>([])
  const [expectedCloseAt, setExpectedCloseAt] = useState('')
  const [note, setNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const salesPipelines = useMemo(
    () => getActivePipelines(pipelines).filter((p) => pipelineKindOf(p) === 'sales'),
    [pipelines],
  )
  const contact = contactId ? { id: contactId, name: contactName ?? '' } : pickedContact
  const stages = getPipelineStages(pipelines, pipelineId)

  const itemsTotal = itemsTotalCents(items)
  const hasItems = items.length > 0
  // Divergência = o operador digitou um valor E os itens somam outro. É o
  // único caso em que a escolha dos dois botões tem consequência.
  const diverges = hasItems && amountTouched && amountCents !== itemsTotal
  const shownTotal = hasItems && !amountTouched ? itemsTotal : amountCents

  // ─── Abertura: reseta tudo (o diálogo não desmonta entre aberturas) ───────
  useEffect(() => {
    if (!open) return
    setStep('quem')
    setPickedContact(null)
    setSearch('')
    setResults([])
    setPipelineId(
      initialPipelineId && salesPipelines.some((p) => p.id === initialPipelineId)
        ? initialPipelineId
        : salesPipelines[0]?.id ?? '',
    )
    setStageId(initialStageId ?? '')
    setTitle(contactName ? `${vocab.deal} · ${contactName}` : '')
    setOwnerUserId(undefined)
    setAmountCents(0)
    setAmountTouched(false)
    setItems([])
    setExpectedCloseAt('')
    setNote('')
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Título default quando o contato só é conhecido depois (busca do board).
  useEffect(() => {
    if (!open || !pickedContact || title.trim()) return
    setTitle(`${vocab.deal} · ${pickedContact.name}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pickedContact])

  // Etapa: cai na 1ª não-terminal sempre que a atual não pertence ao funil.
  useEffect(() => {
    if (!open) return
    if (!stages.some((s) => s.id === stageId)) setStageId(stages[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pipelineId, pipelines])

  // Equipe: só para o seletor de dono. Falha silenciosa — sem a lista o campo
  // fica com "eu" e "sem dono", que é o suficiente para criar.
  useEffect(() => {
    if (!open || users.length > 0) return
    usersApi.list()
      .then((res) => setUsers(res.data ?? []))
      .catch(() => { /* dono continua opcional */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Busca de contato (só quando o diálogo não recebeu um contato pronto).
  useEffect(() => {
    if (!open || contactId) return
    const term = search.trim()
    if (term.length < 2) { setResults([]); return }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(() => {
      contactsApi.list({ search: term }, 1, 8)
        .then((res) => { if (!cancelled) setResults(res.data?.data ?? []) })
        .catch(() => { if (!cancelled) setResults([]) })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, contactId, search])

  const step1Complete = Boolean(contact?.id && pipelineId && title.trim())

  const goToQuanto = () => {
    if (!contact?.id) { setError('Escolha o contato do negócio.'); return }
    if (!pipelineId) { setError('Selecione um funil.'); return }
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    setError('')
    setStep('quanto')
  }

  /**
   * `updateAmount` só é enviado junto de `lineItems` — é o contrato da A2. Nos
   * casos sem divergência ele é irrelevante e fica de fora: com itens e sem
   * valor digitado, o backend já faz `amountCents = Σ itens`.
   */
  const submit = useCallback(async (updateAmount?: boolean) => {
    if (!contact?.id) return
    const itemsError = validateItems(items)
    if (itemsError) { setError(itemsError); return }
    setSaving(true)
    setError('')
    try {
      const res = await dealsApi.create({
        contactId: contact.id,
        title: title.trim(),
        pipelineId,
        ...(stageId ? { stageId } : {}),
        ...(originConversationId ? { originConversationId } : {}),
        ...(amountTouched ? { amountCents } : {}),
        ...(hasItems
          ? {
              lineItems: toLineItemPayload(items),
              ...(updateAmount === undefined ? {} : { updateAmount }),
            }
          : {}),
        ...(expectedCloseAt ? { expectedCloseAt: new Date(expectedCloseAt).toISOString() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        // Omitido = o backend usa quem criou (default humano da B1). `null`
        // explícito é a remoção deliberada — "sem dono" (D0-9).
        ...(ownerUserId === undefined ? {} : { ownerUserId }),
      })
      onCreated(res.data)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { code?: string; openDealId?: string; pipelineId?: string } } }
      const body = err?.response?.data
      if (onConflict && err?.response?.status === 409 && body?.code === 'open_exists' && body.openDealId) {
        onConflict({ openDealId: body.openDealId, pipelineId: body.pipelineId ?? pipelineId })
        return
      }
      setError(getApiErrorMessage(e, 'Não foi possível criar o negócio.'))
    } finally {
      setSaving(false)
    }
  }, [contact?.id, items, title, pipelineId, stageId, originConversationId, amountTouched, amountCents, hasItems, expectedCloseAt, note, ownerUserId, onCreated, onConflict])

  // ─── Passo 1 · Quem e onde ────────────────────────────────────────────────
  const stepQuem = (
    <div className="flex flex-col gap-4">
      {contactId ? (
        <FormField label="Contato">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100">
            <UserIcon className="w-4 h-4 text-surface-400 shrink-0" />
            <span className="truncate">{contactName || 'Contato selecionado'}</span>
          </div>
        </FormField>
      ) : (
        <FormField label="Contato" required error={error === 'Escolha o contato do negócio.' ? error : undefined}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
            <Input
              value={pickedContact ? pickedContact.name : search}
              onChange={(e) => { setPickedContact(null); setSearch(e.target.value); setError('') }}
              placeholder="Buscar contato por nome, e-mail ou telefone"
              className="pl-9"
              autoFocus
            />
          </div>
          {!pickedContact && search.trim().length >= 2 && (
            <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-surface-700 bg-surface-800 divide-y divide-surface-700">
              {searching && <li className="px-3 py-2 text-xs text-surface-400">Buscando…</li>}
              {!searching && results.length === 0 && (
                <li className="px-3 py-2 text-xs text-surface-400">Nenhum contato encontrado.</li>
              )}
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { setPickedContact({ id: c.id, name: c.displayName }); setResults([]); setError('') }}
                    className="w-full min-h-11 px-3 py-2 text-left text-sm text-surface-100 hover:bg-surface-700 transition-colors"
                  >
                    {c.displayName}
                    {(c.email || c.waId) && (
                      <span className="ml-2 text-xs text-surface-400">{c.email || c.waId}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FormField>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Funil" required error={error === 'Selecione um funil.' ? error : undefined}>
          <Select value={pipelineId} onChange={(e) => { setPipelineId(e.target.value); setError('') }}>
            {salesPipelines.length === 0 && <option value="">Nenhum funil de venda disponível</option>}
            {salesPipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (padrão)' : ''}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Etapa" hint="Coluna em que o negócio nasce.">
          <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
            {stages.length === 0 && <option value="">Nenhuma etapa disponível</option>}
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Título" required error={error === 'O título é obrigatório.' ? error : undefined}>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError('') }}
          placeholder={`Ex: ${vocab.deal} · Plano Anual`}
        />
      </FormField>

      {/* D0-9: dono opcional, pré-preenchido com quem cria e removível. A fila
          "sem dono" é destino legítimo — não é um campo obrigatório disfarçado. */}
      <FormField label="Dono" hint="Você pode deixar sem dono — o negócio entra na fila.">
        <Select
          value={ownerUserId === undefined ? (user?.id ?? '') : (ownerUserId ?? '')}
          onChange={(e) => setOwnerUserId(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">— sem dono —</option>
          {(users.length > 0 ? users : (user ? [user] : [])).map((u) => (
            <option key={u.id} value={u.id}>
              {`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email}
              {u.id === user?.id ? ' (eu)' : ''}
            </option>
          ))}
        </Select>
      </FormField>
    </div>
  )

  // ─── Passo 2 · Quanto ─────────────────────────────────────────────────────
  const stepQuanto = (
    <div className="flex flex-col gap-4">
      <FormField label="Valor" hint="Pode divergir da soma dos itens — nem tudo é comprado agora.">
        <MoneyInput
          value={amountCents}
          onChange={(cents) => { setAmountCents(cents); setAmountTouched(true); setError('') }}
          aria-label="Valor do negócio"
          autoFocus
        />
      </FormField>

      <div className="flex flex-col gap-1.5">
        {/* Sem `FormField` em volta: o contexto dele injeta o mesmo id em todos
            os campos descendentes e quebra os rótulos das linhas (A1/153). */}
        <span className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Itens</span>
        <DealItemsEditor
          value={items}
          onChange={(next) => { setItems(next); setError('') }}
          error={validateItems(items) === error && error ? error : undefined}
          disabled={saving}
          showTotal={false}
        />
      </div>

      {/* Total sempre visível, com a ORIGEM explícita — é o que evita o
          operador achar que o valor "sumiu" quando ele diverge dos itens. */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700">
        <span className="flex items-center gap-2 text-xs text-surface-400">
          <Wallet className="w-4 h-4" />
          {hasItems && !amountTouched
            ? '= soma dos itens'
            : hasItems && diverges
              ? 'valor definido · difere da soma dos itens'
              : 'valor definido'}
        </span>
        <span className="text-sm font-semibold text-surface-100 tabular-nums">{formatBRL(shownTotal)}</span>
      </div>
      {diverges && (
        <button
          type="button"
          onClick={() => { setAmountCents(itemsTotal); setAmountTouched(true) }}
          className="self-start text-xs font-semibold text-brand-400 hover:text-brand-300 min-h-11 sm:min-h-0"
        >
          Usar a soma dos itens ({formatBRL(itemsTotal)})
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Previsão de fechamento (opcional)">
          <Input type="date" value={expectedCloseAt} onChange={(e) => setExpectedCloseAt(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Observação (opcional)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Detalhes da proposta" />
      </FormField>
    </div>
  )

  const footer = (
    <div className="flex flex-col gap-2">
      {error && !['Escolha o contato do negócio.', 'Selecione um funil.', 'O título é obrigatório.'].includes(error) && (
        <p role="alert" className="text-xs text-danger">{error}</p>
      )}
      <div className={cn('flex gap-2', isMobile ? 'flex-col' : 'justify-end')}>
        {step === 'quem' ? (
          <>
            <Button variant="ghost" onClick={onClose} className={cn(isMobile && 'min-h-11')}>Cancelar</Button>
            <Button variant="primary" onClick={goToQuanto} className={cn(isMobile && 'min-h-11')}>Continuar</Button>
          </>
        ) : diverges ? (
          // D0-2 · os dois botões: a escolha vive no gesto, não num modo.
          <>
            <Button variant="ghost" onClick={() => setStep('quem')} className={cn(isMobile && 'min-h-11')}>Voltar</Button>
            <Button variant="secondary" loading={saving} onClick={() => submit(false)} className={cn(isMobile && 'min-h-11')}>
              Vincular
            </Button>
            <Button variant="primary" loading={saving} onClick={() => submit(true)} className={cn(isMobile && 'min-h-11')}>
              Vincular e atualizar valor
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep('quem')} className={cn(isMobile && 'min-h-11')}>Voltar</Button>
            <Button variant="primary" loading={saving} onClick={() => submit()} className={cn(isMobile && 'min-h-11')}>
              Criar {vocab.deal.toLowerCase()}
            </Button>
          </>
        )}
      </div>
    </div>
  )

  const body: ReactNode = (
    <div className="flex flex-col gap-4">
      <Stepper
        sections={[
          { id: 'quem', label: 'Quem e onde', complete: step1Complete },
          { id: 'quanto', label: 'Quanto', complete: step === 'quanto' && (amountTouched || hasItems) },
        ]}
        active={step}
        onJump={(id) => { if (id === 'quem') setStep('quem'); else goToQuanto() }}
      />
      {step === 'quem' ? stepQuem : stepQuanto}
      {footer}
    </div>
  )

  const heading = `Novo ${vocab.deal.toLowerCase()}`

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} size="tall" ariaLabel={heading}>
        <div className="px-4 pb-4 overflow-y-auto">
          <h2 className="text-base font-semibold text-surface-100 mb-3">{heading}</h2>
          {body}
        </div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={heading} className="max-w-2xl">
      {body}
    </Modal>
  )
}
