import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Handshake, MessageSquare, Megaphone, Workflow, History } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useToast } from '@/hooks/useToast'
import { useContactProfile } from '@/hooks/useContactProfile'
import { isFeatureVisible } from '@/config/featureFlags'
import { cn } from '@/lib/utils'

import { ErrorState } from '@/components/ui/ErrorState'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkeletonCard, SkeletonList } from '@/components/ui/Skeleton'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

import { ContactProfileHeader } from '@/components/contacts/profile/ContactProfileHeader'
import { ContactProfileLayout } from '@/components/contacts/profile/ContactProfileLayout'
import { ContactPipelinesSection } from '@/components/contacts/profile/ContactPipelinesSection'
import { ContactTimeline } from '@/components/contacts/profile/ContactTimeline'
import { TimelineComposer } from '@/components/contacts/profile/TimelineComposer'
import { NextActionPanel } from '@/components/contacts/profile/NextActionPanel'
import { RelationshipHealthPanel } from '@/components/contacts/profile/RelationshipHealthPanel'
import { BestTimePanel } from '@/components/contacts/profile/BestTimePanel'
import { DealsTabMock } from '@/components/contacts/profile/DealsTabMock'
import { CampaignTouchesMock } from '@/components/contacts/profile/CampaignTouchesMock'
import { AutomationRunsMock } from '@/components/contacts/profile/AutomationRunsMock'
import { ProfileMobileView } from '@/components/contacts/profile/ProfileMobileView'
import { MockBadge } from '@/components/contacts/profile/MockBadge'
import {
  PROFILE_MOCKS_ENABLED, mockDealsFor, mockNotesFor, mockTasksFor,
  mockCampaignTouchesFor, mockAutomationRunsFor,
} from '@/components/contacts/profile/mockData'

import { SendTemplateDrawer } from '@/components/contacts/SendTemplateDrawer'
import { AIContextCard } from '@/components/contacts/tabs/AIContextCard'
import { ContactInfoCard } from '@/components/contacts/tabs/ContactInfoCard'
import { QualificationCard } from '@/components/contacts/tabs/QualificationCard'
import { CustomFieldsCard } from '@/components/contacts/tabs/CustomFieldsCard'
import { TagsCard } from '@/components/contacts/tabs/TagsCard'
import { AttributionCard } from '@/components/contacts/tabs/AttributionCard'
import { EngagementCard } from '@/components/contacts/tabs/EngagementCard'
import { ConversationsTab } from '@/components/contacts/tabs/ConversationsTab'

import type { Contact } from '@/types'
import type { ContactNote, ContactTask } from '@/types/contactProfile'

const PROFILE_TAB_IDS = ['activity', 'conversations', 'deals', 'campaigns', 'automations'] as const
type ProfileTabId = (typeof PROFILE_TAB_IDS)[number]

function isProfileTab(v: string | null): v is ProfileTabId {
  return !!v && (PROFILE_TAB_IDS as readonly string[]).includes(v)
}

// ── Abas do centro (padrão tabs acessível: roving tabindex + setas) ──────────
interface ProfileTabsProps {
  tabs: Array<{ id: ProfileTabId; label: string; icon: typeof History; count?: number; isMock?: boolean }>
  active: ProfileTabId
  onChange: (tab: ProfileTabId) => void
}

