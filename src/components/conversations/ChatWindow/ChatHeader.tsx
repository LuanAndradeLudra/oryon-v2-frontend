import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown, Info, MoreHorizontal, Bot,
  Check, Archive, ArrowLeft, MoreVertical, Handshake, KanbanSquare,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { ConfirmModal } from '@/components/ui/Modal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useToast } from '@/hooks/useToast'
import { dealsApi } from '@/services/api'
import { cn, hexToRgba, getApiErrorMessage, formatPhoneBR, formatRelativeTime } from '@/lib/utils'
import { isAiActive } from '@/lib/conversationSignals'
import { HandoffChip } from './AiHandoffBanner'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { StageBadge } from '@/components/contacts/StageBadge'
import { defaultSalesPipeline } from '@/lib/pipelineKinds'
import { useResolveWithOutcome } from '@/hooks/useResolveWithOutcome'
import { ResolveOutcomePopover } from './ResolveOutcomePopover'
import type { Conversation, DealOutcomeInput, Tag as TagType, User } from '@/types'

const STATUS_OPTIONS = [
  { value: 'open' as const, label: 'Abertas' },
  { value: 'pending' as const, label: 'Pendentes' },
  { value: 'resolved' as const, label: 'Resolvidas' },
]

function statusTriggerLabel(s: Conversation['status']) {
  if (s === 'open') return 'Aberta'
  if (s === 'pending') return 'Pendente'
  if (s === 'resolved') return 'Resolvida'
  return 'Status'
}

interface ChatHeaderProps {
  conversation: Conversation
  allTags: TagType[]
  allUsers: User[]
  /** F10 (SCRUM-882): ao resolver com desfecho, `dealOutcome` vai junto (fecha o registro-alvo antes de resolver). */
  onStatusChange: (status: 'open' | 'pending' | 'resolved', dealOutcome?: DealOutcomeInput) => void | Promise<void>
  onToggleInfo: () => void
  infoOpen: boolean
  onAddTag: (tag: TagType) => void
  onRemoveTag: (tagId: string) => void
  onCreateTag?: (name: string, color: string) => Promise<TagType>
  onDeleteTag?: (tagId: string) => Promise<void>
  onAssign: (user: User | null) => void
  onArchive: () => void
  /** Phase 32 — replaces the standalone AiHandoffBanner. The chip lives
   *  inline in the header and the actions (intervir / reativar / estender)
   *  are reachable in 1 click from here. */
  onSetAiPause: (pauseUntil: string | null) => Promise<void> | void
  /** Phase 34 — "Intervir agora": pause using the agent's configured handoff
   *  window (duration resolved server-side; no client-computed timestamp). */
  onInterveneAi?: () => Promise<void> | void
  /** When provided, shows a mobile-only back button on the left of the header. */
  onBack?: () => void
}

