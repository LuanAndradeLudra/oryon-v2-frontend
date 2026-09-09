import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Search, Plus, CalendarDays, Wallet } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { AttributeChip, ChipOption } from './AttributeChip'
import { PipelineTrail } from './PipelineTrail'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuth } from '@/contexts/AuthContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { dealsApi, contactsApi, usersApi } from '@/services/api'
import { getPipelineStages, getActivePipelines, getApiErrorMessage, cn } from '@/lib/utils'
import { pipelineKindOf, pipelineKindOption, pipelineNoun } from '@/lib/pipelineKinds'
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
 * **Uma tela, título primeiro, contexto em fichas.** O formulário era uma
 * pilha de nove blocos rotulados em dois passos — 863 px para uma tarefa cujo
 * caminho feliz é "Continuar → Criar", com os dois únicos campos obrigatórios
 * já preenchidos. Agora a identidade (título e escopo) abre a tela em corpo
 * grande, e funil, etapa, dono, previsão e valor viram fichas: mostram o valor
 * resolvido e abrem o seletor no clique.
 *
 * O passo "Quanto" saiu porque prometia dinheiro que quase nunca existe —
 * criado do chat, o negócio nasce sem valor. Quem precisa dele abre a ficha
 * "Valor" e o bloco cresce na própria tela, sem trocar de passo.
 *
 * A "Observação" saiu da criação (decisão do PO, 09/09): é recado operacional
 * para a equipe, não ajuda a criar — vive na ficha do negócio, que é onde a
 * equipe volta.
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
  /**
   * `409 open_exists` (I1). Leva também o contato porque no caminho do BOARD
   * quem abriu o diálogo não sabia de quem seria o negócio — e o modal de
   * conflito precisa do nome para dizer o que já existe.
   */
  onConflict?: (info: { openDealId: string; pipelineId: string; contactId: string; contactName: string }) => void
}


/** Iniciais para o avatar do dono na ficha. */
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