function ProfileTabs({ tabs, active, onChange }: ProfileTabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  const focusAndSelect = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length]
    onChange(next.id)
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const current = tabs.findIndex((t) => t.id === active)
    if (e.key === 'ArrowRight') { e.preventDefault(); focusAndSelect(current + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusAndSelect(current - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusAndSelect(0) }
    else if (e.key === 'End') { e.preventDefault(); focusAndSelect(tabs.length - 1) }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Seções do contato"
      onKeyDown={handleKeyDown}
      className="shrink-0 flex items-center gap-1 border-b border-surface-700/60 overflow-x-auto scroll-thin px-2"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            data-tab={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
              isActive ? 'text-surface-100' : 'text-surface-500 hover:text-surface-300',
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className={cn(
                'min-w-[18px] px-1 rounded-full text-[11px] font-semibold text-center tabular-nums',
                isActive ? 'bg-surface-700 text-surface-100' : 'bg-surface-800 text-surface-500',
              )}>
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="profile-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-brand-400"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

const DUE_OPTIONS = [
  { label: 'Hoje', days: 0 },
  { label: 'Amanhã', days: 1 },
  { label: 'Em 3 dias', days: 3 },
  { label: 'Próxima semana', days: 7 },
]

/**
 * Página dedicada de perfil do contato (Customer 360) — rota /contacts/:id.
 * O drawer da lista permanece como quick-view; esta página é o deep-dive.
 * Fase frontend-first: negócios/campanhas/automações/notas/tarefas usam
 * dados simulados demarcados (PROFILE_MOCKS_ENABLED em mockData.ts).
 */
export function ContactProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { vocab } = useTenantVocab()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const isXl = useMediaQuery('(min-width: 1280px)')

  // Contato semeado pelo "Expandir" do drawer (navigation state) — permite a
  // página nascer com dados durante o crossfade, sem flash de skeleton.
  const location = useLocation()
  const seededContact = (location.state as { contact?: Contact } | null)?.contact
  const contactId = id ?? ''
  const profile = useContactProfile(
    contactId,
    seededContact?.id === contactId ? seededContact : undefined,
  )
  const { contact, stats, conversations } = profile

  // Tab ativa sincronizada com ?tab= (deep link preciso + sobrevive a F5).
  // replace:true — trocar de aba não polui o histórico do navegador.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: ProfileTabId = isProfileTab(tabParam) ? tabParam : 'activity'
  const setTab = (next: ProfileTabId) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      if (next === 'activity') p.delete('tab')
      else p.set('tab', next)
      return p
    }, { replace: true })
  }

  const [notes, setNotes] = useState<ContactNote[]>([])
  const [tasks, setTasks] = useState<ContactTask[]>([])
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDays, setTaskDueDays] = useState(1)

  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  // Dados simulados determinísticos por contato (seções sem backend).
  const deals = useMemo(() => (PROFILE_MOCKS_ENABLED ? mockDealsFor(contactId) : []), [contactId])
  const touches = useMemo(() => (PROFILE_MOCKS_ENABLED ? mockCampaignTouchesFor(contactId) : []), [contactId])
  const runs = useMemo(() => (PROFILE_MOCKS_ENABLED ? mockAutomationRunsFor(contactId) : []), [contactId])

  // Ao trocar de contato: recarrega os estados locais (a tab vem da URL).
  useEffect(() => {
    setNotes(PROFILE_MOCKS_ENABLED ? mockNotesFor(contactId) : [])
    setTasks(PROFILE_MOCKS_ENABLED ? mockTasksFor(contactId) : [])
  }, [contactId])

  if (!id) return <Navigate to="/contacts" replace />
  if (!isFeatureVisible('contactProfilePage', user?.email)) {
    return <Navigate to={`/contacts?contact=${id}`} replace />
  }

  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Você'

  // "Voltar" sempre retorna à lista COM o drawer deste contato reaberto —
  // a ContactsPage lê ?contact=<id> e abre o quick-view. Não usamos
  // navigate(-1): a entrada anterior do histórico é /contacts SEM o param
  // (o drawer era estado local, perdido ao navegar), então voltar pelo
  // histórico caía no kanban sem o drawer.
  const handleBack = () => navigate(`/contacts?contact=${contactId}`)

  const handleOpenChat = () => {
    const lastConv = conversations[0]
    if (lastConv) {
      navigate(`/conversations?id=${lastConv.id}`)
    } else {
      setTemplateDrawerOpen(true)
    }
  }

  const handleDelete = async () => {
    try {
      await profile.remove()
      toast('Contato excluído com sucesso.', 'success')
      navigate('/contacts')
    } catch {
      toast('Erro ao excluir contato.', 'error')
    }
  }

  const handleAddNote = (body: string) => {
    setNotes((prev) => [{
      id: `local-${Date.now()}`,
      body,
      authorName: userName,
      createdAt: new Date().toISOString(),
    }, ...prev])
    toast('Nota adicionada (ainda não é salva no servidor).', 'info')
  }

  const focusComposer = () => {
    setTab('activity')
    requestAnimationFrame(() => {
      composerRef.current?.focus()
      composerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'done' as const } : t)))
  }

  const handleCreateTask = () => {
    const title = taskTitle.trim()
    if (!title) return
    setTasks((prev) => [{
      id: `local-task-${Date.now()}`,
      title,
      dueAt: new Date(Date.now() + taskDueDays * 86_400_000).toISOString(),
      status: 'pending' as const,
      assigneeName: userName,
    }, ...prev])
    setTaskTitle('')
    setTaskModalOpen(false)
    toast('Tarefa criada (ainda não é salva no servidor).', 'info')
  }

  const showAiContext = isFeatureVisible('aiContextCard', user?.email)
  const conversationCount = stats?.conversations.total ?? conversations.length
  const lastConversation = conversations[0]

  // ── Estados de carregamento / erro (antes de ter contato) ──────────────────
  if (profile.error && !contact) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <ErrorState
          title="Não foi possível carregar este contato."
          hint="Ele pode ter sido excluído ou o link está incorreto."
          onRetry={profile.refresh}
          retryLabel="Tentar novamente"
        />
      </div>
    )
  }

  if (profile.loading || !contact) {
    return (
      <div className="h-full w-full flex-1 min-w-0 overflow-y-auto">
        <div className="px-4 py-3">
          <SkeletonCard lines={1} className="h-16" />
        </div>
        <div className="flex items-start gap-4 px-4 pt-4 w-full">
          <div className="w-[360px] shrink-0 hidden md:flex flex-col gap-4">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </div>
          <div className="flex-1 min-w-0"><SkeletonList items={6} /></div>
          <div className="w-[400px] shrink-0 hidden xl:flex flex-col gap-4">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
          </div>
        </div>
      </div>
    )
  }

  // ── Blocos de inteligência/contexto (coluna direita no desktop; abaixo do
  //    acordeão em <xl). NÃO duplicam as tabs do centro — trazem sinais que
  //    não existem em nenhum outro lugar da tela. O NextActionPanel é
  //    desacoplado dos mocks: a sugestão da IA (aiNextBestAction) é dado
  //    real; só a criação de tarefas locais fica atrás do gate. ─────────────
  const contextPanels = (
    <>
      <NextActionPanel
        tasks={tasks}
        aiSuggestion={contact.aiNextBestAction}
        onAddTask={PROFILE_MOCKS_ENABLED ? () => setTaskModalOpen(true) : undefined}
        onToggleTask={handleToggleTask}
      />
      {showAiContext && <AIContextCard contact={contact} onRefresh={profile.refresh} />}
      <RelationshipHealthPanel contact={contact} stats={stats} />
      <BestTimePanel contactId={contactId} />
    </>
  )

  const centerTabs: ProfileTabsProps['tabs'] = [
    { id: 'activity', label: 'Atividade', icon: History },
    { id: 'conversations', label: 'Conversas', icon: MessageSquare, count: conversationCount },
    ...(PROFILE_MOCKS_ENABLED ? [
      { id: 'deals' as const, label: vocab.deals, icon: Handshake, count: deals.length },
      { id: 'campaigns' as const, label: 'Campanhas', icon: Megaphone, count: touches.length },
      { id: 'automations' as const, label: 'Automações', icon: Workflow, count: runs.length },
    ] : []),
  ]

  return (
    <div className="h-full w-full flex-1 min-w-0 flex flex-col min-h-0">
      {isMobile ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ProfileMobileView
            contact={contact}
            stats={stats}
            notes={notes}
            tasks={tasks}
            composerRef={composerRef}
            onBack={handleBack}
            onOpenChat={handleOpenChat}
            onSendTemplate={() => setTemplateDrawerOpen(true)}
            onAddNote={handleAddNote}
            onFocusComposer={focusComposer}
            onAddTask={PROFILE_MOCKS_ENABLED ? () => setTaskModalOpen(true) : undefined}
            onToggleTask={handleToggleTask}
            onDelete={handleDelete}
            onSave={profile.save}
            onAddTag={profile.addTag}
            onRemoveTag={profile.removeTag}
            onRefresh={profile.refresh}
            onStageChanged={profile.setStage}
          />
        </div>
      ) : (
        <>
          {/* Header fixo no topo — a página não rola; só as colunas rolam. */}
          <div className="shrink-0">
            <ContactProfileHeader
              contact={contact}
              lastActivityAt={lastConversation?.lastMessageAt}
              lastMessagePreview={lastConversation?.lastMessagePreview}
              lastMessageSenderKind={lastConversation?.lastMessageSenderKind}
              assignedTo={stats?.assignedTo ?? null}
              onBack={handleBack}
              onOpenChat={handleOpenChat}
              onSendTemplate={() => setTemplateDrawerOpen(true)}
              onAddNote={focusComposer}
              onAddTask={PROFILE_MOCKS_ENABLED ? () => setTaskModalOpen(true) : undefined}
              onDelete={handleDelete}
              onStageChanged={profile.setStage}
            />
          </div>

          <ContactProfileLayout
            left={
              // min-h-full + accordion `grow shrink-0`: o painel estica para
              // preencher a coluna quando o conteúdo é curto (sem canto vazio),
              // mas nunca encolhe abaixo do próprio conteúdo quando é longo —
              // aí a coluna (overflow-y-auto) rola e mostra tudo.
              // Em <xl, os painéis de contexto (leitura) entram DEPOIS do
              // acordeão — os cards editáveis são o trabalho primário.
              <div className="flex flex-col gap-4 min-h-full">
                {/* F11 (SCRUM-885, prancheta 7): "Funis · N abertos" no topo, logo
                    abaixo do cabeçalho — a visão consolidada por funil. Só existe
                    com o flag (o componente some sozinho sem ele). */}
                <ContactPipelinesSection contactId={contactId} contactName={contact.displayName} className="shrink-0" />
                {/* Painel acordeão. A classe `profile-accordion` eleva os
                    cards internos para surface-800 (overlay sobre o painel
                    surface-900) via index.css — escopado à página, sem tocar
                    nos mesmos cards no drawer. Divisores em surface-700 ficam
                    visíveis nos dois temas (surface-800 = branco no claro). */}
                <div className="profile-accordion rounded-2xl border border-surface-800 bg-surface-900 divide-y divide-surface-700 overflow-hidden grow shrink-0">
                  <CollapsibleSection title="Perfil" storageKey="profile.about">
                    <ContactInfoCard contact={contact} onSave={profile.save} />
                    <QualificationCard contact={contact} onSave={profile.save} hideStage />
                  </CollapsibleSection>
                  {/* PROPOSTA do Auditor, decisão do Maestro registrada no PR:
                      a situação do contato (contacts.stage, ciclo de vida)
                      saiu deste acordeão — que antes ocupava ~2x a altura da
                      seção real de Funis logo acima e era rotulado com o
                      vocabulário de "Funil" (P15: "Situação do contato" é
                      conceito distinto de "Funil"), colidindo com o conceito
                      de Funis de negócio. Virou o StageBadge clicável no
                      cabeçalho (N1) — decisão deliberada de manter em N1
                      apesar de o P4 documentado não listar "situação" entre
                      os itens de exemplo: o problema reportado era PESO
                      VISUAL (card grande competindo com Funis), não "não
                      deveria aparecer de cara"; um badge pequeno não estoura
                      o orçamento do N1 do jeito que o card estourava, e N2
                      (acordeão) reduziria a visibilidade rápida de que
                      precisa quem quer saber se é lead ou cliente batendo o
                      olho. Reversível — ver descrição do PR. */}
                  <CollapsibleSection title="Campos personalizados" storageKey="profile.customFields">
                    <CustomFieldsCard contact={contact} onSave={profile.save} hideTitle />
                  </CollapsibleSection>
                  <CollapsibleSection title="Etiquetas e origem" storageKey="profile.marketing" count={(contact.tags ?? []).length}>
                    <TagsCard contact={contact} onAddTag={profile.addTag} onRemoveTag={profile.removeTag} />
                    <AttributionCard contact={contact} />
                  </CollapsibleSection>
                  <CollapsibleSection title="Engajamento" storageKey="profile.engagement">
                    <EngagementCard contactId={contactId} hideTitle />
                  </CollapsibleSection>
                </div>
                {!isXl && contextPanels}
              </div>
            }
            center={
              /* Painel de trabalho único de altura total: tabs fixas no topo
                 da superfície, conteúdo rolando internamente abaixo. */
              <section className="flex-1 min-h-0 flex flex-col rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
                <ProfileTabs tabs={centerTabs} active={tab} onChange={setTab} />
                {tab === 'conversations' ? (
                  <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
                    <ConversationsTab contactId={contactId} onStartConversation={() => setTemplateDrawerOpen(true)} />
                  </div>
                ) : tab === 'activity' ? (
                  <div className="flex-1 min-h-0 flex flex-col p-4 gap-4">
                    {PROFILE_MOCKS_ENABLED && <TimelineComposer onSubmit={handleAddNote} textareaRef={composerRef} />}
                    <ContactTimeline contactId={contactId} notes={notes} fillHeight />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-4">
                    {tab === 'deals' && <DealsTabMock deals={deals} />}
                    {tab === 'campaigns' && <CampaignTouchesMock touches={touches} />}
                    {tab === 'automations' && <AutomationRunsMock runs={runs} />}
                  </div>
                )}
              </section>
            }
            right={isXl ? contextPanels : null}
          />
        </>
      )}

      {/* ── Overlays ──────────────────────────────────────────────────────── */}
      <SendTemplateDrawer
        contact={contact}
        open={templateDrawerOpen}
        onClose={() => setTemplateDrawerOpen(false)}
      />

      <Modal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Nova tarefa"
        footer={
          <div className="flex items-center justify-between w-full">
            <MockBadge />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setTaskModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={handleCreateTask} disabled={!taskTitle.trim()}>
                Criar tarefa
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-surface-300">O que precisa ser feito?</span>
            <input
              autoFocus
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTask() }}
              placeholder="Ex.: Fazer follow-up da proposta"
              className="h-9 rounded-lg bg-surface-800 border border-surface-700 px-3 text-sm text-surface-100 placeholder:text-surface-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-surface-300">Prazo</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DUE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setTaskDueDays(opt.days)}
                  className={cn(
                    'px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer',
                    taskDueDays === opt.days
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                      : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-surface-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