export function ChatHeader({
  conversation,
  onStatusChange, onToggleInfo, infoOpen,
  onArchive,
  onSetAiPause, onInterveneAi,
  onBack,
}: ChatHeaderProps) {
  const isMobile = useIsMobile()
  const { contact, status, tags = [] } = conversation
  // `tags` continua sendo lida — não para desenhar pílulas no cabeçalho, e sim
  // para o marcador do botão de Informações saber que há o que ver lá dentro.
  // F9 (SCRUM-874): "Adicionar ao funil" a partir da conversa — o registro
  // nasce ligado a ela (`originConversationId`).
  const addToPipeline = useAddToPipeline()
  const { pipelines, stages } = useCRMConfig()
  const { vocab } = useTenantVocab()
  /**
   * A3 (SCRUM-925): no mobile o cabeçalho não comporta o "Adicionar ao funil ▾",
   * então a ação vive no menu ⋯ e aponta direto para o funil de venda padrão —
   * o diálogo de 2 passos deixa trocar o funil no passo 1. Sem funil de venda
   * configurado, o item não aparece (nada a criar).
   */
  const salesPipeline = defaultSalesPipeline(pipelines)
  // F10 (SCRUM-880): "Resolvida" com registro-alvo aberto → popover de desfecho
  // (prancheta 5); sem alvo, resolve como sempre.
  const resolve = useResolveWithOutcome({
    conversationId: conversation.id,
    contactId: contact.id,
    onResolve: (dealOutcome) => onStatusChange('resolved', dealOutcome),
  })
  const multiPipeline = useMultiPipeline()
  const { openDeal } = useDealPanel()
  const { toast } = useToast()
  const [viewDealLoading, setViewDealLoading] = useState(false)
  // B4 (SCRUM-930): "Ver negócio" no menu ⋯ do mobile — mesma precedência do
  // "Resolver com desfecho" (`GET /deals/ai/stages`, §4.7: conversa de
  // origem → campanha única → `no_target`) pra achar o registro desta
  // conversa, sem inventar um seletor novo (o de múltiplos negócios abertos
  // é da C2/SCRUM-933, fora de escopo aqui).
  const handleViewDeal = async () => {
    setViewDealLoading(true)
    try {
      const { data } = await dealsApi.conversationTarget(conversation.id)
      if (data?.dealId) openDeal(data.dealId)
      else toast('Nenhum negócio vinculado a esta conversa ainda.', 'error')
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Não foi possível abrir o negócio.'), 'error')
    } finally {
      setViewDealLoading(false)
    }
  }

  const [archiveOpen,  setArchiveOpen]  = useState(false)
  const [statusOpen,   setStatusOpen]   = useState(false)
  const [moreOpen,     setMoreOpen]     = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  const closeAll = () => {
    setStatusOpen(false); setMoreOpen(false)
  }

  useEffect(() => {
    if (!statusOpen) return
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen])

  // Compartilhado entre mobile e desktop — Modals/Pickers
  const sharedOverlays = (
    <>
      <ConfirmModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => { onArchive(); setArchiveOpen(false) }}
        title="Arquivar conversa"
        description={`Tem certeza que deseja arquivar a conversa com ${contact.displayName}? Ela ficará como "Abandonada".`}
        confirmLabel="Arquivar"
        danger
      />
    </>
  )

  const resolvePopover = (
    <ResolveOutcomePopover
      open={!!resolve.target || !!resolve.candidates}
      mobile={isMobile}
      target={resolve.target}
      candidates={resolve.candidates}
      onPickCandidate={(id) => void resolve.pickCandidate(id)}
      contactName={contact.displayName || contact.waId}
      currentAmountCents={resolve.currentAmountCents}
      hasLineItems={resolve.hasLineItems}
      busy={resolve.busy}
      onConfirm={resolve.confirm}
      onCancel={resolve.close}
    />
  )

  // Status dropdown — usado em ambos os layouts (mobile e desktop)
  const statusDropdown = (
    <div ref={statusRef} className="relative">
      <button
        type="button"
        onClick={() => { setMoreOpen(false); setStatusOpen((v) => !v) }}
        title="Alterar status"
        disabled={resolve.loading}
        aria-busy={resolve.loading || undefined}
        style={{ ['--chip']: status === 'resolved'
              ? 'var(--color-cstatus-resolved)'
              : status === 'pending'
                ? 'var(--color-cstatus-pending)'
                : 'var(--color-status-open)' } as React.CSSProperties}
        className={cn(
          'flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-all border',
          statusOpen
            ? 'color-chip'
            : 'status-trigger bg-surface-800 text-surface-300 border-surface-700',
        )}
      >
        <span className="max-w-[7rem] truncate">{statusTriggerLabel(status)}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 opacity-80', statusOpen && 'rotate-180')} />
      </button>

      {statusOpen && (
        <div className="overlay-scrim z-40" aria-hidden onMouseDown={() => setStatusOpen(false)} />
      )}
      {statusOpen && (
        <div className="absolute right-0 top-full mt-1 min-w-[11rem] py-1 overlay-surface border rounded-xl z-50 overflow-hidden">
          {STATUS_OPTIONS.map(({ value: v, label }) => {
            const active = status === v
            const statusBg = v === 'open'
              ? 'bg-status-open/20 hover:bg-status-open/32'
              : v === 'pending'
                ? 'bg-cstatus-pending/20 hover:bg-cstatus-pending/32'
                : 'bg-cstatus-resolved/20 hover:bg-cstatus-resolved/32'
            const statusText = v === 'open'
              ? 'text-status-open'
              : v === 'pending'
                ? 'text-cstatus-pending'
                : 'text-cstatus-resolved'
            return (
              <button
                key={v}
                type="button"
                onClick={() => {
                  if (!active) {
                    if (v === 'resolved') void resolve.requestResolve()
                    else void onStatusChange(v)
                  }
                  setStatusOpen(false)
                }}
                className={cn(
                  'w-full flex flex-col items-stretch gap-0.5 px-3 py-2 text-xs font-medium text-left transition-colors',
                  statusBg,
                  statusText,
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  {label}
                  {active && <Check className={cn('w-3.5 h-3.5 flex-shrink-0', statusText)} />}
                </span>
                {/* F-CONV achado do Auditor: "Resolver com desfecho" ficava
                    escondido atrás desta opção, sem nenhuma pista de que
                    também fecha o negócio vinculado — hint estático (sem
                    request extra, o alvo só é buscado ao clicar). */}
                {v === 'resolved' && multiPipeline && (
                  <span className="text-[10px] font-normal opacity-70">
                    Também fecha o {vocab.deal.toLowerCase()} vinculado, se houver
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
      {resolvePopover}
    </div>
  )

  // ─── Mobile compact layout ──────────────────────────────────────────────
  if (isMobile) {
    const visibleTags = tags.slice(0, 2)
    const extraTags = tags.length - visibleTags.length

    return (
      <div className="conv-surface flex items-center px-2 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] border-b border-surface-700 bg-surface-950 flex-shrink-0 gap-2">
        {/* Back */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar para conversas"
            className="-ml-1 w-9 h-9 flex items-center justify-center rounded-lg text-surface-300 hover:bg-[var(--rowhover)] hover:text-surface-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="30" />

        {/* Stack: nome / telefone / tags */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="text-[13.5px] font-bold text-surface-50 truncate">
            {contact.displayName}
          </p>
          {/* Só identidade. Negócios e etiquetas saíram daqui (09/09): são
              atributos do CONTATO, e o cabeçalho carrega o que muda a próxima
              mensagem — situação da conversa e estado da IA. Os dois já têm
              seção própria no painel da direita, e mantê-los aqui era a mesma
              informação em dois lugares, disputando a mesma tela. */}
          <div className="flex items-center gap-1 text-[11px] text-surface-400 flex-wrap">
            <WhatsAppIcon size={10} />
            <span className="truncate">{contact.waId}</span>
          </div>
          {/* Handoff chip — wraps below the phone/tags row so the right-side
              buttons (status / more) stay reachable even on narrow phones. */}
          <div className="mt-1">
            <HandoffChip
              aiPausedUntil={conversation.aiPausedUntil}
              assignedUser={conversation.assignedUser}
              onPause={(until) => onSetAiPause(until)}
              onResume={() => onSetAiPause(null)}
              onIntervene={onInterveneAi}
            />
          </div>
        </div>

        {/* Status + 3-pontos */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {statusDropdown}

          <Dropdown
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            align="right"
            anchor={
              <button
                type="button"
                onClick={() => { closeAll(); setMoreOpen((v) => !v) }}
                aria-label="Mais ações"
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-lg transition-all',
                  moreOpen ? 'bg-surface-900 text-surface-100' : 'text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-200',
                )}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            }
          >
            <DropdownItem
              icon={Info}
              onClick={() => { setMoreOpen(false); onToggleInfo() }}
              active={infoOpen}
            >
              Detalhes do contato
            </DropdownItem>
            {salesPipeline && (
              <DropdownItem
                icon={Handshake}
                onClick={() => {
                  setMoreOpen(false)
                  addToPipeline.requestAdd({
                    contactId: contact.id,
                    contactName: contact.displayName || contact.waId,
                    pipeline: salesPipeline,
                    conversationId: conversation.id,
                  })
                }}
              >
                Novo {vocab.deal.toLowerCase()}
              </DropdownItem>
            )}
            {/* B4 (SCRUM-930): paridade com o chip do cabeçalho (que já abre a
                ficha) — mesma resolução do "Resolver com desfecho". */}
            <DropdownItem
              icon={KanbanSquare}
              disabled={viewDealLoading}
              onClick={() => { setMoreOpen(false); void handleViewDeal() }}
            >
              Ver negócio
            </DropdownItem>
            <DropdownItem
              icon={Archive}
              danger
              onClick={() => { setMoreOpen(false); setArchiveOpen(true) }}
            >
              Arquivar conversa
            </DropdownItem>
          </Dropdown>
        </div>

        {sharedOverlays}
        {/* A3: os diálogos do "Adicionar ao funil" (novo negócio, conflito I1,
            motivo do fechamento) só eram montados no layout desktop. */}
        {addToPipeline.dialogs}
      </div>
    )
  }

  // Controle da conversa (desktop). IA no controle → chip âmbar + "Assumir"
  // (mesma ação do antigo ícone: intervenção do servidor, com fallback de 4 h).
  // IA pausada → o HandoffChip existente (quem assumiu, reativar, estender).
  const aiActive = isAiActive(conversation)
  const aiControls = aiActive ? (
    <>
      <span className="inline-flex items-center gap-1 h-7 px-2 rounded-sm text-xs font-semibold text-accent-amber bg-accent-amber/[.12] whitespace-nowrap">
        <Bot className="w-3.5 h-3.5" /> Agente IA no controle
      </span>
      {/* PL-3-1 (P5): os atalhos J/K/E/R só eram ensinados no estado vazio do
          chat; depois de abrir uma conversa ninguém mais descobre. O tooltip
          do próprio botão é onde Intercom/Front ensinam o atalho. */}
      <Tooltip content="Assumir a conversa (R)" side="bottom">
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            if (onInterveneAi) void onInterveneAi()
            else void onSetAiPause(new Date(Date.now() + 240 * 60_000).toISOString())
          }}
        >
          Assumir
        </Button>
      </Tooltip>
    </>
  ) : (
    <HandoffChip
      aiPausedUntil={conversation.aiPausedUntil}
      assignedUser={conversation.assignedUser}
      onPause={(until) => onSetAiPause(until)}
      onResume={() => onSetAiPause(null)}
      onIntervene={onInterveneAi}
    />
  )

  // ─── Desktop layout (original) ──────────────────────────────────────────
  return (
    <div className="conv-surface h-[52px] flex items-center justify-between px-4 border-b border-surface-700 bg-surface-800 flex-shrink-0 gap-2.5">

      {/* ── Left: contact info ────────────────────────────────── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="30" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 leading-tight">
            <h2 className="text-[13.5px] font-bold text-surface-100 truncate">{contact.displayName}</h2>
            {/* CONV-CHAT-05 (spec/1d-conversas.GAPS.md): situação do contato
                no cabeçalho do chat — existia no ContactPanel, faltava aqui. */}
            {contact.stage && <StageBadge stage={contact.stage} stages={stages} size="xs" />}
          </div>
          {/* R2-1D-HDR: "telefone formatado · visto por último há N" (mock).
              O número da LINHA saiu (já é o ConnectedLineChip da TopBar) e o
              responsável mora em DADOS do painel. */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] leading-tight text-surface-400">
            <span className="truncate">{formatPhoneBR(contact.waId)}</span>
            {contact.lastSeenAt && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">visto por último {formatRelativeTime(contact.lastSeenAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: actions ────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* "Novo negócio" NÃO mora mais aqui. A A3 (SCRUM-925) o trouxe para o
            cabeçalho quando criar negócio só existia escondido dentro do menu
            de funis; desde então o painel da direita ganhou a mesma ação, com
            a lista de negócios do contato do lado — que é o lugar onde ela faz
            sentido. Dois botões idênticos na mesma tela é ruído, não atalho.
            Continua a um clique em: painel do contato (à direita) e
            "Adicionar ao funil ▾" (aqui ao lado). */}
        {addToPipeline.dialogs}

        {/* Ordem do grupo de ações: o status vem antes do HandoffChip
            (âmbar/emerald), que fica entre ele e Info/Arquivar. Veio do PR
            #102, que também tinha um botão "Resolver" de 1 clique ao lado
            deste dropdown — removido a pedido do PO por duplicar a ação que
            o dropdown já faz. Resolver volta a ser a opção "Resolvidas"
            daqui, que continua chamando `resolve.requestResolve` e abrindo o
            popover de desfecho quando a conversa tem negócio vinculado. */}
        {/* R2-1D-HDR (RODADA-2.md): controle → Assumir → Resolver → ··· como
            no mock. Nada saiu: status (Aberta/Pendente/Resolvida) e Arquivar
            foram pro menu ···; com a IA pausada o HandoffChip segue sendo o
            controle (reativar/estender). */}
        {aiControls}

        {status !== 'resolved' && (
          <div className="relative">
            <Tooltip content="Resolver e ir para a próxima (E)" side="bottom">
              <Button size="sm" variant="neutral" disabled={resolve.loading} onClick={() => void resolve.requestResolve()}>
                Resolver
              </Button>
            </Tooltip>
            {resolvePopover}
          </div>
        )}

        <Dropdown
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          align="right"
          className="w-52"
          anchor={
            <button
              type="button"
              onClick={() => { setStatusOpen(false); setMoreOpen((v) => !v) }}
              aria-label="Mais ações"
              className="w-7 h-7 rounded-sm border border-[var(--bd2)] flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-all"
            >
              <MoreHorizontal className="w-[15px] h-[15px]" />
            </button>
          }
        >
          <div className="px-1 py-1 flex flex-col gap-0.5">
            {STATUS_OPTIONS.map(({ value: v, label }) => (
              <DropdownItem
                key={v}
                active={status === v}
                onClick={() => {
                  setMoreOpen(false)
                  if (status === v) return
                  if (v === 'resolved') void resolve.requestResolve()
                  else void onStatusChange(v)
                }}
              >
                {label}
              </DropdownItem>
            ))}
            {/* "Adicionar ao funil" saiu do cabeçalho (o mock não o tem; o painel
                do contato já tem "Novo negócio"). Nada se perde: aqui abre o
                mesmo fluxo com detalhes, que deixa escolher o funil. */}
            <DropdownItem
              onClick={() => {
                setMoreOpen(false)
                addToPipeline.requestAddDetailed({ contactId: contact.id, contactName: contact.displayName || contact.waId, conversationId: conversation.id })
              }}
            >
              <Handshake className="w-3.5 h-3.5" /> Adicionar ao funil…
            </DropdownItem>
            <DropdownItem danger onClick={() => { setMoreOpen(false); setArchiveOpen(true) }}>
              <Archive className="w-3.5 h-3.5" /> Arquivar conversa
            </DropdownItem>
          </div>
        </Dropdown>

        <Tooltip content="Informações do contato" side="bottom">
          <button
            onClick={onToggleInfo}
            aria-label="Informações do contato"
            aria-expanded={infoOpen}
            className={cn(
              'w-7 h-7 rounded-sm flex items-center justify-center transition-all',
              infoOpen ? 'bg-surface-900 text-surface-200' : 'text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-200'
            )}
          >
            <div className="relative">
              <Info className="w-4 h-4" />
              {(contact.metaAdsReferral || contact.googleAdsAttribution || tags.length > 0) && !infoOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-surface-400 border border-surface-900" />
              )}
            </div>
          </button>
        </Tooltip>
      </div>

      {sharedOverlays}
    </div>
  )
}