/** "2026-09-30" → "30 set" (o que cabe numa ficha). */
function dataCurta(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de ', ' ').replace('.', '')
}

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
  const semMovimento = useReducedMotion()
  const { user } = useAuth()
  const { vocab } = useTenantVocab()

  // O bloco de valor cresce na própria tela quando a ficha "Valor" é ligada —
  // no lugar do passo 2 que existia antes.
  const [valorAberto, setValorAberto] = useState(false)
  const tituloRef = useRef<HTMLTextAreaElement>(null)
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

  const [description, setDescription] = useState('')
  const [amountCents, setAmountCents] = useState(0)
  // O valor só viaja no POST quando foi DIGITADO. Sem esta marca, um campo
  // intocado (0) viraria `amountCents: 0` e apagaria a soma dos itens.
  const [amountTouched, setAmountTouched] = useState(false)
  const [items, setItems] = useState<DealItemDraft[]>([])
  const [expectedCloseAt, setExpectedCloseAt] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Antes só funis de VENDA entravam aqui, sem dizer por quê — metade dos
  // funis do tenant simplesmente não aparecia. Agora lista os dois tipos, com
  // o tipo no rótulo; escolher um de processo adapta o diálogo (sem passo de
  // valor, substantivo próprio). O caminho de 1 clique pelo "Adicionar ao
  // funil ▾" continua existindo — este modal passa a ser TAMBÉM capaz.
  const salesPipelines = useMemo(
    () => getActivePipelines(pipelines),
    [pipelines],
  )
  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === pipelineId) ?? null,
    [pipelines, pipelineId],
  )
  // Funil de processo não tem valor nem itens (§4 do Modelo B): o passo 2
  // deixa de existir, e o substantivo do diálogo passa a ser o do tipo.
  const isProcess = !!selectedPipeline && pipelineKindOf(selectedPipeline) === 'process'
  const noun = selectedPipeline ? pipelineNoun(selectedPipeline) : vocab.deal.toLowerCase()
  const contact = contactId ? { id: contactId, name: contactName ?? '' } : pickedContact
  const stages = getPipelineStages(pipelines, pipelineId)
  // Tenant SEM o `FF_MULTI_PIPELINE`: o `CRMConfigContext` entrega `pipelines:
  // []` de propósito (o gate não chama `/settings/pipelines`). Lá não há funil
  // para escolher — e é justamente onde a aba de negócios do contato só tem
  // este caminho de criação. Exigir funil deixaria o botão sem saída; o POST
  // sem `pipelineId` cai no funil default do backend, como o `DealModal` fazia.
  const semFunis = pipelines.length === 0

  const itemsTotal = itemsTotalCents(items)
  const hasItems = items.length > 0
  // Divergência = o operador digitou um valor E os itens somam outro. É o
  // único caso em que a escolha dos dois botões tem consequência.
  const diverges = hasItems && amountTouched && amountCents !== itemsTotal
  const shownTotal = hasItems && !amountTouched ? itemsTotal : amountCents

  // ─── Abertura: reseta tudo (o diálogo não desmonta entre aberturas) ───────
  useEffect(() => {
    if (!open) return
    setValorAberto(false)
    setPickedContact(null)
    setSearch('')
    setResults([])
    setPipelineId(
      initialPipelineId && salesPipelines.some((p) => p.id === initialPipelineId)
        ? initialPipelineId
        : salesPipelines[0]?.id ?? '',
    )
    setStageId(initialStageId ?? '')
    // Em funil de PROCESSO o título default é só o nome do contato — é o que o
    // "Adicionar ao funil" de 1 clique sempre gravou, e é o que os cards do
    // quadro mostram hoje. Prefixar com o substantivo aqui faria os dois
    // caminhos (confirmação e 1 clique) criarem registros com nomes diferentes.
    const inicial = pipelines.find((p) => p.id === initialPipelineId) ?? null
    const processoInicial = !!inicial && pipelineKindOf(inicial) === 'process'
    setTitle(contactName ? (processoInicial ? contactName : `${vocab.deal} · ${contactName}`) : '')
    setOwnerUserId(undefined)
    setAmountCents(0)
    setAmountTouched(false)
    setItems([])
    setExpectedCloseAt('')
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
  // O `!pipelineId` não é defensivo — é o que preserva a etapa da COLUNA de
  // onde o "+" do board foi clicado: na abertura este efeito roda no mesmo
  // flush do reset acima, quando `stages` ainda é do funil anterior (vazio, na
  // montagem). Sem a saída antecipada ele sobrescrevia o `initialStageId` e
  // todo negócio nascia na primeira etapa.
  useEffect(() => {
    if (!open || !pipelineId) return
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

  /**
   * Numa tela só, a validação deixa de ser porteira de passo e vira porteira
   * do POST. O foco vai para o que falta: o título é o herói da tela, então
   * errar nele sem levar o cursor até lá deixaria o operador procurando.
   */
  const validar = useCallback(() => {
    if (!contact?.id) { setError('Escolha o contato do negócio.'); return false }
    if (!pipelineId && !semFunis) { setError('Selecione um funil.'); return false }
    if (!title.trim()) { setError('O título é obrigatório.'); tituloRef.current?.focus(); return false }
    setError('')
    return true
  }, [contact?.id, pipelineId, semFunis, title])

  /**
   * `updateAmount` só é enviado junto de `lineItems` — é o contrato da A2. Nos
   * casos sem divergência ele é irrelevante e fica de fora: com itens e sem
   * valor digitado, o backend já faz `amountCents = Σ itens`.
   */
  const submit = useCallback(async (updateAmount?: boolean) => {
    if (!validar() || !contact?.id) return
    const itemsError = validateItems(items)
    if (itemsError) { setError(itemsError); return }
    setSaving(true)
    setError('')
    try {
      const res = await dealsApi.create({
        contactId: contact.id,
        title: title.trim(),
        ...(pipelineId ? { pipelineId } : {}),
        ...(stageId ? { stageId } : {}),
        ...(originConversationId ? { originConversationId } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(amountTouched ? { amountCents } : {}),
        ...(hasItems
          ? {
              lineItems: toLineItemPayload(items),
              ...(updateAmount === undefined ? {} : { updateAmount }),
            }
          : {}),
        ...(expectedCloseAt ? { expectedCloseAt: new Date(expectedCloseAt).toISOString() } : {}),
        // Omitido = o backend usa quem criou (default humano da B1). `null`
        // explícito é a remoção deliberada — "sem dono" (D0-9).
        ...(ownerUserId === undefined ? {} : { ownerUserId }),
      })
      onCreated(res.data)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { code?: string; openDealId?: string; pipelineId?: string } } }
      const body = err?.response?.data
      if (onConflict && err?.response?.status === 409 && body?.code === 'open_exists' && body.openDealId) {
        onConflict({
          openDealId: body.openDealId,
          pipelineId: body.pipelineId ?? pipelineId,
          contactId: contact.id,
          contactName: contact.name,
        })
        return
      }
      setError(getApiErrorMessage(e, 'Não foi possível criar o negócio.'))
    } finally {
      setSaving(false)
    }
  }, [validar, contact?.id, items, title, pipelineId, stageId, originConversationId, amountTouched, amountCents, hasItems, description, expectedCloseAt, ownerUserId, onCreated, onConflict])

  // ─── Corpo · uma tela ─────────────────────────────────────────────────────

  /** Cresce o campo de texto sem moldura conforme o conteúdo quebra linha. */
  const cresce = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  // O título nasce sugerido ("Negócio · Fulano") e SELECIONADO: digitar
  // substitui, e quem aceita a sugestão sai daqui em dois gestos. Só quando o
  // contato já é conhecido — no caminho do board o cursor pertence à busca.
  useEffect(() => {
    if (!open || !contactId) return
    const t = requestAnimationFrame(() => {
      const el = tituloRef.current
      if (!el) return
      el.focus()
      el.select()
    })
    return () => cancelAnimationFrame(t)
  }, [open, contactId])

  // Contato desconhecido (board): a busca continua sendo CAMPO. Ficha serve a
  // valor escolhido de um conjunto curto — não a texto digitado.
  const buscaContato = !contactId && (
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
  )

  // ─── Identidade ───────────────────────────────────────────────────────────
  // Título e escopo são TEXTO LIVRE, e texto livre precisa de afordância de
  // campo — é a mesma regra que manda o atributo escolhido de uma lista virar
  // ficha. Aprendida duas vezes: primeiro o escopo virou um texto sem moldura e
  // o PO disse que o campo tinha sumido; depois o título, que continuava sem
  // moldura, "só aparecia o nome do contato" sem indicar que dava para editar.
  //
  // O título continua sendo o primeiro e o maior — a hierarquia vem do corpo do
  // texto (display, 18 px) e da ordem, não da ausência de moldura.
  const identidade = (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="novo-negocio-titulo" className="text-xs font-medium text-surface-400">
          Título
        </label>
        <textarea
          id="novo-negocio-titulo"
          ref={(el) => { tituloRef.current = el; cresce(el) }}
          value={title}
          onChange={(e) => { setTitle(e.target.value); cresce(e.currentTarget); setError('') }}
          rows={1}
          aria-required
          aria-invalid={error === 'O título é obrigatório.' || undefined}
          placeholder={`Nome do ${noun}`}
          // Sem moldura: o título volta a ser texto livre, como o PO pediu.
          // A afordância de campo fica no RÓTULO acima (que é o que faltava
          // quando ele era só um texto solto) e num fio que acende no hover e
          // no foco — em repouso a tela fica limpa, e o campo se anuncia
          // quando o olho ou o cursor chega nele.
          className={cn(
            'w-full resize-none overflow-hidden bg-transparent px-0 py-1',
            'font-display text-lg font-semibold leading-snug text-surface-50',
            'placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-surface-600',
            'border-0 border-b transition-colors focus:outline-none',
            error === 'O título é obrigatório.'
              ? 'border-danger'
              : 'border-transparent hover:border-surface-700 focus:border-brand-400/60',
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="novo-negocio-escopo" className="text-xs font-medium text-surface-400">
          Escopo <span className="text-surface-500">(opcional)</span>
        </label>
        <textarea
          id="novo-negocio-escopo"
          ref={cresce}
          value={description}
          onChange={(e) => { setDescription(e.target.value); cresce(e.currentTarget) }}
          rows={2}
          placeholder={isProcess
            ? 'Ex: consulta de retorno, ajuste de plano'
            : 'Ex: site institucional + hospedagem dedicada'}
          className="w-full min-h-[56px] resize-none overflow-hidden rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm leading-relaxed text-surface-100 placeholder:text-surface-500 transition-colors hover:border-surface-600 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
        />
        <span className="text-[11px] text-surface-500">
          {isProcess
            ? 'O que está sendo tratado — aparece no card do quadro, abaixo do título.'
            : 'O que está sendo proposto ao cliente — aparece no card do quadro, abaixo do título.'}
        </span>
      </div>
    </div>
  )

  // ─── Coluna direita · o que se escolhe de uma lista ───────────────────────
  // A regra da coluna: só entra aqui o atributo que é ESCOLHA NUMA LISTA. O
  // valor saiu porque é conteúdo, e a etapa saiu porque virou trilha. Sem isso
  // a coluna era uma sobra; com isso, tem critério.
  const etapaAtual = stages.find((s) => s.id === stageId)
  const equipe = users.length > 0 ? users : (user ? [user] : [])
  const donoId = ownerUserId === undefined ? (user?.id ?? '') : (ownerUserId ?? '')
  const donoUser = equipe.find((u) => u.id === donoId)
  const nomeDe = (u: User) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
  // "Sem dono" é escolha legítima (D0-9) — por isso a ficha fica PREENCHIDA
  // com o texto, e não vazia como se o campo tivesse sido esquecido.
  const donoValor = ownerUserId === null ? 'Sem dono' : (donoUser ? nomeDe(donoUser) : null)
  const FunilIcon = selectedPipeline ? pipelineKindOption(pipelineKindOf(selectedPipeline)).icon : Wallet

  const avatarDono = (
    <span className="w-4 h-4 rounded-full bg-surface-700 text-surface-200 text-[8px] font-semibold grid place-items-center shrink-0" aria-hidden>
      {ownerUserId === null ? '–' : (donoUser ? iniciais(nomeDe(donoUser)) : '?')}
    </span>
  )

  const propriedades = (
    <div className="flex flex-col gap-3">
      {!semFunis && (
        <div className="flex flex-col gap-1.5">
          <span className="text-3xs font-mono uppercase tracking-wider text-surface-500">Funil</span>
          <AttributeChip
            label="Funil"
            value={selectedPipeline?.name}
            icon={FunilIcon}
            full
            hint={`Onde este ${noun} vai viver. O tipo do funil — venda ou processo — vem antes do nome.`}
          >
            {(fechar) => (
              salesPipelines.length === 0
                ? <p className="px-3 py-2 text-xs text-surface-400">Nenhum funil disponível</p>
                : <>{salesPipelines.map((p) => (
                    <ChipOption
                      key={p.id}
                      selected={p.id === pipelineId}
                      onSelect={() => { setPipelineId(p.id); setError(''); fechar() }}
                    >
                      {pipelineKindOption(pipelineKindOf(p)).label} · {p.name}{p.isDefault ? ' (padrão)' : ''}
                    </ChipOption>
                  ))}</>
            )}
          </AttributeChip>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-3xs font-mono uppercase tracking-wider text-surface-500">Dono</span>
        <AttributeChip
          label="Dono"
          value={donoValor}
          leading={avatarDono}
          full
          hint={`Quem responde por este ${noun}. Pode ficar sem dono — aí ele entra na fila da equipe.`}
        >
          {(fechar) => (
            <>
              <ChipOption selected={ownerUserId === null} onSelect={() => { setOwnerUserId(null); fechar() }}>
                Sem dono — entra na fila
              </ChipOption>
              {equipe.map((u) => (
                <ChipOption key={u.id} selected={u.id === donoId && ownerUserId !== null} onSelect={() => { setOwnerUserId(u.id); fechar() }}>
                  {nomeDe(u)}{u.id === user?.id ? ' (eu)' : ''}
                </ChipOption>
              ))}
            </>
          )}
        </AttributeChip>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-3xs font-mono uppercase tracking-wider text-surface-500">Previsão</span>
        <AttributeChip
          label="Previsão"
          value={expectedCloseAt ? dataCurta(expectedCloseAt) : null}
          icon={CalendarDays}
          full
          align="right"
          hint={isProcess
            ? 'Quando você espera concluir este registro.'
            : 'Quando você espera fechar este negócio. Serve ao funil e à previsão da equipe.'}
        >
          {(fechar) => (
            // Sem `role="menuitem"` aqui de propósito: o Dropdown foca o primeiro
            // item que encontra na abertura, e o que deve receber o foco é a data.
            <div className="flex flex-col gap-2 p-2 min-w-[14rem]">
              <input
                type="date"
                autoFocus
                value={expectedCloseAt}
                onChange={(e) => setExpectedCloseAt(e.target.value)}
                aria-label={isProcess ? 'Previsão de conclusão' : 'Previsão de fechamento'}
                className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setExpectedCloseAt(''); fechar() }}
                  className="text-xs text-surface-400 hover:text-surface-200 transition-colors cursor-pointer"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={fechar}
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
                >
                  Pronto
                </button>
              </div>
            </div>
          )}
        </AttributeChip>
      </div>
    </div>
  )

  // ─── Valor · o segundo herói da tela ──────────────────────────────────────
  // Vazio, é um convite de largura inteira em vez de uma ficha de 80 px que
  // ninguém via. Aberto, o número é a primeira coisa que o olho encontra
  // depois do título. Funil de processo não tem valor nem itens (§4 do
  // Modelo B): o bloco simplesmente não é oferecido.
  const blocoValor = !isProcess && (
    valorAberto ? (
      <motion.div
        initial={semMovimento ? false : { height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-3 rounded-xl border border-surface-700 p-3.5 bg-[linear-gradient(180deg,rgba(45,212,191,0.045),rgba(22,30,30,0.45))] overflow-hidden">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-end justify-between gap-3">
            <span className="text-3xs font-mono uppercase tracking-wider text-surface-500">
              Valor do {noun}
            </span>
            <span className="text-[11px] leading-snug text-right text-surface-500">
              {hasItems && !amountTouched
                ? <>= soma de <b className="font-semibold text-brand-400">{items.length} {items.length === 1 ? 'item' : 'itens'}</b></>
                : hasItems && diverges
                  ? <>digitado<br /><b className="font-semibold text-brand-400">difere dos itens</b></>
                  : 'digitado'}
            </span>
          </div>
          <MoneyInput
            value={shownTotal}
            onChange={(cents) => { setAmountCents(cents); setAmountTouched(true); setError('') }}
            aria-label={`Valor do ${noun}`}
            autoFocus
            className="h-12 !text-xl font-display font-bold text-surface-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          {/* Sem `FormField` em volta: o contexto dele injeta o mesmo id em todos
              os campos descendentes e quebra os rótulos das linhas (A1/153). */}
          <span className="text-3xs font-mono uppercase tracking-wider text-surface-500">Itens</span>
          <DealItemsEditor
            value={items}
            onChange={(next) => { setItems(next); setError('') }}
            error={validateItems(items) === error && error ? error : undefined}
            disabled={saving}
            showTotal={false}
          />
        </div>

        <AnimatePresence initial={false}>
          {diverges && (
            <motion.button
              type="button"
              initial={semMovimento ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setAmountCents(itemsTotal); setAmountTouched(true) }}
              className="self-start text-xs font-semibold text-brand-400 hover:text-brand-300 min-h-11 sm:min-h-0 cursor-pointer"
            >
              Usar a soma dos itens ({formatBRL(itemsTotal)})
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    ) : (
      <button
        type="button"
        onClick={() => setValorAberto(true)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-surface-700 px-3.5 py-4 text-sm text-surface-500 hover:text-surface-300 hover:border-surface-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
      >
        <Plus className="w-4 h-4" aria-hidden />
        Adicionar valor ou itens
      </button>
    )
  )

  const footer = (
    <div className="flex flex-col gap-2 border-t border-surface-800 bg-surface-950 px-4 py-3.5">
      {error && error !== 'Escolha o contato do negócio.' && (
        <p role="alert" className="text-xs text-danger">{error}</p>
      )}
      <div className={cn('flex gap-2', isMobile ? 'flex-col' : 'items-center justify-between')}>
        {!isMobile && (
          <span className="text-[11px] text-surface-500">
            <kbd className="rounded border border-surface-700 px-1 py-0.5 font-mono text-[10px]">⌘</kbd>
            {' '}
            <kbd className="rounded border border-surface-700 px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            {' '}{diverges ? 'não decide' : 'cria'}
          </span>
        )}
        <div className={cn('flex gap-2', isMobile ? 'flex-col' : 'items-center')}>
          {diverges ? (
            // D0-2 · os dois botões: a escolha vive no gesto, não num modo.
            <>
              <Button variant="ghost" onClick={onClose} className={cn(isMobile && 'min-h-11')}>Cancelar</Button>
              <Button variant="secondary" loading={saving} onClick={() => submit(false)} className={cn(isMobile && 'min-h-11')}>
                Vincular
              </Button>
              <Button variant="neutral" loading={saving} onClick={() => submit(true)} className={cn(isMobile && 'min-h-11')}>
                Vincular e atualizar valor
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} className={cn(isMobile && 'min-h-11')}>Cancelar</Button>
              <Button variant="neutral" loading={saving} onClick={() => submit()} className={cn(isMobile && 'min-h-11')}>
                Criar {noun}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // ⌘/Ctrl + Enter cria sem tirar a mão do teclado. Na divergência de valor
  // não: ali a escolha entre os dois botões é justamente o que não pode ser
  // resolvido por um atalho só (D0-2).
  const atalhoCriar = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !saving && !diverges) {
      e.preventDefault()
      submit()
    }
  }

  const body: ReactNode = (
    <div className="flex flex-col" onKeyDown={atalhoCriar}>
      {/* A trilha é o seletor de etapa — a ficha "Etapa" deixou de existir.
          Espelha o quadro que o operador já usa: as colunas correm da esquerda
          para a direita, e a faixa repete esse mapeamento. */}
      {!semFunis && stages.length > 0 && (
        <PipelineTrail
          // Lista COMPLETA, não a de `getPipelineStages` — ela filtra as
          // terminais, e a trilha existe justamente para mostrar o funil
          // inteiro, com o fim à vista. Nascer numa terminal continua
          // impossível: a própria trilha desabilita esses pontos.
          stages={selectedPipeline?.stages ?? stages}
          activeId={stageId}
          onSelect={setStageId}
          compact={isMobile}
        />
      )}

      {/* Esquerda o que se ESCREVE, direita o que se ESCOLHE. No celular a
          coluna vira uma faixa embaixo, com borda no topo em vez de na lateral. */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_13rem]">
        <div className="flex flex-col gap-4 p-4 min-w-0">
          {buscaContato}
          {identidade}
          {blocoValor}
        </div>
        <div className="flex flex-col gap-3 p-4 bg-surface-950 border-t sm:border-t-0 sm:border-l border-surface-800">
          {propriedades}
        </div>
      </div>

      {footer}
    </div>
  )

  // O cabeçalho dizia só "Novo negócio". Com ícone do tipo e a linha de
  // contexto (contato · funil), o operador confirma de relance ONDE está
  // criando — informação que antes ele só encontrava descendo até os campos.
  const headingText = `Novo ${noun}`
  const contextoLinha = [contact?.name || contactName, selectedPipeline?.name].filter(Boolean).join(' · ')
  const HeadIcon = selectedPipeline ? pipelineKindOption(pipelineKindOf(selectedPipeline)).icon : Wallet
  const heading = (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-9 h-9 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
        <HeadIcon className="w-4 h-4 text-surface-300" aria-hidden />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-base font-display font-semibold text-surface-50 leading-tight">{headingText}</span>
        {contextoLinha && (
          <span className="text-xs text-surface-400 truncate leading-tight mt-0.5">{contextoLinha}</span>
        )}
      </span>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} size="tall" ariaLabel={headingText}>
        <div className="overflow-y-auto">
          <div className="mb-3 px-4">{heading}</div>
          {body}
        </div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={heading} className="max-w-2xl" bodyClassName="p-0">
      {body}
    </Modal>
  )
}
