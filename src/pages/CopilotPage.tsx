import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import {
  Sparkles,
  Layers,
  FileText,
  Globe,
  Presentation,
  Sheet,
  BookOpen,
  ChevronDown,
  Check,
  PanelLeft,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { useCopilotSessions } from '@/hooks/useCopilotSessions'
import { useAuth } from '@/contexts/AuthContext'
import { ArtifactPanel } from '@/components/copilot/ArtifactPanel'
import { KnowledgePanel } from '@/components/copilot/KnowledgePanel'
import { ArtifactProvider, useArtifactContext } from '@/contexts/ArtifactContext'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useNavigate } from 'react-router-dom'
import type { CopilotAttachment, CopilotMessage } from '@/contexts/CopilotContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { cn } from '@/lib/utils'

import { SessionsSidebar } from '@/components/copilot/SessionsSidebar'
import { SessionChat } from '@/components/copilot/SessionChat'
import { WelcomeArea } from '@/components/copilot/WelcomeArea'

// ─── Page inner (needs ArtifactContext) ───────────────────────────────────────

function CopilotPageInner() {
  const { user } = useAuth()
  const { closeArtifact } = useArtifactContext()
  const tools: unknown[] = [] // Tools are now managed by the Agent Server

  const {
    sessions,
    activeSessionId,
    activeMessages,
    atLimit,
    nearLimit,
    createSession,
    selectSession,
    deleteSession,
    updateSessionMessages,
    updateSessionTitle,
  } = useCopilotSessions(user?.id)

  const [knowledgePanelOpen, setKnowledgePanelOpen] = useState(false)
  const [artifactsListOpen, setArtifactsListOpen] = useState(false)
  // Sessions panel: explicit open/close, persisted across sessions so the
  // user's preferred layout sticks. Default open on first visit.
  const [sessionsOpen, setSessionsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('oryon:copilot:sessions-open')
      return saved === null ? true : saved === '1'
    } catch { return true }
  })
  const pendingMessageRef = useRef<{ text: string; attachments?: CopilotAttachment[] } | null>(null)
  const { artifacts, artifact: openArtifactItem, openExisting } = useArtifactContext()
  const artifactsDropRef = useRef<HTMLDivElement>(null)

  // Persist sessions open/close
  useEffect(() => {
    try { localStorage.setItem('oryon:copilot:sessions-open', sessionsOpen ? '1' : '0') } catch { /* ignore */ }
  }, [sessionsOpen])

  // Cmd/Ctrl+B → toggle sessions panel (mirrors VS Code, Linear, Notion).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSessionsOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleToggleSessions = useCallback(() => setSessionsOpen((v) => !v), [])

  // Always show the welcome screen when navigating to Copilot from another module
  useEffect(() => {
    selectSession(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close artifacts dropdown on outside click
  useEffect(() => {
    if (!artifactsListOpen) return
    const handler = (e: MouseEvent) => {
      if (artifactsDropRef.current && !artifactsDropRef.current.contains(e.target as Node)) {
        setArtifactsListOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [artifactsListOpen])

  const handleNew = useCallback(async () => {
    if (atLimit) return
    await createSession()
  }, [atLimit, createSession])

  const handleWelcomeSend = useCallback(
    async (text: string, attachments?: CopilotAttachment[]) => {
      if (atLimit) return
      pendingMessageRef.current = { text, attachments }
      await createSession()
    },
    [atLimit, createSession]
  )

  const handleMessagesChange = useCallback(
    (id: string, msgs: CopilotMessage[]) => updateSessionMessages(id, msgs),
    [updateSessionMessages]
  )

  const handleTitleChange = useCallback(
    (id: string, title: string) => updateSessionTitle(id, title),
    [updateSessionTitle]
  )

  const handleToggleKnowledge = useCallback(() => {
    setKnowledgePanelOpen((v) => {
      if (!v) { closeArtifact(); setArtifactsListOpen(false) }
      return !v
    })
  }, [closeArtifact])

  const handleToggleArtifacts = useCallback(() => {
    setArtifactsListOpen((v) => {
      if (!v) setKnowledgePanelOpen(false)
      return !v
    })
  }, [])

  // Register topbar actions for the Copilot page
  useRegisterTopBarActions(
    <div className="flex items-center gap-1.5">

      {/* Sessões toggle — mirrors Artefatos style; controls left panel */}
      <button
        onClick={handleToggleSessions}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
          sessionsOpen
            ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
            : 'bg-surface-800/60 border-surface-700/60 text-surface-400 hover:text-surface-200 hover:border-surface-600',
        )}
        title="Conversas (Ctrl/Cmd+B)"
      >
        <PanelLeft className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Sessões</span>
        {sessions.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-brand-600/25 text-brand-300 text-[10px] font-semibold">
            {sessions.length}
          </span>
        )}
      </button>

      {/* Artefatos dropdown */}
      <div ref={artifactsDropRef} className="relative">
        <button
          onClick={handleToggleArtifacts}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
            artifactsListOpen
              ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
              : 'bg-surface-800/60 border-surface-700/60 text-surface-400 hover:text-surface-200 hover:border-surface-600',
          )}
        >
          <Layers className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Artefatos</span>
          {artifacts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-brand-600/25 text-brand-300 text-[10px] font-semibold">
              {artifacts.length}
            </span>
          )}
          <ChevronDown className={cn('w-3 h-3 flex-shrink-0 transition-transform', artifactsListOpen && 'rotate-180')} />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {artifactsListOpen && (
            <motion.div
              key="artifacts-drop"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              className="absolute right-0 top-full mt-2 w-72 overlay-surface border rounded-xl z-50 overflow-hidden py-1"
            >
              {artifacts.length === 0 ? (
                <div className="flex flex-col items-center py-8 px-4 text-center">
                  <Layers className="w-6 h-6 text-surface-600 mb-2" />
                  <p className="text-xs text-surface-500">Nenhum artefato ainda</p>
                  <p className="text-[11px] text-surface-600 mt-1 leading-relaxed">
                    Peça à IA para criar documentos, apresentações ou planilhas.
                  </p>
                </div>
              ) : (
                artifacts.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => { openExisting(art.id); setArtifactsListOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                      openArtifactItem?.id === art.id
                        ? 'bg-brand-600/15 text-brand-200'
                        : 'hover:bg-surface-800/60 text-surface-300',
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                      openArtifactItem?.id === art.id ? 'bg-brand-600/20' : 'bg-surface-800',
                    )}>
                      {art.type === 'webpage'     ? <Globe         className="w-3 h-3 text-brand-400" /> :
                       art.type === 'spreadsheet' ? <Sheet         className="w-3 h-3 text-brand-400" /> :
                       art.type === 'slides' || art.type === 'slides-json' ? <Presentation className="w-3 h-3 text-brand-400" /> :
                       <FileText className="w-3 h-3 text-surface-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate leading-snug">{art.title}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">
                        {art.type === 'slides' || art.type === 'slides-json' ? 'Apresentação' :
                         art.type === 'webpage' ? 'Landing Page' :
                         art.type === 'spreadsheet' ? 'Planilha' : 'Documento'}
                      </p>
                    </div>
                    {openArtifactItem?.id === art.id && (
                      <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={handleToggleKnowledge}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
          knowledgePanelOpen
            ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
            : 'bg-surface-800/60 border-surface-700/60 text-surface-400 hover:text-surface-200 hover:border-surface-600',
        )}
        title="Base de conhecimento"
      >
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Base de conhecimento</span>
      </button>
    </div>,
    [knowledgePanelOpen, artifactsListOpen, sessionsOpen, sessions.length, artifacts, openArtifactItem, handleToggleKnowledge, handleToggleArtifacts, handleToggleSessions, openExisting],
  )

  const currentUser = user
    ? { firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }
    : undefined

  return (
    <>
      <SessionsSidebar
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        atLimit={atLimit}
        nearLimit={nearLimit}
        onNew={handleNew}
        onSelect={selectSession}
        onDelete={deleteSession}
      />

      <div className="relative flex-1 flex min-w-0 overflow-hidden bg-surface-950">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeSessionId ? (
            <SessionChat
              key={activeSessionId}
              sessionId={activeSessionId}
              sessionTitle={sessions.find((s) => s.id === activeSessionId)?.title ?? 'Nova conversa'}
              initialMessages={activeMessages}
              onMessagesChange={handleMessagesChange}
              onTitleChange={handleTitleChange}
              tools={tools}
              autoSendMessage={pendingMessageRef.current ?? undefined}
              onAutoSendConsumed={() => { pendingMessageRef.current = null }}
            />
          ) : (
            <WelcomeArea
              onSend={handleWelcomeSend}
              atLimit={atLimit}
              onNew={handleNew}
              onOpenKnowledge={handleToggleKnowledge}
              userId={user?.id}
            />
          )}
        </div>

        {/* Knowledge panel — slides in from the right */}
        <KnowledgePanel
          isOpen={knowledgePanelOpen}
          onClose={() => setKnowledgePanelOpen(false)}
          tenantId={user?.tenantId}
        />

        {/* Artifact panel — slides in from the right */}
        <ArtifactPanel />
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CopilotPage() {
  return (
    <ArtifactProvider>
      <CopilotPageMobileGuard />
    </ArtifactProvider>
  )
}

function CopilotPageMobileGuard() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  if (isMobile) {
    return (
      <MobileFeatureGate
        open
        onClose={() => navigate('/home')}
        featureName="Copilot AI"
        description="Copilot tem painel de sessões + chat + área de artifacts (documentos, código, slides) lado a lado. O modelo split-panel não cabe em viewport estreita. Abra no desktop para usar o assistente com tudo à mão."
      />
    )
  }

  return <CopilotPageInner />
}
