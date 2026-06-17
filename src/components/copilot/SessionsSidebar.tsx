import { useCallback, useState } from 'react'
import { ConfirmModal } from '@/components/ui/Modal'
import {
  Plus,
  Search,
  Trash2,
  Globe,
  FileText,
  Presentation,
  Sheet,
  ExternalLink,
  Copy,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { ARTIFACT_LABELS, type CopilotSession } from '@/hooks/useCopilotSessions'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { cn } from '@/lib/utils'

// ─── Group by date ───────────────────────────────────────────────────────────

function groupByDate(sessions: CopilotSession[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)
  const monthAgo = new Date(today.getTime() - 30 * 86_400_000)

  const groups: { label: string; items: CopilotSession[] }[] = [
    { label: 'Hoje', items: [] },
    { label: 'Ontem', items: [] },
    { label: 'Últimos 7 dias', items: [] },
    { label: 'Últimos 30 dias', items: [] },
    { label: 'Mais antigas', items: [] },
  ]

  for (const s of sessions) {
    const d = new Date(s.updatedAt)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) groups[0].items.push(s)
    else if (day >= yesterday) groups[1].items.push(s)
    else if (d >= weekAgo) groups[2].items.push(s)
    else if (d >= monthAgo) groups[3].items.push(s)
    else groups[4].items.push(s)
  }

  return groups.filter((g) => g.items.length > 0)
}

// ─── Session preview renderer ─────────────────────────────────────────────────

const ARTIFACT_ICON_CONFIG: Record<string, { icon: React.ReactElement; color: string }> = {
  webpage:     { icon: <Globe className="w-2.5 h-2.5 flex-shrink-0" />,        color: 'text-sky-400' },
  slides:      { icon: <Presentation className="w-2.5 h-2.5 flex-shrink-0" />, color: 'text-purple-400' },
  spreadsheet: { icon: <Sheet className="w-2.5 h-2.5 flex-shrink-0" />,        color: 'text-emerald-400' },
  document:    { icon: <FileText className="w-2.5 h-2.5 flex-shrink-0" />,     color: 'text-amber-400' },
}

function SessionPreview({ preview }: { preview: string }) {
  // New format: __artifact:<type>__
  const tokenMatch = preview.match(/^__artifact:(\w+)__$/)
  if (tokenMatch) {
    const cfg = ARTIFACT_ICON_CONFIG[tokenMatch[1]] ?? ARTIFACT_ICON_CONFIG.document
    return (
      <span className={cn('inline-flex items-center gap-1', cfg.color)}>
        {cfg.icon}
        <span>{ARTIFACT_LABELS[tokenMatch[1]] ?? 'Artefato'}</span>
      </span>
    )
  }
  // Legacy format: raw artifact tag still stored in preview
  const legacyMatch = preview.match(/^<(webpage|slides|spreadsheet|document)>/)
  if (legacyMatch) {
    const cfg = ARTIFACT_ICON_CONFIG[legacyMatch[1]] ?? ARTIFACT_ICON_CONFIG.document
    return (
      <span className={cn('inline-flex items-center gap-1', cfg.color)}>
        {cfg.icon}
        <span>{ARTIFACT_LABELS[legacyMatch[1]] ?? 'Artefato'}</span>
      </span>
    )
  }
  return <span>{preview}</span>
}

// ─── Session row (extracted to use the context menu hook) ────────────────────

