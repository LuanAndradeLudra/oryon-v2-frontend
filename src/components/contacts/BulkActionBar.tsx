import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronUp, ChevronRight, X, Trash2, MoreHorizontal, Tag as TagIcon, TagsIcon,
  Download, Megaphone, Contact as ContactIcon,
} from 'lucide-react'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { cn } from '@/lib/utils'
import type { Contact, Tag } from '@/types'

interface BulkActionBarProps {
  count: number
  selectedContacts: Contact[]
  tags: Tag[]
  onMoveStage: (stage: string) => void
  onAddTag?: (tag: Tag) => void | Promise<void>
  onRemoveTag?: (tagId: string) => void | Promise<void>
  onCreateCampaign?: () => void
  onDelete?: () => void
  onClear: () => void
}

type HoveredSub = 'addTag' | 'removeTag' | null

export function BulkActionBar({
  count,
  selectedContacts,
  tags,
  onMoveStage,
  onAddTag,
  onRemoveTag,
  onCreateCampaign,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  const { stages } = useCRMConfig()
  const [stageMenuOpen, setStageMenuOpen] = useState(false)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [hoveredSub, setHoveredSub] = useState<HoveredSub>(null)
  const stageMenuRef = useRef<HTMLDivElement>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const subCloseTimer = useRef<number | null>(null)

  // Close dropdowns on outside click.
  useEffect(() => {
    if (!stageMenuOpen && !actionsMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (stageMenuOpen && stageMenuRef.current && !stageMenuRef.current.contains(e.target as Node)) {
        setStageMenuOpen(false)
      }
      if (actionsMenuOpen && actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false)
        setHoveredSub(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [stageMenuOpen, actionsMenuOpen])

  // Reset submenu state whenever the parent dropdown closes.
  useEffect(() => {
    if (!actionsMenuOpen) setHoveredSub(null)
  }, [actionsMenuOpen])

  // Submenu hover helpers. The 120ms delay on close keeps the flyout alive
  // while the cursor travels from the trigger row into the submenu panel.
  const cancelSubClose = () => {
    if (subCloseTimer.current) {
      window.clearTimeout(subCloseTimer.current)
      subCloseTimer.current = null
    }
  }
  const openSub = (which: Exclude<HoveredSub, null>) => {
    cancelSubClose()
    setHoveredSub(which)
  }
  const scheduleSubClose = () => {
    cancelSubClose()
    subCloseTimer.current = window.setTimeout(() => setHoveredSub(null), 120)
  }
  useEffect(() => () => cancelSubClose(), [])

  // Tags already present on at least one selected contact — the removal
  // picker only shows these (no point offering to remove a tag nobody has).
  const presentTagIds = useMemo(() => {
    const set = new Set<string>()
    for (const c of selectedContacts) {
      for (const t of c.tags ?? []) set.add(t.id)
    }
    return set
  }, [selectedContacts])
  const presentTags = useMemo(
    () => tags.filter((t) => presentTagIds.has(t.id)),
    [tags, presentTagIds],
  )

  // ── Pure-frontend actions ────────────────────────────────────────────────

  // Build a single vCard 3.0 multi-record payload. Importable by Google
  // Contacts, Apple Contacts, Outlook — carries name, phones, email, company
  // and job title, far more than just "the phone number on a clipboard".
  const handleExportVCard = () => {
    const escape = (v: string) => v.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n')
    const vcards = selectedContacts.map((c) => {
      const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
      lines.push(`FN:${escape(c.displayName || '')}`)
      // N: Family;Given;Additional;Prefix;Suffix — use the best-effort split.
      const parts = (c.displayName || '').trim().split(/\s+/)
      const given = parts.shift() ?? ''
      const family = parts.join(' ')
      lines.push(`N:${escape(family)};${escape(given)};;;`)
      if (c.waId) lines.push(`TEL;TYPE=CELL,WHATSAPP:+${c.waId}`)
      if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${escape(c.email)}`)
      if (c.company) lines.push(`ORG:${escape(c.company)}`)
      if (c.jobTitle) lines.push(`TITLE:${escape(c.jobTitle)}`)
      if (c.id) lines.push(`UID:${c.id}`)
      lines.push('END:VCARD')
      return lines.join('\r\n')
    })
    const blob = new Blob([vcards.join('\r\n') + '\r\n'], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contatos-${new Date().toISOString().slice(0, 10)}.vcf`
    a.click()
    URL.revokeObjectURL(url)
    setActionsMenuOpen(false)
  }

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-surface-800 border border-surface-700 rounded-xl shadow-2xl',
        'flex items-center gap-2 pl-4 pr-2 py-2',
      )}
    >
      <div className="text-sm text-surface-200">
        <span className="font-semibold text-brand-300">{count}</span>
        {' '}
        {count === 1 ? 'selecionado' : 'selecionados'}
      </div>

      <div className="h-5 w-px bg-surface-700" />

      {/* Mover para */}
      <div ref={stageMenuRef} className="relative">
        <button
          type="button"
          onClick={() => { setStageMenuOpen((v) => !v); setActionsMenuOpen(false) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-surface-100 rounded-lg hover:bg-surface-700 transition-colors"
        >
          Mover para
          <ChevronUp className={cn('w-3.5 h-3.5 transition-transform', stageMenuOpen ? '' : 'rotate-180')} />
        </button>
        {stageMenuOpen && (
          <div
            className={cn(
              'absolute bottom-full mb-2 left-0',
              'min-w-[220px] max-h-64 overflow-y-auto',
              'bg-surface-800 border border-surface-700 rounded-xl shadow-2xl py-1',
            )}
          >
            {stages.length === 0 && (
              <div className="px-3 py-2 text-xs text-surface-500">Nenhum estágio configurado</div>
            )}
            {stages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => { setStageMenuOpen(false); onMoveStage(stage.key) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-surface-200 hover:bg-surface-700 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                <span className="truncate">{stage.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mais ações */}
      {(onAddTag || onRemoveTag || onCreateCampaign) && (
        <div ref={actionsMenuRef} className="relative">
          <button
            type="button"
            onClick={() => { setActionsMenuOpen((v) => !v); setStageMenuOpen(false) }}
            title="Mais ações"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-surface-100 rounded-lg hover:bg-surface-700 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {actionsMenuOpen && (
            <div
              className={cn(
                'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
                // No overflow here so tag submenus can fly out to the side.
                'min-w-[240px]',
                'bg-surface-800 border border-surface-700 rounded-xl shadow-2xl py-1',
              )}
            >
              {onAddTag && (
                <SubmenuRow
                  label="Adicionar tag"
                  icon={TagIcon}
                  active={hoveredSub === 'addTag'}
                  onEnter={() => openSub('addTag')}
                  onLeave={scheduleSubClose}
                >
                  {tags.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-surface-500 whitespace-nowrap">
                      Nenhuma tag cadastrada.
                    </div>
                  ) : (
                    tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onAddTag(t)
                          setActionsMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-surface-200 hover:bg-surface-700 transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))
                  )}
                </SubmenuRow>
              )}
              {onRemoveTag && (
                <SubmenuRow
                  label="Remover tag"
                  icon={TagsIcon}
                  active={hoveredSub === 'removeTag'}
                  disabled={presentTags.length === 0}
                  title={presentTags.length === 0 ? 'Nenhuma tag presente na seleção' : undefined}
                  onEnter={() => {
                    if (presentTags.length === 0) setHoveredSub(null)
                    else openSub('removeTag')
                  }}
                  onLeave={scheduleSubClose}
                >
                  {presentTags.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-surface-500 whitespace-nowrap">
                      Nenhuma tag presente na seleção.
                    </div>
                  ) : (
                    presentTags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onRemoveTag(t.id)
                          setActionsMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-surface-200 hover:bg-surface-700 transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))
                  )}
                </SubmenuRow>
              )}
              {onCreateCampaign && (
                <>
                  <div className="my-1 h-px bg-surface-700" />
                  <button
                    type="button"
                    onMouseEnter={scheduleSubClose}
                    onClick={() => { onCreateCampaign(); setActionsMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-surface-200 hover:bg-surface-700 transition-colors"
                  >
                    <Megaphone className="w-3.5 h-3.5 flex-shrink-0 text-brand-300" />
                    <span className="flex-1 truncate">Criar campanha com selecionados</span>
                  </button>
                </>
              )}
              <div className="my-1 h-px bg-surface-700" />
              <button
                type="button"
                onMouseEnter={scheduleSubClose}
                onClick={handleExportVCard}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-surface-200 hover:bg-surface-700 transition-colors"
              >
                <ContactIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 truncate">Exportar contatos (vCard)</span>
                <Download className="w-3 h-3 flex-shrink-0 text-surface-500" />
              </button>
            </div>
          )}
        </div>
      )}

      {onDelete && (
        <>
          <div className="h-5 w-px bg-surface-700" />
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-danger rounded-lg hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onClear}
        aria-label="Limpar seleção"
        className="p-1.5 text-surface-400 hover:text-surface-100 hover:bg-surface-700 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ── Submenu row ──────────────────────────────────────────────────────────────
// Renders a row in the actions dropdown whose hover reveals a flyout panel to
// the right. The flyout inherits lifecycle from the parent — it closes when
// the parent dropdown closes (hoveredSub is reset in a useEffect above) or
// when scheduleSubClose fires after the cursor leaves both the row and the
// flyout.

interface SubmenuRowProps {
  label: string
  icon: React.ElementType
  active: boolean
  disabled?: boolean
  title?: string
  onEnter: () => void
  onLeave: () => void
  children: React.ReactNode
}

function SubmenuRow({
  label, icon: Icon, active, disabled, title, onEnter, onLeave, children,
}: SubmenuRowProps) {
  return (
    <div
      className="relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        disabled={disabled}
        title={title}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-surface-200 transition-colors',
          !disabled && 'hover:bg-surface-700',
          active && !disabled && 'bg-surface-700',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-surface-500" />
      </button>
      {active && !disabled && (
        <div
          className={cn(
            'absolute left-full top-0 ml-1 z-10',
            'min-w-[200px] max-h-64 overflow-y-auto',
            'bg-surface-800 border border-surface-700 rounded-xl shadow-2xl py-1',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}