function SessionItemRow({
  session,
  active,
  hovered,
  onHoverChange,
  onSelect,
  onDeleteRequest,
}: {
  session: CopilotSession
  active: boolean
  hovered: boolean
  onHoverChange: (id: string | null) => void
  onSelect: (id: string) => void
  onDeleteRequest: (id: string) => void
}) {
  const buildContextMenu = useCallback((): ContextMenuEntry[] => [
    { label: 'Abrir sessão', icon: ExternalLink, onClick: () => onSelect(session.id) },
    {
      label: 'Copiar título',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(session.title).catch(() => {}),
    },
    { separator: true },
    { label: 'Excluir', icon: Trash2, danger: true, onClick: () => onDeleteRequest(session.id) },
  ], [session, onSelect, onDeleteRequest])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <div
      onMouseEnter={() => onHoverChange(session.id)}
      onMouseLeave={() => onHoverChange(null)}
      onContextMenu={onContextMenu}
      className={cn(
        'relative px-3 py-2.5 rounded-xl cursor-pointer transition-colors mb-0.5',
        active
          ? 'bg-brand-600/12 border border-brand-500/15'
          : 'hover:bg-surface-800/50',
      )}
      onClick={() => onSelect(session.id)}
    >
      <p className={cn(
        'text-xs font-medium leading-snug truncate pr-6',
        active ? 'text-surface-50' : 'text-surface-200',
      )}>
        {session.title}
      </p>
      {session.preview && (
        <p className="text-[10px] text-surface-500 truncate mt-0.5 pr-7">
          <SessionPreview preview={session.preview} />
        </p>
      )}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(session.id) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-surface-500 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sessions sidebar ─────────────────────────────────────────────────────────

export interface SessionsSidebarProps {
  /** Controlled open/close — toggled via header button or Cmd/Ctrl+B. */
  open: boolean
  /** Called when the user clicks the inline X to close the panel. */
  onClose: () => void
  sessions: CopilotSession[]
  activeSessionId: string | null
  atLimit: boolean
  nearLimit: boolean
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

const SIDEBAR_WIDTH = 320

export function SessionsSidebar({
  open,
  onClose,
  sessions,
  activeSessionId,
  atLimit,
  nearLimit,
  onNew,
  onSelect,
  onDelete,
}: SessionsSidebarProps) {
  const [search, setSearch] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = search.trim()
    ? sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.preview.toLowerCase().includes(search.toLowerCase())
      )
    : sessions

  const groups = groupByDate(filtered)

  return (
    <motion.div
      animate={{ width: open ? SIDEBAR_WIDTH : 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
      className="flex-shrink-0 flex flex-col border-r border-surface-800/60 bg-surface-950 overflow-hidden"
      style={{ minWidth: 0 }}
      // No hover handlers — sidebar is now controlled exclusively by the
      // toggle button in the topbar (and Cmd/Ctrl+B). This eliminates the
      // accidental open/close when the mouse passes near the edge.
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1 min-h-0"
            style={{ width: SIDEBAR_WIDTH }}
          >
            {/* Top bar: label + actions */}
            <div className="px-3 pt-4 pb-0 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider px-1">Conversas</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-surface-500 bg-surface-800/80 px-1.5 py-0.5 rounded-full">
                    {sessions.length}/30
                  </span>
                  <button
                    onClick={onNew}
                    disabled={atLimit}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Nova conversa"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                    title="Fechar painel (Ctrl/Cmd+B)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-200 placeholder:text-surface-500 outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/15"
                />
              </div>
              {nearLimit && (
                <p className="mb-2 text-[10px] text-amber-400/80 leading-relaxed">
                  {atLimit
                    ? 'Limite de 30 conversas atingido.'
                    : `${30 - sessions.length} restante(s) antes do limite.`}
                </p>
              )}
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {groups.length === 0 ? (
                <p className="text-xs text-surface-500 text-center pt-10 px-4">
                  {search ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda.'}
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.label} className="mb-2">
                    <p className="text-[10px] font-medium text-surface-500 uppercase tracking-wider px-2 py-1.5">
                      {group.label}
                    </p>
                    {group.items.map((session) => (
                      <SessionItemRow
                        key={session.id}
                        session={session}
                        active={activeSessionId === session.id}
                        hovered={hovered === session.id}
                        onHoverChange={setHovered}
                        onSelect={onSelect}
                        onDeleteRequest={setDeleteTarget}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { onDelete(deleteTarget); setDeleteTarget(null) } }}
        title="Excluir sessão"
        description="Esta ação é irreversível. Todo o histórico de mensagens desta sessão será excluído permanentemente."
        confirmLabel="Excluir sessão"
        danger
      />
    </motion.div>
  )
}
