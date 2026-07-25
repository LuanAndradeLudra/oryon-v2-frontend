import { useState, useRef, useEffect, useMemo, memo } from 'react'
import {
  ChevronDown, ChevronRight, ChevronLeft, Loader2, CheckCircle2,
  Sparkles, Copy, Check, Code2, Table2, ListOrdered, FileText, ExternalLink,
  Globe, Presentation, Sheet, Link2, Search,
  ShieldAlert, XCircle, UserPlus, UserCog, MessageSquare, Tag, Send,
  Trash2, Layers, Megaphone, Rocket, CheckCheck, Pencil, Workflow, BarChart3, Bot, Wrench,
  Phone, CornerDownLeft, ImageIcon, AlertTriangle, Clock, Users, Palette, Mail, Building2, Hash,
  BookOpen, HelpCircle, Shield, Plus, Minus, FilePlus, FilePenLine, FileMinus, PlayCircle, PauseCircle, RefreshCw,
} from 'lucide-react'
import { CopilotMark } from '@/lib/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getReadableTextColor } from '@/lib/colorPalette'
import { useArtifactContext } from '@/contexts/ArtifactContext'
import type { ArtifactType } from '@/contexts/ArtifactContext'
import type { CopilotAttachment, CopilotMessage, ToolCallRecord } from '@/contexts/CopilotContext'
import { PlanCard } from './PlanCard'
import { WhatsappLineRow } from './WhatsappLineRow'
import {
  parseContent,
  stripInline,
  stripHeading,
  isHeadingLine,
  extractArtifactContent,
  extractTitle,
  detectArtifactType,
  parseCitations,
  stripCitations,
} from '@/lib/copilotParser'
import {
  SystemPromptApprovalPreview,
  KnowledgeDocApprovalPreview,
  HandoffRuleApprovalPreview,
  AgentConfigApprovalPreview,
  AgentFaqApprovalPreview,
  AgentToolHttpApprovalPreview,
  CompanyBrainApprovalPreview,
} from './AgentBuilderApprovalPreviews'
import { InChatApprovalChip } from './PendingApprovalBar'

// ─── Shared Copilot icon (used in header + thinking indicator) ────────────────

export function CopilotIcon({ spinning = false, size = 'sm' }: { spinning?: boolean; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'w-9 h-9' : 'w-6 h-6'
  const icon = size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
  return (
    <div className={`${dims} rounded-full copilot-icon flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-900/40`}>
      <div
        style={spinning
          ? { animation: 'copilot-spin 3s linear infinite' }
          : { transition: 'transform 0.4s ease-out' }
        }
      >
        <CopilotMark className={`${icon} text-white`} />
      </div>
    </div>
  )
}

// ─── Thinking / status label (replaces blinking cursor while AI is working) ───

const TOOL_STATUS_LABELS: Record<string, string> = {
  list_contacts:          'Buscando contatos',
  get_contact_details:    'Lendo contato',
  list_conversations:     'Buscando conversas',
  get_activity_feed:      'Lendo feed de atividade',
  get_recent_messages:    'Lendo mensagens recentes',
  get_home_stats:         'Carregando métricas',
  get_pending_leads:      'Verificando leads pendentes',
  list_campaigns:         'Buscando campanhas',
  get_campaign_report:    'Analisando campanha',
  list_templates:         'Buscando templates',
  list_stages:            'Lendo pipeline',
  list_tags:              'Buscando etiquetas',
  list_automations:       'Lendo automações',
  web_search:             'Pesquisando na web',
  web_fetch:              'Acessando página',
  create_contact:         'Criando contato',
  update_contact:         'Atualizando contato',
  send_message:           'Enviando mensagem',
  assign_conversation:    'Atribuindo conversa',
  create_campaign:        'Criando campanha',
  send_campaign:          'Disparando campanha',
  query_design_system:    'Buscando design system',
}

interface ThinkingLabelProps {
  toolCalls?: ToolCallRecord[]
  /** Read directly from message.statusLabel — the most reliable source */
  messageStatusLabel?: string
  agentLabel?: string | null
  toolLabel?: string | null
}

function ThinkingLabel({ toolCalls, messageStatusLabel, agentLabel, toolLabel }: ThinkingLabelProps) {
  // Priority: message.statusLabel > agentLabel prop > running tool > "Pensando"
  const runningTool = toolCalls?.slice().reverse().find(tc => tc.status === 'running')
  const toolStatusLabel = runningTool ? (TOOL_STATUS_LABELS[runningTool.name] ?? 'Processando') : null

  const primaryLabel = messageStatusLabel || agentLabel || toolStatusLabel || toolLabel || 'Pensando'
  const secondaryLabel = (messageStatusLabel || agentLabel) && toolStatusLabel
    ? toolStatusLabel
    : null

  const completedCount = toolCalls?.filter(tc => tc.status === 'done').length ?? 0

  return (
    <div className="flex flex-col gap-1 py-0.5">
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={primaryLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-surface-400"
          >
            {primaryLabel}
          </motion.span>
        </AnimatePresence>
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-surface-500"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
      {/* Secondary line: tool detail when agent is active */}
      {secondaryLabel && (
        <motion.span
          key={secondaryLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-surface-600 ml-0.5"
        >
          {secondaryLabel}
        </motion.span>
      )}
      {/* Completed tools counter */}
      {completedCount > 0 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-surface-600 ml-0.5 flex items-center gap-1"
        >
          <CheckCircle2 className="w-2.5 h-2.5 text-status-active" />
          {completedCount} {completedCount === 1 ? 'etapa concluída' : 'etapas concluídas'}
        </motion.span>
      )}
    </div>
  )
}

// ─── Streaming cursor ──────────────────────────────────────────────────────────

function StreamingCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] bg-surface-400 ml-[1px] align-[-0.1em]"
      style={{ animation: 'copilot-blink 1s step-start infinite' }}
    />
  )
}

const INJECTED_STYLES = `
@keyframes copilot-blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
@keyframes copilot-char-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes copilot-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
`
if (typeof document !== 'undefined' && !document.getElementById('copilot-blink-style')) {
  const el = document.createElement('style')
  el.id = 'copilot-blink-style'
  el.textContent = INJECTED_STYLES
  document.head.appendChild(el)
}

// ─── Prose renderer ────────────────────────────────────────────────────────────

function RenderProse({ lines }: { lines: string[] }) {
  const nodes: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    const t = line.trim()
    if (!t) { nodes.push(<div key={key++} className="h-2" />); continue }
    if (t === '---' || t === '***' || t === '___') {
      nodes.push(<hr key={key++} className="border-surface-800 my-2" />)
      continue
    }
    if (isHeadingLine(t)) {
      nodes.push(
        <p key={key++} className="text-sm font-semibold text-surface-100 mt-2 first:mt-0 leading-snug">
          {stripInline(stripHeading(t))}
        </p>
      )
      continue
    }
    // Phase 17: lines that look like friendly errors render as a red card.
    if (isErrorLine(t)) {
      nodes.push(<ErrorCard key={key++} text={stripInline(t.replace(/^[⚠️❌]\s*/u, ''))} />)
      continue
    }
    // Phase 10: extract citation markers and strip them from visible text
    const cites = parseCitations(t)
    const rawClean = stripCitations(t.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''))
    const clean = stripInline(rawClean)
    nodes.push(
      <p key={key++} className="text-sm text-surface-200 leading-relaxed">
        {clean}
        {cites.length > 0 && (
          <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
            {cites.map((c, i) => (
              <CitationChip key={i} tool={c.tool} />
            ))}
          </span>
        )}
      </p>,
    )
  }

  return <div className="flex flex-col gap-1.5">{nodes}</div>
}

// Phase 17: friendly-error detection. Matches lines produced by friendlyError()
// on the agent-server (always prefixed with ⚠️ or ❌) plus a few common
// pt-BR phrases that clearly signal an error to the user.
const ERROR_HINT_PATTERNS: RegExp[] = [
  /^⚠️/u,
  /^❌/u,
  /^Ocorreu um erro/i,
  /^Falha de autentica/i,
  /^Limite temporário/i,
  /^IA sobrecarregada/i,
  /^Serviço de IA indispon/i,
  /^Tempo limite/i,
  /^Não foi possível conectar/i,
]
function isErrorLine(t: string): boolean {
  return ERROR_HINT_PATTERNS.some((re) => re.test(t))
}

function ErrorCard({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 my-1">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
      <p className="text-sm leading-relaxed text-danger">{text}</p>
    </div>
  )
}

// Phase 10: compact chip for an inline [Fonte: tool_name] citation.
function CitationChip({ tool }: { tool: string }) {
  return (
    <span
      title={`Fonte: ${tool}`}
      className="inline-flex items-center gap-1 rounded bg-surface-800/70 px-1.5 py-0.5 text-[10px] font-medium text-surface-400 align-middle"
    >
      <Search className="w-2.5 h-2.5" />
      {tool}
    </span>
  )
}

// ─── Inline artifact renderers (collapsed) ────────────────────────────────────

function InlineCode({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false)
  const lines = content.split('\n')
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl overflow-hidden border border-surface-700/40 bg-surface-900/50 my-1.5">
      <div className="flex items-center gap-3 px-4 py-3">
        <Code2 className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
        <span className="text-[13px] font-medium text-surface-200 flex-1">{lang}</span>
        <span className="text-[10px] text-surface-500 font-mono">{lines.length} linhas</span>
        <button
          onClick={() => navigator.clipboard.writeText(content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })}
          className="p-1 rounded text-surface-500 hover:text-surface-300 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-status-active" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-surface-700/50 hover:border-surface-600 hover:bg-surface-800/50 transition-colors"
        >
          <span className="text-[11px] font-medium text-brand-400">{open ? 'Fechar' : 'Abrir'}</span>
          {open ? <ChevronDown className="w-3 h-3 text-surface-500" /> : <ChevronRight className="w-3 h-3 text-surface-500" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="code"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-800/50">
              <pre className="text-xs font-mono text-surface-300 px-4 py-4 overflow-x-auto leading-relaxed">
                <code>{content}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InlinePlan({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden border border-brand-500/15 bg-surface-900/50 my-1.5">
      <div className="flex items-center gap-3 px-4 py-3">
        <ListOrdered className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
        <span className="text-[13px] font-medium text-surface-200 flex-1">{title}</span>
        <span className="text-[10px] text-surface-500">{items.length} etapas</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-surface-700/50 hover:border-surface-600 hover:bg-surface-800/50 transition-colors"
        >
          <span className="text-[11px] font-medium text-brand-400">{open ? 'Fechar' : 'Abrir'}</span>
          {open ? <ChevronDown className="w-3 h-3 text-surface-500" /> : <ChevronRight className="w-3 h-3 text-surface-500" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="plan"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-800/50 px-4 py-4 flex flex-col gap-3">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-600/15 border border-brand-500/25 flex items-center justify-center text-[10px] font-bold text-brand-400 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-surface-200 leading-snug flex-1">{stripInline(item)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InlineTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden border border-surface-700/40 bg-surface-900/50 my-1.5">
      <div className="flex items-center gap-3 px-4 py-3">
        <Table2 className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
        <span className="text-[13px] font-medium text-surface-200 flex-1">Tabela</span>
        <span className="text-[10px] text-surface-500">{rows.length} linhas</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-surface-700/50 hover:border-surface-600 hover:bg-surface-800/50 transition-colors"
        >
          <span className="text-[11px] font-medium text-brand-400">{open ? 'Fechar' : 'Abrir'}</span>
          {open ? <ChevronDown className="w-3 h-3 text-surface-500" /> : <ChevronRight className="w-3 h-3 text-surface-500" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="table"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-800/50 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-800">
                    {headers.map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left font-semibold text-surface-300 whitespace-nowrap">
                        {stripInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className={cn('border-b border-surface-800/40 last:border-0', ri % 2 === 1 && 'bg-surface-800/20')}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2.5 text-surface-300 leading-snug">{stripInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Artifact type helpers ─────────────────────────────────────────────────────

function artifactBuildLabel(type: ArtifactType): string {
  if (type === 'webpage')     return 'Criando Landing Page'
  if (type === 'spreadsheet') return 'Criando Planilha'
  if (type === 'slides')      return 'Criando Apresentação'
  return 'Criando o Documento'
}

function artifactTypeLabel(type: ArtifactType): string {
  if (type === 'webpage')     return 'Landing Page'
  if (type === 'spreadsheet') return 'Planilha'
  if (type === 'slides')      return 'Apresentação'
  return 'Documento'
}

function ArtifactTypeIcon({ type, className }: { type: ArtifactType; className?: string }) {
  if (type === 'webpage')     return <Globe className={className} />
  if (type === 'spreadsheet') return <Sheet className={className} />
  if (type === 'slides')      return <Presentation className={className} />
  return <FileText className={className} />
}

// ─── Artifact states ───────────────────────────────────────────────────────────

// Shown while the model is writing an artifact response
function ArtifactBuilding({ content, type }: { content: string; type: ArtifactType }) {
  const [expanded, setExpanded] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // Auto-scroll preview to bottom as content grows
  useEffect(() => {
    if (expanded && previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight
    }
  }, [content, expanded])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-surface-700/40 bg-surface-900/50 overflow-hidden"
    >
      {/* Header row — clickable to expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-800/30 transition-colors text-left"
      >
        <CopilotIcon spinning size="md" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-surface-300">{artifactBuildLabel(type)}</span>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="text-sm text-surface-500"
            >
              …
            </motion.span>
          </div>
          {/* Animated progress bar */}
          <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-600 to-violet-600 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '60%' }}
            />
          </div>
        </div>
        <div className="flex-shrink-0 ml-2 text-surface-500">
          {expanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable raw content preview */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-800/50">
              <div
                ref={previewRef}
                className="max-h-72 overflow-y-auto px-4 py-3 scroll-smooth"
              >
                <pre className="text-[11px] font-mono text-surface-400 leading-relaxed whitespace-pre-wrap break-words">
                  {content || ' '}
                  <span
                    className="inline-block w-[2px] h-[0.9em] bg-brand-400 ml-[1px] align-[-0.05em]"
                    style={{ animation: 'copilot-blink 1s step-start infinite' }}
                  />
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Compact card shown in chat after the artifact is ready
function ArtifactCard({ content, title, type }: { content: string; title: string; type: ArtifactType }) {
  const { openArtifact, registerArtifact, artifacts, setArtifactVersion } = useArtifactContext()
  const wordCount = content.trim().split(/\s+/).length

  // Locate this specific content inside the versioned store so the card
  // knows which ArtifactItem + version it represents.
  const registeredRef = useRef<{ itemId: string; versionIndex: number } | null>(null)
  const match = artifacts.find((a) => a.versions.some((v) => v.content === content))
  const matchVersion = match ? match.versions.findIndex((v) => v.content === content) : -1

  const resolved = match && matchVersion >= 0
    ? { item: match, versionIndex: matchVersion }
    : null

  useEffect(() => {
    if (resolved) {
      registeredRef.current = { itemId: resolved.item.id, versionIndex: resolved.versionIndex }
      return
    }
    if (registeredRef.current) return
    // Cold-load of a historical session: the chat has artifact cards for
    // content that isn't in the in-memory store yet. registerArtifact seeds
    // the store (with version bookkeeping) but does NOT activate the panel
    // — otherwise opening a session with 10 artifact cards would pop the
    // panel open 10 times in sequence. The user decides when to open.
    registerArtifact(content, title, type)
  }, [content, title, type, resolved, registerArtifact])

  const totalVersions = resolved?.item.versions.length ?? 1
  const currentVersion = (resolved?.versionIndex ?? 0) + 1
  const showVersionBadge = totalVersions > 1

  const handleOpen = () => {
    if (resolved) {
      setArtifactVersion(resolved.item.id, resolved.versionIndex)
    } else {
      openArtifact(content, title, type)
    }
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleOpen}
      className="w-full text-left rounded-xl border border-surface-700/40 bg-surface-900/50 hover:border-surface-600/60 hover:bg-surface-900/80 transition-all overflow-hidden group"
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="w-9 h-9 rounded-xl bg-surface-800 border border-surface-700/50 flex items-center justify-center flex-shrink-0">
          <ArtifactTypeIcon type={type} className="w-4 h-4 text-surface-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-surface-200 truncate">{title}</p>
            {showVersionBadge && (
              <span className="flex-shrink-0 rounded bg-brand-500/15 border border-brand-500/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
                v{currentVersion}
              </span>
            )}
          </div>
          <p className="text-[11px] text-surface-500 mt-0.5">
            {wordCount} palavras · {artifactTypeLabel(type)}
            {showVersionBadge && <> · <span className="text-brand-400">versão {currentVersion} de {totalVersions}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-700/50 group-hover:border-brand-500/40 group-hover:bg-brand-600/10 transition-all flex-shrink-0">
          <ExternalLink className="w-3 h-3 text-surface-400 group-hover:text-brand-400 transition-colors" />
          <span className="text-xs font-medium text-surface-400 group-hover:text-brand-400 transition-colors">Abrir</span>
        </div>
      </div>
    </motion.button>
  )
}

// ─── Smooth streaming text ─────────────────────────────────────────────────────
// Tokens from the API arrive in irregular bursts. This component:
// 1. Buffers incoming chars and drains them at 6 chars/frame via requestAnimationFrame
//    — decouples React batch rendering from the visible output so text flows smoothly
// 2. Fades in each completed line (after its newline) with a subtle opacity+y animation
//    — the active (last) line renders bare so the cursor feels naturally typed

function AnimatedStreamLine({ line }: { line: string }) {
  const t = line.trim()
  if (!t) return <div className="h-2" />
  if (t === '---' || t === '***' || t === '___') {
    return (
      <motion.hr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="border-surface-800 my-2"
      />
    )
  }
  const isHdr = isHeadingLine(t)
  const clean = stripInline(t.replace(/^#{1,6}\s+/, '').replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''))
  return (
    <motion.p
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'text-sm leading-relaxed',
        isHdr ? 'font-semibold text-surface-100 mt-1 first:mt-0' : 'text-surface-200',
      )}
    >
      {clean}
    </motion.p>
  )
}

function StreamingText({ content }: { content: string }) {
  // displayText lags content by at most a few frames (RAF drain)
  const [displayText, setDisplayText] = useState(content)
  // freshStart: index in displayText where the most recently drained chars begin
  const [freshStart, setFreshStart] = useState(content.length)
  const displayRef  = useRef(content)
  const prevLenRef  = useRef(content.length)
  const queueRef    = useRef('')
  const rafRef      = useRef<number | null>(null)

  useEffect(() => {
    const newChars = content.slice(prevLenRef.current)
    prevLenRef.current = content.length
    if (!newChars) return

    queueRef.current += newChars

    if (rafRef.current === null) {
      const drain = () => {
        const q = queueRef.current
        if (q.length === 0) { rafRef.current = null; return }

        // 2 chars/frame ≈ 120 chars/s — smooth character-by-character reveal
        const CHARS_PER_FRAME = 2
        const prevLen = displayRef.current.length
        displayRef.current += q.slice(0, CHARS_PER_FRAME)
        queueRef.current    = q.slice(CHARS_PER_FRAME)
        setDisplayText(displayRef.current)
        setFreshStart(prevLen)

        rafRef.current = requestAnimationFrame(drain)
      }
      rafRef.current = requestAnimationFrame(drain)
    }
  }, [content])

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
  }, [])

  const lines = displayText.split('\n')
  const completedLines = lines.slice(0, -1)
  const activeLine     = lines[lines.length - 1] ?? ''
  const activeClean    = stripInline(activeLine.trim().replace(/^#{1,6}\s+/, '').replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''))
  const activeIsHdr    = isHeadingLine(activeLine.trim())

  // Compute how many chars of the active line are "fresh" (just drained this frame).
  // freshStart is an index into the raw displayText; the active line starts at
  // displayText.length - activeLine.length. We compare in cleaned-text space
  // by approximating: settled = activeClean up to the same ratio.
  const activeLineStart  = displayText.length - activeLine.length
  const freshInLine      = Math.max(0, freshStart - activeLineStart)
  // Map raw freshInLine offset into cleaned text (cleaned is always ≤ raw length)
  const cleanedFreshIdx  = Math.max(0, activeClean.length - freshInLine)
  const settledPart      = activeClean.slice(0, cleanedFreshIdx)
  const freshPart        = activeClean.slice(cleanedFreshIdx)

  return (
    <div className="flex flex-col gap-1.5">
      {completedLines.map((line, i) => (
        <AnimatedStreamLine key={i} line={line} />
      ))}
      {/* Active line: settled chars + fresh chars with per-char fade-in + cursor */}
      <p className={cn(
        'text-sm leading-relaxed',
        activeIsHdr ? 'font-semibold text-surface-100 mt-1' : 'text-surface-200',
      )}>
        {settledPart || null}
        {freshPart && (
          <span style={{ animation: 'copilot-char-in 0.12s ease-out forwards' }}>
            {freshPart}
          </span>
        )}
        <StreamingCursor />
      </p>
    </div>
  )
}

// ─── Approval system ──────────────────────────────────────────────────────────

export const TOOL_LABEL: Record<string, string> = {
  // CRM
  create_contact:          'Criar Contato',
  update_contact:          'Atualizar Contato',
  // Conversations
  assign_conversation:     'Atribuir Conversa',
  set_conversation_status: 'Alterar Status da Conversa',
  add_tag_to_conversation: 'Adicionar Etiqueta à Conversa',
  remove_tag_from_conversation: 'Remover Etiqueta da Conversa',
  transfer_conversation:   'Transferir Conversa',
  send_message:            'Enviar Mensagem',
  // Tags
  create_tag:              'Criar Etiqueta',
  update_tag:              'Atualizar Etiqueta',
  delete_tag:              'Excluir Etiqueta',
  // Stages
  create_stage:            'Criar Estágio',
  update_stage:            'Atualizar Estágio',
  delete_stage:            'Excluir Estágio',
  // Templates
  create_template:         'Criar Template WhatsApp',
  update_template:         'Atualizar Template WhatsApp',
  delete_template:         'Excluir Template WhatsApp',
  // Campaigns
  create_campaign:         'Criar Campanha',
  update_campaign:         'Atualizar Campanha',
  delete_campaign:         'Excluir Campanha',
  send_campaign:           'Disparar Campanha',
  get_campaign_report:     'Relatório da Campanha',
  // Custom fields
  create_custom_field:     'Criar Campo Personalizado',
  update_custom_field:     'Atualizar Campo Personalizado',
  delete_custom_field:     'Excluir Campo Personalizado',
  // Automations
  create_automation:       'Criar Automação',
  update_automation:       'Atualizar Automação',
  delete_automation:       'Excluir Automação',
  toggle_automation:       'Ativar/Desativar Automação',
  // Canned responses
  create_canned_response:  'Criar Resposta Rápida',
  update_canned_response:  'Atualizar Resposta Rápida',
  delete_canned_response:  'Excluir Resposta Rápida',
  // Sprint 1 — bulk + internal chat + compliance
  bulk_update_contacts_tags:    'Atualizar Tags em Lote',
  bulk_update_contacts_opt_in:  'Alterar Opt-in em Lote',
  list_internal_channels:       'Listar Canais Internos',
  send_internal_message:        'Enviar Mensagem Interna',
  get_compliance_consent_report:'Relatório de Consentimento LGPD',
  // Sprint 2 — AI-native
  summarize_conversation:         'Resumir Conversa',
  suggest_next_action:            'Sugerir Próxima Ação',
  draft_personalized_message:     'Redigir Mensagem Personalizada',
  analyze_conversation_sentiment: 'Analisar Sentimento da Conversa',
  // Agent Builder — Agent configs
  get_agent_config:                'Verificar Agente',
  get_agent_by_name:               'Buscar Agente por Nome',
  get_agent_system_prompt:         'Ler System Prompt',
  list_agents:                     'Listar Agentes',
  create_agent:                    'Criar Agente',
  delete_agent:                    'Excluir Agente',
  set_agent_status:                'Alterar Status do Agente',
  update_agent_metadata:           'Atualizar Metadados do Agente',
  // System prompt edits
  update_agent_system_prompt:      'Reescrever System Prompt',
  append_to_agent_system_prompt:   'Adicionar ao System Prompt',
  replace_in_agent_system_prompt:  'Editar Trecho do System Prompt',
  // Handoff rules
  update_agent_handoff_rules:      'Reescrever Regras de Handoff',
  add_agent_handoff_rule:          'Adicionar Regra de Handoff',
  remove_agent_handoff_rule:       'Remover Regra de Handoff',
  // AI helpers
  generate_system_prompt:          'Gerar Rascunho de Prompt',
  generate_handoff_rule:           'Gerar Regra de Handoff',
  // Custom HTTP tools
  list_agent_tools:                'Listar Ferramentas do Agente',
  create_agent_tool:               'Criar Ferramenta HTTP',
  update_agent_tool:               'Atualizar Ferramenta HTTP',
  delete_agent_tool:               'Excluir Ferramenta HTTP',
  // Knowledge base
  list_agent_knowledge_docs:       'Listar Documentos da KB',
  get_agent_knowledge_doc:         'Ler Documento da KB',
  add_agent_knowledge_doc:         'Adicionar Documento à KB',
  update_agent_knowledge_doc:      'Reescrever Documento da KB',
  append_to_agent_knowledge_doc:   'Adicionar ao Documento da KB',
  replace_in_agent_knowledge_doc:  'Editar Trecho do Documento',
  delete_agent_knowledge_doc:      'Excluir Documento da KB',
  // FAQ rules
  list_agent_faqs:                 'Listar FAQs do Agente',
  create_agent_faq:                'Criar FAQ',
  update_agent_faq:                'Atualizar FAQ',
  delete_agent_faq:                'Excluir FAQ',
  // Company Brain / Org KB
  update_company_brain:            'Atualizar Company Brain',
  get_company_knowledge_base:      'Ler Knowledge Base da Empresa',
  update_company_knowledge_base:   'Atualizar Knowledge Base da Empresa',
  sync_brain_to_rag:               'Sincronizar Brand Files com RAG',
}

export const TOOL_ICON: Record<string, React.ElementType> = {
  create_contact: UserPlus, update_contact: UserCog,
  assign_conversation: MessageSquare, set_conversation_status: MessageSquare,
  add_tag_to_conversation: Tag, remove_tag_from_conversation: Tag,
  transfer_conversation: Users,
  send_message: Send,
  create_tag: Tag, update_tag: Tag, delete_tag: Trash2,
  create_stage: Layers, update_stage: Layers, delete_stage: Trash2,
  create_template: FileText, update_template: FileText, delete_template: Trash2,
  create_campaign: Megaphone, update_campaign: Megaphone, delete_campaign: Trash2,
  send_campaign: Rocket,
  get_campaign_report: BarChart3,
  create_custom_field: Hash, update_custom_field: Hash, delete_custom_field: Trash2,
  create_automation: Workflow, update_automation: Workflow, delete_automation: Trash2,
  toggle_automation: Workflow,
  create_canned_response: MessageSquare, update_canned_response: MessageSquare, delete_canned_response: Trash2,
  // Sprint 1 — bulk + internal chat + compliance
  bulk_update_contacts_tags: Tag,
  bulk_update_contacts_opt_in: Shield,
  list_internal_channels: MessageSquare,
  send_internal_message: Send,
  get_compliance_consent_report: Shield,
  // Sprint 2 — AI-native (Sparkles for "generated by AI")
  summarize_conversation: Sparkles,
  suggest_next_action: Sparkles,
  draft_personalized_message: Sparkles,
  analyze_conversation_sentiment: Sparkles,
  // Agent Builder — agent configs
  get_agent_config: Bot, get_agent_by_name: Bot, get_agent_system_prompt: FileText, list_agents: Bot,
  create_agent: Bot, delete_agent: Trash2,
  set_agent_status: PlayCircle, update_agent_metadata: Pencil,
  // System prompt edits
  update_agent_system_prompt: FilePenLine,
  append_to_agent_system_prompt: FilePlus,
  replace_in_agent_system_prompt: Pencil,
  // Handoff rules
  update_agent_handoff_rules: Shield,
  add_agent_handoff_rule: Plus,
  remove_agent_handoff_rule: Minus,
  // AI helpers
  generate_system_prompt: Sparkles, generate_handoff_rule: Sparkles,
  // Custom HTTP tools
  list_agent_tools: Wrench, create_agent_tool: Wrench,
  update_agent_tool: Wrench, delete_agent_tool: Trash2,
  // Knowledge base
  list_agent_knowledge_docs: BookOpen, get_agent_knowledge_doc: BookOpen,
  add_agent_knowledge_doc: FilePlus, update_agent_knowledge_doc: FilePenLine,
  append_to_agent_knowledge_doc: FilePlus, replace_in_agent_knowledge_doc: Pencil,
  delete_agent_knowledge_doc: FileMinus,
  // FAQ rules
  list_agent_faqs: HelpCircle, create_agent_faq: HelpCircle,
  update_agent_faq: HelpCircle, delete_agent_faq: Trash2,
  // Company Brain / Org KB
  update_company_brain: Building2, get_company_knowledge_base: BookOpen,
  update_company_knowledge_base: BookOpen, sync_brain_to_rag: RefreshCw,
}

export const DESTRUCTIVE_TOOLS = new Set([
  'delete_tag', 'delete_stage', 'delete_template', 'delete_campaign',
  'delete_custom_field', 'delete_automation', 'delete_canned_response',
  'send_campaign',
  // Agent Builder destructives
  'delete_agent', 'delete_agent_tool', 'delete_agent_knowledge_doc', 'delete_agent_faq',
])

function formatApprovalDetails(toolName: string, input: unknown): Array<{ key: string; value: string }> {
  const inp = (input ?? {}) as Record<string, unknown>
  const fmt = (v: unknown): string => {
    if (v === null || v === undefined) return '—'
    if (Array.isArray(v)) return v.join(', ')
    return String(v)
  }
  switch (toolName) {
    case 'create_contact':
      return [
        { key: 'Nome', value: fmt(inp.displayName) },
        { key: 'WhatsApp', value: fmt(inp.waId) },
        ...(inp.email    ? [{ key: 'Email',   value: fmt(inp.email)   }] : []),
        ...(inp.company  ? [{ key: 'Empresa', value: fmt(inp.company) }] : []),
        ...(inp.stage    ? [{ key: 'Estágio', value: fmt(inp.stage)   }] : []),
      ]
    case 'update_contact':
      return [
        { key: 'Contato ID', value: fmt(inp.contactId) },
        ...(inp.stage      ? [{ key: 'Novo estágio',    value: fmt(inp.stage)      }] : []),
        ...(inp.intent     ? [{ key: 'Nova intenção',   value: fmt(inp.intent)     }] : []),
        ...(inp.leadScore  ? [{ key: 'Lead score',      value: fmt(inp.leadScore)  }] : []),
        ...(inp.displayName? [{ key: 'Novo nome',       value: fmt(inp.displayName)}] : []),
        ...(inp.addTagIds  ? [{ key: 'Tags a adicionar',value: fmt(inp.addTagIds)  }] : []),
        ...(inp.removeTagIds?[{ key: 'Tags a remover',  value: fmt(inp.removeTagIds)}] : []),
      ]
    case 'send_message':
      return [
        { key: 'Conversa ID', value: fmt(inp.conversationId) },
        { key: 'Mensagem',    value: fmt(inp.text) },
      ]
    case 'assign_conversation':
      return [
        { key: 'Conversa ID', value: fmt(inp.conversationId) },
        { key: 'Usuário ID',  value: fmt(inp.userId) ?? 'Desatribuir' },
      ]
    case 'set_conversation_status':
      return [
        { key: 'Conversa ID', value: fmt(inp.conversationId) },
        { key: 'Novo status', value: fmt(inp.status) },
      ]
    case 'add_tag_to_conversation':
      return [
        { key: 'Conversa ID', value: fmt(inp.conversationId) },
        { key: 'Tag ID',      value: fmt(inp.tagId) },
      ]
    case 'create_tag':
      return [
        { key: 'Nome',  value: fmt(inp.name) },
        { key: 'Cor',   value: fmt(inp.color) },
      ]
    case 'update_tag':
      return [
        { key: 'Tag ID', value: fmt(inp.tagId) },
        ...(inp.name  ? [{ key: 'Novo nome', value: fmt(inp.name)  }] : []),
        ...(inp.color ? [{ key: 'Nova cor',  value: fmt(inp.color) }] : []),
      ]
    case 'delete_tag':
      return [{ key: 'Tag ID', value: fmt(inp.tagId) }]
    case 'create_stage':
      return [
        { key: 'Label',    value: fmt(inp.label) },
        { key: 'Cor',      value: fmt(inp.color) },
        ...(inp.isTerminal ? [{ key: 'Terminal', value: 'Sim' }] : []),
      ]
    case 'update_stage':
      return [
        { key: 'Estágio ID', value: fmt(inp.stageId) },
        ...(inp.label      ? [{ key: 'Novo label', value: fmt(inp.label)      }] : []),
        ...(inp.color      ? [{ key: 'Nova cor',   value: fmt(inp.color)      }] : []),
        ...(inp.isTerminal !== undefined ? [{ key: 'Terminal', value: inp.isTerminal ? 'Sim' : 'Não' }] : []),
      ]
    case 'delete_stage':
      return [{ key: 'Estágio ID', value: fmt(inp.stageId) }]
    case 'create_template':
      return [
        { key: 'Nome',      value: fmt(inp.name) },
        { key: 'Categoria', value: fmt(inp.category) },
      ]
    case 'create_campaign':
      return [
        { key: 'Nome',      value: fmt(inp.name) },
        { key: 'Segmento',  value: fmt(inp.segmentType) },
      ]
    case 'send_campaign':
      return [{ key: 'Campanha ID', value: fmt(inp.campaignId) }]
    case 'update_template':
      return [
        { key: 'Template ID', value: fmt(inp.templateId) },
        ...(inp.body       ? [{ key: 'Novo corpo',     value: fmt(inp.body)       }] : []),
        ...(inp.headerText ? [{ key: 'Novo cabeçalho', value: fmt(inp.headerText) }] : []),
      ]
    case 'delete_template':
      return [{ key: 'Template ID', value: fmt(inp.templateId) }]
    case 'update_campaign':
      return [
        { key: 'Campanha ID',   value: fmt(inp.campaignId) },
        ...(inp.name        ? [{ key: 'Novo nome',         value: fmt(inp.name)        }] : []),
        ...(inp.scheduledAt ? [{ key: 'Novo agendamento',  value: fmt(inp.scheduledAt) }] : []),
      ]
    case 'delete_campaign':
      return [{ key: 'Campanha ID', value: fmt(inp.campaignId) }]
    case 'create_custom_field':
      return [
        { key: 'Label', value: fmt(inp.label) },
        { key: 'Tipo',  value: fmt(inp.type) },
        ...(inp.required ? [{ key: 'Obrigatório', value: 'Sim' }] : []),
      ]
    case 'update_custom_field':
      return [
        { key: 'Campo key', value: fmt(inp.fieldKey) },
        ...(inp.label   ? [{ key: 'Novo label',   value: fmt(inp.label)   }] : []),
        ...(inp.options ? [{ key: 'Novas opções',  value: fmt(inp.options) }] : []),
      ]
    case 'delete_custom_field':
      return [{ key: 'Campo key', value: fmt(inp.fieldKey) }]
    case 'create_automation':
      return [
        { key: 'Nome',    value: fmt(inp.name)   },
        { key: 'Tipo',    value: fmt(inp.type)   },
        { key: 'Status',  value: fmt(inp.status) },
      ]
    case 'update_automation':
      return [
        { key: 'Automação ID', value: fmt(inp.automationId) },
        ...(inp.name   ? [{ key: 'Novo nome',   value: fmt(inp.name)   }] : []),
        ...(inp.status ? [{ key: 'Novo status', value: fmt(inp.status) }] : []),
      ]
    case 'delete_automation':
      return [{ key: 'Automação ID', value: fmt(inp.automationId) }]
    case 'toggle_automation':
      return [{ key: 'Automação ID', value: fmt(inp.automationId) }]
    default:
      return Object.entries(inp).slice(0, 4).map(([k, v]) => ({ key: k, value: fmt(v) }))
  }
}

// ─── Editable field component ─────────────────────────────────────────────────

function EditableField({
  label, value, fieldKey, onChange, multiline, placeholder,
}: {
  label: string; value: string; fieldKey: string
  onChange: (key: string, val: string) => void
  multiline?: boolean; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"
        />
      )}
    </div>
  )
}

// ─── Template preview ─────────────────────────────────────────────────────────

function SelectField({
  label, value, fieldKey, options, onChange,
}: {
  label: string; value: string; fieldKey: string
  options: Array<{ value: string; label: string }>
  onChange: (key: string, val: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 focus:outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface-900 text-surface-200">{o.label}</option>
        ))}
      </select>
    </div>
  )
}

const TEMPLATE_CATEGORIES = [
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'UTILITY', label: 'Utilidade' },
  { value: 'AUTHENTICATION', label: 'Autenticação' },
]

// (`LineSelectField` was removed — the line picker is now embedded on
// the right side of `WhatsappLineRow` via its `onLineChange` prop,
// keeping the callout and the selector in a single visual unit.)

function TemplateApprovalPreview({
  input, onChange,
}: {
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  const headerType = String(input.headerType ?? '').toUpperCase()
  const body = String(input.body ?? '')
  const footer = String(input.footer ?? '')
  const mediaUrl = String(input.headerMediaUrl ?? '')
  const buttons = (input.buttons ?? []) as Array<{ type: string; text: string; url?: string }>

  // Track editable button text
  const [btnTexts, setBtnTexts] = useState<string[]>(() => buttons.map((b) => b.text))
  const handleBtnChange = (idx: number, val: string) => {
    const next = [...btnTexts]
    next[idx] = val
    setBtnTexts(next)
    // Sync buttons back to the edited input
    const updatedButtons = buttons.map((b, i) => ({ ...b, text: i === idx ? val : (next[i] ?? b.text) }))
    onChange('buttons', JSON.stringify(updatedButtons))
  }

  // ── Variable examples (bodyVariables) ──────────────────────────────
  // Meta requires an `example.body_text` array with one sample per
  // placeholder so the template reviewer can see what values the
  // customer will end up seeing. Without this, approval is rejected.
  // Surface the samples as editable inputs aligned with the {{N}} in
  // the body, not a tiny inline string — the operator needs to know
  // exactly what is submitted to Meta.
  const placeholderCount = useMemo(() => {
    const nums = new Set<number>()
    const matches = body.matchAll(/\{\{(\d+)\}\}/g)
    for (const m of matches) nums.add(parseInt(m[1] ?? '0', 10))
    return nums.size
  }, [body])

  const currentVariables = useMemo(() => {
    const raw = input.bodyVariables as unknown
    if (Array.isArray(raw)) return raw.map((v) => String(v ?? ''))
    return []
  }, [input.bodyVariables])

  // Display slots = one per placeholder in the body; pad if the LLM
  // returned fewer (operator fills the gap) and truncate if it returned
  // more (they'd be ignored by Meta anyway).
  const variableSlots = useMemo(() => {
    const slots: string[] = []
    for (let i = 0; i < placeholderCount; i++) {
      slots.push(currentVariables[i] ?? '')
    }
    return slots
  }, [placeholderCount, currentVariables])

  const handleVariableChange = (idx: number, val: string) => {
    const next = [...variableSlots]
    next[idx] = val
    // Persist the full array (length === placeholderCount) as a JSON
    // string — useCopilot's editedInputs stringifies before sending to
    // the backend, so this keeps the shape consistent.
    onChange('bodyVariables', JSON.stringify(next))
  }

  const hasVariableMismatch =
    currentVariables.length > 0 && currentVariables.length !== placeholderCount

  return (
    <div className="space-y-2.5">
      <WhatsappLineRow
        whatsappNumberId={input.whatsappNumberId as string | null | undefined}
        variant="callout"
        onLineChange={(id) => onChange('whatsappNumberId', id)}
      />

      <div className="grid grid-cols-2 gap-2">
        <EditableField label="Nome" value={String(input.name ?? '')} fieldKey="name" onChange={onChange} />
        <SelectField label="Categoria" value={String(input.category ?? 'MARKETING')} fieldKey="category" options={TEMPLATE_CATEGORIES} onChange={onChange} />
      </div>

      {/* Header media preview */}
      {headerType && headerType !== 'UNDEFINED' && headerType !== '' && (
        <div className="rounded-lg border border-surface-700/40 bg-surface-800/40 overflow-hidden">
          {headerType === 'IMAGE' && mediaUrl ? (
            <div>
              <div className="flex items-center justify-center p-2 bg-surface-900/40">
                <img
                  src={mediaUrl}
                  alt="Header"
                  className="max-h-24 max-w-full object-contain rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1">
                <ImageIcon className="w-3 h-3 text-brand-400" />
                <span className="text-[10px] text-surface-400">Header: Imagem</span>
              </div>
            </div>
          ) : headerType === 'DOCUMENT' && mediaUrl ? (
            <div>
              {mediaUrl.endsWith('.pdf') || mediaUrl.includes('.pdf') ? (
                <iframe
                  src={mediaUrl}
                  title="PDF preview"
                  className="w-full h-44 border-0 rounded-t-lg bg-surface-900"
                />
              ) : null}
              <div className="flex items-center gap-2.5 px-2.5 py-1.5">
                <div className="w-6 h-6 rounded bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3 h-3 text-accent-rose" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-surface-300 truncate">Documento PDF</p>
                  <p className="text-[9px] text-surface-500 truncate">{mediaUrl.split('/').pop()}</p>
                </div>
                <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors flex-shrink-0">
                  Abrir
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-1.5">
              {headerType === 'IMAGE' && <ImageIcon className="w-3 h-3 text-brand-400" />}
              {headerType === 'VIDEO' && <FileText className="w-3 h-3 text-brand-400" />}
              {headerType === 'TEXT' && <FileText className="w-3 h-3 text-brand-400" />}
              {headerType === 'DOCUMENT' && <FileText className="w-3 h-3 text-brand-400" />}
              <span className="text-[10px] text-surface-400">Header: {headerType}</span>
            </div>
          )}
        </div>
      )}

      {/* Body + footer */}
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3 space-y-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Mensagem</label>
          <textarea
            value={body}
            onChange={(e) => onChange('body', e.target.value)}
            placeholder="Corpo do template..."
            rows={6}
            className="w-full px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 resize-y min-h-[80px]"
          />
        </div>
        <EditableField label="Rodapé" value={footer} fieldKey="footer" onChange={onChange} placeholder="Rodapé opcional" />
      </div>

      {/* Editable buttons */}
      {buttons.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Botões</label>
          <div className="flex flex-wrap gap-1.5">
            {buttons.map((btn, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-800/60 border border-surface-700/40 px-1 py-0.5"
              >
                {btn.type === 'URL' && <ExternalLink className="w-2.5 h-2.5 text-surface-500 flex-shrink-0 ml-1.5" />}
                {btn.type === 'PHONE_NUMBER' && <Phone className="w-2.5 h-2.5 text-surface-500 flex-shrink-0 ml-1.5" />}
                {btn.type === 'QUICK_REPLY' && <CornerDownLeft className="w-2.5 h-2.5 text-surface-500 flex-shrink-0 ml-1.5" />}
                <input
                  type="text"
                  value={btnTexts[i] ?? btn.text}
                  onChange={(e) => handleBtnChange(i, e.target.value)}
                  className="bg-transparent border-none text-[10px] text-surface-300 focus:outline-none w-28 py-1 pr-1.5"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable variable examples — the exact strings that get
          submitted to Meta as `example.body_text` for template review.
          Surfaced explicitly so the operator can tell what the reviewer
          will see (and tweak it) before approving. */}
      {placeholderCount > 0 && (
        <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3 space-y-2">
          <div>
            <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">
              Exemplos das variáveis
            </label>
            <p className="text-[10px] text-surface-500 mt-0.5">
              Estes valores vão para a Meta como exemplo de aprovação. Troque por algo real antes de enviar.
            </p>
          </div>
          {variableSlots.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-brand-400 w-9 flex-shrink-0">{`{{${i + 1}}}`}</span>
              <input
                type="text"
                value={value}
                onChange={(e) => handleVariableChange(i, e.target.value)}
                placeholder={`Exemplo para {{${i + 1}}} (ex.: "João")`}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          ))}
          {hasVariableMismatch && (
            <p className="text-[10px] text-status-pending flex items-start gap-1 mt-1">
              <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
              O corpo tem {placeholderCount} variável(is) mas foram preenchidos {currentVariables.length} exemplo(s).
              A Meta rejeita se não baterem.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Campaign preview ─────────────────────────────────────────────────────────

const SEGMENT_TYPES = [
  { value: 'all', label: 'Todos os contatos' },
  { value: 'tag', label: 'Por tags' },
  { value: 'stage', label: 'Por estágio' },
  { value: 'manual', label: 'Seleção manual' },
  { value: 'filter', label: 'Filtro avançado' },
]

function CampaignApprovalPreview({
  input, onChange,
}: {
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  const segment = input.segment as Record<string, unknown> | undefined
  const mappings = input.variableMappings as Array<Record<string, unknown>> | undefined

  // Handle segment type change by updating the entire segment object
  const handleSegmentTypeChange = (_key: string, val: string) => {
    const updated = { ...(segment ?? {}), type: val }
    onChange('segment', JSON.stringify(updated))
  }

  return (
    <div className="space-y-2.5">
      <WhatsappLineRow
        whatsappNumberId={input.whatsappNumberId as string | null | undefined}
        variant="callout"
        onLineChange={(id) => onChange('whatsappNumberId', id)}
      />

      <EditableField label="Nome da campanha" value={String(input.name ?? '')} fieldKey="name" onChange={onChange} />

      {/* Template */}
      {!!(input.templateName || input.templateId) && (
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-surface-800/40 border border-surface-700/40">
          <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-surface-500">Template vinculado</p>
            <p className="text-xs text-surface-200 font-medium truncate">{String(input.templateName ?? input.templateId ?? '')}</p>
          </div>
        </div>
      )}

      {/* Segmentação */}
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3 space-y-2.5">
        <SelectField
          label="Segmentação"
          value={String(segment?.type ?? 'all')}
          fieldKey="segmentType"
          options={SEGMENT_TYPES}
          onChange={handleSegmentTypeChange}
        />
        {(segment?.tagIds as string[] | undefined)?.length ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-800/40">
            <Tag className="w-3 h-3 text-brand-400" />
            <span className="text-[10px] text-surface-300">{(segment!.tagIds as string[]).length} tags selecionadas</span>
          </div>
        ) : null}
        {(segment?.stages as string[] | undefined)?.length ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-800/40">
            <Layers className="w-3 h-3 text-brand-400" />
            <span className="text-[10px] text-surface-300">{(segment!.stages as string[]).length} estágios selecionados</span>
          </div>
        ) : null}
      </div>

      {/* Variáveis */}
      {mappings && mappings.length > 0 && (
        <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3">
          <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Mapeamento de variáveis</label>
          <div className="mt-1.5 space-y-1">
            {mappings.map((m, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-surface-900/40 text-xs">
                <span className="text-brand-400 font-mono text-[10px] flex-shrink-0">{'{{' + String(m.position) + '}}'}</span>
                <span className="text-surface-600">→</span>
                <span className="text-surface-300">{String(m.contactField ?? m.literal ?? m.customFieldKey ?? '—')}</span>
                <span className="text-[9px] text-surface-500 ml-auto">({String(m.source ?? '')})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agendamento */}
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Clock className="w-3 h-3 text-surface-500" />
          <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Agendamento</label>
        </div>
        <EditableField label="" value={String(input.scheduledAt ?? '')} fieldKey="scheduledAt" onChange={onChange} placeholder="Imediato (deixe vazio) ou data ISO (2026-04-10T10:00:00)" />
      </div>
    </div>
  )
}

// ─── Contact preview ──────────────────────────────────────────────────────────

const STAGE_OPTIONS = [
  { value: 'lead', label: 'Lead' }, { value: 'prospect', label: 'Prospect' },
  { value: 'qualified', label: 'Qualificado' }, { value: 'opportunity', label: 'Oportunidade' },
  { value: 'customer', label: 'Cliente' }, { value: 'churned', label: 'Perdido' },
  { value: 'inactive', label: 'Inativo' },
]

const INTENT_OPTIONS = [
  { value: 'high', label: 'Alta' }, { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' }, { value: 'unknown', label: 'Desconhecida' },
]

const SOURCE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' }, { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'manual', label: 'Manual' }, { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Indicação' }, { value: 'campaign', label: 'Campanha' },
]

function ContactApprovalPreview({
  toolName, input, onChange,
}: {
  toolName: string; input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  const isCreate = toolName === 'create_contact'
  return (
    <div className="space-y-2.5">
      {/* ID do contato se update */}
      {!isCreate && !!input.contactId && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-800/40 border border-surface-700/40">
          <UserCog className="w-3 h-3 text-surface-500 flex-shrink-0" />
          <span className="text-[10px] text-surface-400">Contato: <span className="text-surface-300 font-mono">{String(input.contactId).slice(0, 12)}...</span></span>
        </div>
      )}
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <EditableField label="Nome" value={String(input.displayName ?? '')} fieldKey="displayName" onChange={onChange} placeholder="Nome do contato" />
          <EditableField label="WhatsApp" value={String(input.waId ?? '')} fieldKey="waId" onChange={onChange} placeholder="5511999998888" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <EditableField label="Email" value={String(input.email ?? '')} fieldKey="email" onChange={onChange} placeholder="email@empresa.com" />
          <EditableField label="Empresa" value={String(input.company ?? '')} fieldKey="company" onChange={onChange} placeholder="Nome da empresa" />
        </div>
        <EditableField label="Cargo" value={String(input.jobTitle ?? '')} fieldKey="jobTitle" onChange={onChange} placeholder="Cargo do contato" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Estágio" value={String(input.stage ?? 'lead')} fieldKey="stage" options={STAGE_OPTIONS} onChange={onChange} />
        <SelectField label="Fonte" value={String(input.source ?? 'manual')} fieldKey="source" options={SOURCE_OPTIONS} onChange={onChange} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Intenção de compra" value={String(input.intent ?? 'unknown')} fieldKey="intent" options={INTENT_OPTIONS} onChange={onChange} />
        <EditableField label="Lead Score (0-100)" value={String(input.leadScore ?? '')} fieldKey="leadScore" onChange={onChange} placeholder="0-100" />
      </div>
    </div>
  )
}

// ─── Message preview (WhatsApp style) ─────────────────────────────────────────

function MessageApprovalPreview({
  input, onChange,
}: {
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  const text = String(input.text ?? '')
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-800/40 border border-surface-700/40">
        <MessageSquare className="w-3 h-3 text-surface-500 flex-shrink-0" />
        <span className="text-[10px] text-surface-400">Conversa: <span className="text-surface-300 font-mono">{String(input.conversationId ?? '').slice(0, 12)}...</span></span>
      </div>
      {/* WhatsApp-style bubble preview */}
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3 space-y-2">
        <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Mensagem que será enviada</label>
        <textarea
          value={text}
          onChange={(e) => onChange('text', e.target.value)}
          placeholder="Texto da mensagem..."
          rows={5}
          className="w-full px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 resize-y"
        />
        {/* Live preview */}
        {text && (
          <div className="mt-2 flex justify-end">
            <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-br-sm bg-brand-600/20 border border-brand-500/20">
              <p className="text-xs text-surface-200 whitespace-pre-wrap">{text}</p>
              <p className="text-[9px] text-surface-500 text-right mt-1">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tag preview ──────────────────────────────────────────────────────────────

function TagApprovalPreview({
  input, onChange,
}: {
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  const color = String(input.color ?? '#6366f1')
  return (
    <div className="space-y-2.5">
      <EditableField label="Nome da etiqueta" value={String(input.name ?? '')} fieldKey="name" onChange={onChange} placeholder="Nome da tag" />
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Cor</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange('color', e.target.value)}
            className="w-8 h-8 rounded-lg border border-surface-700/60 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => onChange('color', e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 font-mono focus:outline-none focus:border-brand-500/50"
          />
          <div className="px-3 py-1 rounded-full text-[10px] font-medium" style={{ backgroundColor: color, color: getReadableTextColor(color) }}>
            {String(input.name ?? 'Preview')}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stage preview ────────────────────────────────────────────────────────────

function StageApprovalPreview({
  input, onChange,
}: {
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  const color = String(input.color ?? '#6366f1')
  const isTerminal = input.isTerminal === true || input.isTerminal === 'true'
  return (
    <div className="space-y-2.5">
      <EditableField label="Nome do estágio" value={String(input.label ?? '')} fieldKey="label" onChange={onChange} placeholder="Ex: Qualificado" />
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Cor</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange('color', e.target.value)}
            className="w-8 h-8 rounded-lg border border-surface-700/60 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => onChange('color', e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 font-mono focus:outline-none focus:border-brand-500/50"
          />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-surface-300 font-medium">{String(input.label ?? 'Preview')}</span>
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isTerminal}
          onChange={(e) => onChange('isTerminal', String(e.target.checked))}
          className="w-3.5 h-3.5 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/30"
        />
        <span className="text-xs text-surface-300">Estágio terminal (fim do pipeline)</span>
      </label>
    </div>
  )
}

// ─── Automation preview ───────────────────────────────────────────────────────

const AUTOMATION_TYPES = [
  { value: 'boas_vindas', label: 'Boas-vindas' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'fora_horario', label: 'Fora do horário' },
  { value: 'triagem_keyword', label: 'Triagem por palavra' },
  { value: 'estagio_crm', label: 'Mudança de estágio' },
  { value: 'inatividade', label: 'Inatividade' },
]

const AUTOMATION_STATUS = [
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
  { value: 'draft', label: 'Rascunho' },
]

const CONDITIONS_LOGIC = [
  { value: 'and', label: 'Todas (AND)' },
  { value: 'or', label: 'Qualquer uma (OR)' },
]

function AutomationApprovalPreview({
  input, onChange,
}: {
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  const trigger = input.trigger as Record<string, unknown> | undefined
  const conditions = (input.conditions ?? []) as Array<Record<string, unknown>>
  const actions = (input.actions ?? []) as Array<Record<string, unknown>>

  return (
    <div className="space-y-2.5">
      <WhatsappLineRow
        whatsappNumberId={input.whatsappNumberId as string | null | undefined}
        variant="callout"
        onLineChange={(id) => onChange('whatsappNumberId', id)}
      />

      <EditableField label="Nome" value={String(input.name ?? '')} fieldKey="name" onChange={onChange} placeholder="Nome da automação" />
      {input.description !== undefined && (
        <EditableField label="Descrição" value={String(input.description ?? '')} fieldKey="description" onChange={onChange} placeholder="O que essa automação faz" />
      )}
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Tipo" value={String(input.type ?? 'boas_vindas')} fieldKey="type" options={AUTOMATION_TYPES} onChange={onChange} />
        <SelectField label="Status inicial" value={String(input.status ?? 'active')} fieldKey="status" options={AUTOMATION_STATUS} onChange={onChange} />
      </div>

      {/* Trigger */}
      {trigger && Object.keys(trigger).length > 0 && (
        <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3">
          <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Gatilho</label>
          <div className="mt-1.5 space-y-1.5">
            {!!trigger.stageKey && (
              <div className="flex items-center gap-2">
                <Layers className="w-3 h-3 text-brand-400 flex-shrink-0" />
                <span className="text-xs text-surface-300">Estágio: <span className="text-surface-200 font-medium">{String(trigger.stageKey)}</span></span>
              </div>
            )}
            {!!trigger.event && (
              <div className="flex items-center gap-2">
                <Workflow className="w-3 h-3 text-brand-400 flex-shrink-0" />
                <span className="text-xs text-surface-300">Evento: <span className="text-surface-200 font-medium">{String(trigger.event)}</span></span>
              </div>
            )}
            {!!trigger.keyword && (
              <div className="flex items-center gap-2">
                <Search className="w-3 h-3 text-brand-400 flex-shrink-0" />
                <span className="text-xs text-surface-300">Palavra-chave: <span className="text-surface-200 font-medium">{String(trigger.keyword)}</span></span>
              </div>
            )}
            {!!trigger.templateId && (
              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 text-brand-400 flex-shrink-0" />
                <span className="text-xs text-surface-300">Template: <span className="text-surface-200 font-medium font-mono">{String(trigger.templateId).slice(0, 12)}...</span></span>
              </div>
            )}
            {!trigger.stageKey && !trigger.event && !trigger.keyword && (
              Object.entries(trigger).map(([k, v]) => (
                <div key={k} className="text-xs text-surface-400">
                  <span className="text-surface-500">{k}:</span> <span className="text-surface-300">{String(v)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Conditions */}
      {conditions.length > 0 && (
        <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Condições</label>
            <div className="w-32">
              <SelectField label="" value={String(input.conditionsLogic ?? 'and')} fieldKey="conditionsLogic" options={CONDITIONS_LOGIC} onChange={onChange} />
            </div>
          </div>
          <div className="space-y-1">
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-900/40 text-xs">
                <span className="text-brand-400 font-mono text-[10px] flex-shrink-0">{i + 1}.</span>
                <span className="text-surface-300">
                  {String(c.field ?? '')} <span className="text-surface-500">{String(c.operator ?? '')}</span> <span className="text-surface-200 font-medium">{String(c.value ?? '')}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3">
          <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Ações</label>
          <div className="mt-1.5 space-y-1.5">
            {actions.map((a, i) => {
              const actionType = String(a.type ?? a.action ?? '')
              return (
                <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-surface-900/40 border border-surface-700/30">
                  {actionType.includes('template') || actionType.includes('message') ? (
                    <Send className="w-3 h-3 text-brand-400 flex-shrink-0 mt-0.5" />
                  ) : actionType.includes('tag') ? (
                    <Tag className="w-3 h-3 text-brand-400 flex-shrink-0 mt-0.5" />
                  ) : actionType.includes('assign') ? (
                    <Users className="w-3 h-3 text-brand-400 flex-shrink-0 mt-0.5" />
                  ) : actionType.includes('stage') ? (
                    <Layers className="w-3 h-3 text-brand-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Workflow className="w-3 h-3 text-brand-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-200 font-medium">{actionType || 'Ação'}</p>
                    {!!a.templateId && (
                      <p className="text-[10px] text-surface-400 mt-0.5">
                        Template: <span className="text-surface-300 font-mono">{String(a.templateId).slice(0, 12)}...</span>
                        {!!a.templateName && <span className="text-surface-300 ml-1">({String(a.templateName)})</span>}
                      </p>
                    )}
                    {!!a.message && (
                      <p className="text-[10px] text-surface-400 mt-0.5">
                        Mensagem: <span className="text-surface-300">"{String(a.message).slice(0, 80)}{String(a.message).length > 80 ? '...' : ''}"</span>
                      </p>
                    )}
                    {!!a.tagId && <p className="text-[10px] text-surface-400 mt-0.5">Tag: <span className="font-mono text-surface-300">{String(a.tagId).slice(0, 8)}...</span></p>}
                    {!!a.stageKey && <p className="text-[10px] text-surface-400 mt-0.5">Estágio: <span className="text-surface-300">{String(a.stageKey)}</span></p>}
                    {!!a.userId && <p className="text-[10px] text-surface-400 mt-0.5">Atendente: <span className="font-mono text-surface-300">{String(a.userId).slice(0, 8)}...</span></p>}
                    {!!a.delay && <p className="text-[10px] text-surface-400 mt-0.5">Atraso: <span className="text-surface-300">{String(a.delay)}</span></p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No trigger/conditions/actions — show hint */}
      {!trigger && conditions.length === 0 && actions.length === 0 && (
        <div className="px-2.5 py-2 rounded-lg bg-surface-800/30 border border-dashed border-surface-700/40">
          <span className="text-[10px] text-surface-500">Gatilho, condições e ações serão configurados com valores padrão para o tipo selecionado.</span>
        </div>
      )}
    </div>
  )
}

// ─── Conversation status/assign preview ───────────────────────────────────────

const CONVERSATION_STATUS = [
  { value: 'open', label: 'Aberta' },
  { value: 'pending', label: 'Pendente' },
  { value: 'resolved', label: 'Resolvida' },
  { value: 'abandoned', label: 'Arquivada' },
]

const CONV_ACTION_LABELS: Record<string, string> = {
  set_conversation_status: 'Alterar status',
  assign_conversation: 'Atribuir conversa',
  transfer_conversation: 'Transferir conversa',
  add_tag_to_conversation: 'Adicionar etiqueta',
  remove_tag_from_conversation: 'Remover etiqueta',
}

function ConversationApprovalPreview({
  toolName, input, onChange,
}: {
  toolName: string; input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-surface-500">Conversa</p>
            <p className="text-xs text-surface-200 font-mono">{String(input.conversationId ?? '').slice(0, 16)}...</p>
          </div>
        </div>

        <div className="border-t border-surface-700/30 pt-2.5">
          <p className="text-[10px] font-medium text-surface-500 uppercase tracking-wider mb-1.5">
            {CONV_ACTION_LABELS[toolName] ?? toolName}
          </p>

          {toolName === 'set_conversation_status' && (
            <SelectField label="Novo status" value={String(input.status ?? 'open')} fieldKey="status" options={CONVERSATION_STATUS} onChange={onChange} />
          )}
          {toolName === 'assign_conversation' && (
            <EditableField label="Atendente (UUID)" value={String(input.userId ?? '')} fieldKey="userId" onChange={onChange} placeholder="UUID do atendente ou vazio para desatribuir" />
          )}
          {toolName === 'transfer_conversation' && (
            <EditableField label="Transferir para (UUID)" value={String(input.toUserId ?? '')} fieldKey="toUserId" onChange={onChange} placeholder="UUID do atendente destino" />
          )}
          {(toolName === 'add_tag_to_conversation' || toolName === 'remove_tag_from_conversation') && (
            <div className="flex items-center gap-2">
              <Tag className={cn('w-3 h-3 flex-shrink-0', toolName === 'remove_tag_from_conversation' ? 'text-danger' : 'text-brand-400')} />
              <span className="text-xs text-surface-300">
                Tag ID: <span className="font-mono">{String(input.tagId ?? '')}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Canned response preview ──────────────────────────────────────────────────

function CannedResponseApprovalPreview({
  input, onChange,
}: {
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <EditableField label="Atalho" value={String(input.shortcut ?? '')} fieldKey="shortcut" onChange={onChange} placeholder="/atalho" />
        <EditableField label="Título" value={String(input.title ?? '')} fieldKey="title" onChange={onChange} placeholder="Título da resposta" />
      </div>
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/50 p-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Conteúdo da resposta</label>
          <textarea
            value={String(input.content ?? '')}
            onChange={(e) => onChange('content', e.target.value)}
            placeholder="Texto que será enviado..."
            rows={4}
            className="w-full px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 resize-y"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Destructive action preview ───────────────────────────────────────────────

function DestructiveApprovalPreview({
  toolName, input,
}: {
  toolName: string; input: Record<string, unknown>
}) {
  const targetId = String(
    input.templateId ?? input.campaignId ?? input.tagId ?? input.stageId
    ?? input.automationId ?? input.fieldKey ?? input.responseId ?? input.contactId ?? '—'
  )
  const targetName = String(input.name ?? input.label ?? input.title ?? input.shortcut ?? '')
  const labelMap: Record<string, { type: string; icon: React.ElementType }> = {
    delete_tag: { type: 'Etiqueta', icon: Tag },
    delete_stage: { type: 'Estágio do pipeline', icon: Layers },
    delete_template: { type: 'Template WhatsApp', icon: FileText },
    delete_campaign: { type: 'Campanha', icon: Megaphone },
    delete_custom_field: { type: 'Campo personalizado', icon: Hash },
    delete_automation: { type: 'Automação', icon: Workflow },
    delete_canned_response: { type: 'Resposta rápida', icon: MessageSquare },
  }
  const { type: itemType, icon: Icon } = labelMap[toolName] ?? { type: 'Item', icon: Trash2 }

  return (
    <div className="rounded-xl border border-danger/20 bg-danger/5 overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-danger" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-danger font-medium">Excluir {itemType}</p>
          {targetName && <p className="text-xs text-surface-300 mt-0.5">{targetName}</p>}
          <p className="text-[10px] text-danger/60 font-mono mt-0.5">{targetId}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 bg-danger/5 border-t border-danger/15">
        <AlertTriangle className="w-3 h-3 text-danger/70 flex-shrink-0" />
        <span className="text-[10px] text-danger/70">Esta ação não pode ser desfeita.</span>
      </div>
    </div>
  )
}

// ─── Send campaign preview ────────────────────────────────────────────────────

function SendCampaignApprovalPreview({
  input,
}: {
  input: Record<string, unknown>
}) {
  return (
    <div className="rounded-xl border border-status-pending-border bg-status-pending-bg overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-status-pending-bg border border-status-pending-border flex items-center justify-center flex-shrink-0">
          <Rocket className="w-4 h-4 text-status-pending" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-status-pending font-medium">Disparar campanha</p>
          {!!input.campaignName && <p className="text-xs text-surface-300 mt-0.5">{String(input.campaignName)}</p>}
          <p className="text-[10px] text-status-pending/60 font-mono mt-0.5">{String(input.campaignId ?? '')}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 bg-status-pending-bg border-t border-status-pending-border">
        <AlertTriangle className="w-3 h-3 text-status-pending/70 flex-shrink-0" />
        <span className="text-[10px] text-status-pending/70">As mensagens serão enviadas imediatamente para todos os contatos do segmento.</span>
      </div>
    </div>
  )
}

// ─── Custom field preview ─────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' }, { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' }, { value: 'select', label: 'Seleção' },
  { value: 'boolean', label: 'Sim/Não' },
]

function CustomFieldApprovalPreview({
  input, onChange,
}: {
  input: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  const fieldType = String(input.type ?? 'text')
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <EditableField label="Nome do campo" value={String(input.label ?? '')} fieldKey="label" onChange={onChange} placeholder="Ex: CPF, CNPJ" />
        <EditableField label="Chave (snake_case)" value={String(input.key ?? input.fieldKey ?? '')} fieldKey="key" onChange={onChange} placeholder="ex: cpf" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Tipo do campo" value={fieldType} fieldKey="type" options={FIELD_TYPES} onChange={onChange} />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Obrigatório</label>
          <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/60 cursor-pointer h-[30px]">
            <input
              type="checkbox"
              checked={input.required === true || input.required === 'true'}
              onChange={(e) => onChange('required', String(e.target.checked))}
              className="w-3.5 h-3.5 rounded border-surface-600 bg-surface-800 text-brand-500"
            />
            <span className="text-xs text-surface-300">{(input.required === true || input.required === 'true') ? 'Sim' : 'Não'}</span>
          </label>
        </div>
      </div>
      {(fieldType === 'select' || !!input.options) && (
        <EditableField
          label="Opções (separadas por vírgula)"
          value={String(Array.isArray(input.options) ? (input.options as string[]).join(', ') : (input.options ?? ''))}
          fieldKey="options"
          onChange={onChange}
          placeholder="Opção 1, Opção 2, Opção 3"
        />
      )}
      {/* Preview do campo */}
      <div className="rounded-lg border border-dashed border-surface-700/40 bg-surface-800/20 px-3 py-2">
        <span className="text-[10px] text-surface-500">Preview: </span>
        <span className="text-xs text-surface-300">{String(input.label ?? 'Campo')}</span>
        <span className="text-[10px] text-surface-500 ml-1">({fieldType}{(input.required === true || input.required === 'true') ? ', obrigatório' : ''})</span>
      </div>
    </div>
  )
}

// ─── Specialized preview router ───────────────────────────────────────────────

export function ApprovalItemPreview({
  item, editedInput, onFieldChange,
}: {
  item: { id: string; name: string; input: unknown }
  editedInput: Record<string, unknown>
  onFieldChange: (itemId: string, key: string, val: string) => void
}) {
  const merged = { ...(item.input as Record<string, unknown>), ...editedInput }
  const onChange = (key: string, val: string) => onFieldChange(item.id, key, val)

  // Templates
  if (item.name === 'create_template' || item.name === 'update_template')
    return <TemplateApprovalPreview input={merged} onChange={onChange} />

  // Campaigns
  if (item.name === 'create_campaign' || item.name === 'update_campaign')
    return <CampaignApprovalPreview input={merged} onChange={onChange} />

  // Send campaign (destructive-ish)
  if (item.name === 'send_campaign')
    return <SendCampaignApprovalPreview input={merged} />

  // Contacts
  if (item.name === 'create_contact' || item.name === 'update_contact')
    return <ContactApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // Messages
  if (item.name === 'send_message')
    return <MessageApprovalPreview input={merged} onChange={onChange} />

  // Tags
  if (item.name === 'create_tag' || item.name === 'update_tag')
    return <TagApprovalPreview input={merged} onChange={onChange} />

  // Stages
  if (item.name === 'create_stage' || item.name === 'update_stage')
    return <StageApprovalPreview input={merged} onChange={onChange} />

  // Automations
  if (item.name === 'create_automation' || item.name === 'update_automation')
    return <AutomationApprovalPreview input={merged} onChange={onChange} />
  if (item.name === 'toggle_automation')
    return <AutomationApprovalPreview input={merged} onChange={onChange} />

  // Canned responses
  if (item.name === 'create_canned_response' || item.name === 'update_canned_response')
    return <CannedResponseApprovalPreview input={merged} onChange={onChange} />

  // Conversations (status, assign, tag, transfer)
  if (['set_conversation_status', 'assign_conversation', 'add_tag_to_conversation', 'remove_tag_from_conversation', 'transfer_conversation'].includes(item.name))
    return <ConversationApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // Custom fields
  if (item.name === 'create_custom_field' || item.name === 'update_custom_field')
    return <CustomFieldApprovalPreview input={merged} onChange={onChange} />

  // ── Agent Builder tools ──────────────────────────────────────────────
  // System prompt: update (full rewrite), append, replace
  if (item.name === 'update_agent_system_prompt'
   || item.name === 'append_to_agent_system_prompt'
   || item.name === 'replace_in_agent_system_prompt')
    return <SystemPromptApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // Knowledge base docs: add, update, append, replace
  if (item.name === 'add_agent_knowledge_doc'
   || item.name === 'update_agent_knowledge_doc'
   || item.name === 'append_to_agent_knowledge_doc'
   || item.name === 'replace_in_agent_knowledge_doc')
    return <KnowledgeDocApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // Handoff rules: add/remove single rule
  if (item.name === 'add_agent_handoff_rule' || item.name === 'remove_agent_handoff_rule')
    return <HandoffRuleApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // Agent config: create, set status, update metadata
  if (item.name === 'create_agent'
   || item.name === 'set_agent_status'
   || item.name === 'update_agent_metadata')
    return <AgentConfigApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // FAQ rules
  if (item.name === 'create_agent_faq' || item.name === 'update_agent_faq')
    return <AgentFaqApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // Custom HTTP tools on an agent
  if (item.name === 'create_agent_tool' || item.name === 'update_agent_tool')
    return <AgentToolHttpApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // Company Brain / Org KB
  if (item.name === 'update_company_brain' || item.name === 'update_company_knowledge_base')
    return <CompanyBrainApprovalPreview toolName={item.name} input={merged} onChange={onChange} />

  // sync_brain_to_rag has no editable fields — just a confirmation
  if (item.name === 'sync_brain_to_rag')
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
        Reindexa todos os brand files do Company Brain no RAG. Afeta todos os agentes.
      </div>
    )

  // Destructive actions (includes delete_agent, delete_agent_tool, delete_agent_knowledge_doc, delete_agent_faq)
  if (DESTRUCTIVE_TOOLS.has(item.name))
    return <DestructiveApprovalPreview toolName={item.name} input={merged} />

  // Fallback genérico
  const details = formatApprovalDetails(item.name, merged)
  return (
    <div className="space-y-2">
      {details.map((d) => (
        <EditableField key={d.key} label={d.key} value={d.value} fieldKey={d.key} onChange={onChange} />
      ))}
    </div>
  )
}

// ─── Batch approval card ──────────────────────────────────────────────────────

// ─── Choose-line card (multi-WABA guard response) ──────────────────────────
// Rendered when the executor's multi-WABA guard short-circuits a write
// because the tool call didn't include `whatsappNumberId`. The card turns
// the `availableLines` list into one-click chips — the operator answers,
// we enqueue a follow-up message, the LLM reads it and re-issues the
// tool call with the right line. Zero typing, zero wasted turns.
// ─── Requires-setup card (preflight blocked a write before approval) ──────
// Tool returned `requires_setup: 'whatsapp_line'` (or similar future keys).
// Friendly setup CTA instead of a generic error chip — the operator sees a
// one-click path to fix the blocker and retry the original request. Matches
// the tone of WhatsappLineRequiredBanner in module pages.
// Message-level setup nudge — rendered from the SSE `setup_required` event
// emitted by the orchestrator short-circuit. Identical visuals to
// RequiresSetupCard (the tool-result variant) but driven by a dedicated
// message field, NOT a fake tool_call — so there's no chip / plan / approval
// noise around it.
function SetupRequiredCard({
  setup,
}: {
  setup: { reason: string; message: string; cta: { href: string; label: string } }
}) {
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-warning">Configuração necessária</p>
          <p className="mt-0.5 text-[13px] text-warning/85">{setup.message}</p>
        </div>
        <a
          href={setup.cta.href}
          className="flex flex-shrink-0 items-center gap-1.5 self-center rounded-lg bg-warning/20 px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/30"
        >
          {setup.cta.label}
        </a>
      </div>
    </div>
  )
}

function RequiresSetupCard({ tc }: { tc: ToolCallRecord }) {
  const result = tc.result as {
    requires_setup?: string
    message?: string
    cta?: { href?: string; label?: string }
  }
  const href = result.cta?.href ?? '/settings/numbers'
  const label = result.cta?.label ?? 'Configurar agora'
  const message = result.message ?? 'Uma configuração prévia é necessária para concluir esta operação.'

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-warning">Configuração necessária</p>
          <p className="mt-0.5 text-[13px] text-warning/85">{message}</p>
        </div>
        <a
          href={href}
          className="flex flex-shrink-0 items-center gap-1.5 self-center rounded-lg bg-warning/20 px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/30"
        >
          {label}
        </a>
      </div>
    </div>
  )
}

function ChooseLineCard({
  tc,
  onSendFollowup,
}: {
  tc: ToolCallRecord
  onSendFollowup?: (text: string) => void | Promise<void>
}) {
  const result = tc.result as {
    error: 'choose_line_required'
    message?: string
    availableLines?: Array<{ id: string; displayPhoneNumber: string; label: string | null; isPrimary: boolean }>
  }
  const lines = result.availableLines ?? []
  const [submitted, setSubmitted] = useState<string | null>(null)

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 13 && digits.startsWith('55')) {
      return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
    }
    if (digits.length === 12 && digits.startsWith('55')) {
      return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
    }
    return raw
  }

  const handlePick = async (line: (typeof lines)[number]) => {
    if (submitted) return
    const friendly = line.label || formatPhone(line.displayPhoneNumber)
    setSubmitted(friendly)
    // The follow-up is read by the LLM, which should re-issue the original
    // tool call with `whatsappNumberId` set. We state the UUID explicitly
    // (not just the label) so the model has no ambiguity to resolve.
    await onSendFollowup?.(
      `Use a linha "${friendly}" (whatsappNumberId: ${line.id}) para esta operação.`,
    )
  }

  if (lines.length === 0) {
    // Degenerate response — show the plain message and let the user type.
    return (
      <div className="rounded-xl border border-status-pending-border bg-status-pending-bg/30 px-3 py-2.5">
        <p className="text-xs text-status-pending">{result.message ?? 'Escolha uma linha WhatsApp.'}</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-surface-700/60 bg-surface-800/60 overflow-hidden"
    >
      <div className="px-3 py-2.5 border-b border-surface-800/60">
        <p className="text-xs text-surface-200 font-medium">Qual linha WhatsApp?</p>
        <p className="text-[10px] text-surface-500 mt-0.5">
          {result.message ?? 'Este tenant tem mais de uma linha ativa. Escolha para continuar.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2.5">
        {lines.map((line) => {
          const friendly = line.label || formatPhone(line.displayPhoneNumber)
          const isPicked = submitted === friendly
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => handlePick(line)}
              disabled={!!submitted}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                isPicked
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                  : submitted
                  ? 'bg-surface-800/40 border-surface-700/40 text-surface-500 cursor-not-allowed'
                  : 'bg-surface-800 border-surface-700/60 text-surface-200 hover:border-brand-500/40 hover:bg-surface-700',
              )}
            >
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium">{friendly}</span>
              {line.label && (
                <span className="text-surface-500">({formatPhone(line.displayPhoneNumber)})</span>
              )}
              {line.isPrimary && !line.label && (
                <span className="text-[9px] text-brand-cta">★</span>
              )}
            </button>
          )
        })}
      </div>
      {submitted && (
        <div className="px-3 py-1.5 bg-surface-800/40 border-t border-surface-800/60">
          <p className="text-[10px] text-surface-500">Escolhida: <span className="text-surface-300">{submitted}</span></p>
        </div>
      )}
    </motion.div>
  )
}


// ─── Web search chip ───────────────────────────────────────────────────────────

function WebSearchChip({ tc }: { tc: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = tc.status === 'running'
  const isFetch = tc.name === 'web_fetch'
  const result = tc.result as { sources?: Array<{ title: string; url: string }> } | null
  const sources = result?.sources ?? []
  const input = tc.input as { url?: string; query?: string } | null
  const fetchUrl = input?.url ?? ''
  const searchQuery = input?.query ?? ''

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
  }

  if (isRunning) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-status-pending-border bg-status-pending-bg text-xs"
      >
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Globe className="w-3 h-3 text-status-pending/80" />
        </motion.div>
        <span className="text-status-pending/70 flex-1">
          {isFetch
            ? (fetchUrl ? `Acessando ${getDomain(fetchUrl)}...` : 'Acessando página...')
            : (searchQuery ? `Pesquisando "${searchQuery}"...` : 'Buscando na web...')}
        </span>
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-status-pending/60"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>
    )
  }

  const summaryLabel = isFetch
    ? (fetchUrl ? `Acessou ${getDomain(fetchUrl)}` : 'Página acessada')
    : sources.length > 0
      ? `${sources.length} fonte${sources.length !== 1 ? 's' : ''} encontrada${sources.length !== 1 ? 's' : ''}`
      : searchQuery
        ? `Pesquisou "${searchQuery.length > 50 ? searchQuery.slice(0, 50) + '…' : searchQuery}"`
        : 'Pesquisa concluída'

  // Always expandable if we have any useful info
  const hasDetails = isFetch ? !!fetchUrl : (!!searchQuery || sources.length > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-surface-700/40 bg-surface-900/50 overflow-hidden text-xs"
    >
      <button
        onClick={() => hasDetails && setExpanded((v) => !v)}
        disabled={!hasDetails}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1.5 text-left',
          hasDetails && 'hover:bg-surface-800/30 cursor-pointer transition-colors',
        )}
      >
        <Globe className="w-3 h-3 text-status-active/70 flex-shrink-0" />
        <span className="text-surface-400 flex-1">{summaryLabel}</span>
        {hasDetails && (
          <span className="ml-auto text-surface-600">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-800/40 px-3 py-2 flex flex-col gap-1.5">
              {isFetch && fetchUrl && (
                <div className="flex items-start gap-1.5">
                  <Link2 className="w-3 h-3 text-surface-500 flex-shrink-0 mt-0.5" />
                  <a
                    href={fetchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent-amber/80 hover:text-accent-amber break-all hover:underline leading-relaxed"
                  >
                    {fetchUrl}
                  </a>
                </div>
              )}
              {!isFetch && searchQuery && (
                <div className="flex items-center gap-1.5">
                  <Search className="w-3 h-3 text-surface-500 flex-shrink-0" />
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent-amber/80 hover:text-accent-amber italic hover:underline"
                  >
                    "{searchQuery}" ↗
                  </a>
                </div>
              )}
              {sources.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9px] text-surface-600 uppercase tracking-wide">Fontes encontradas:</span>
                  {sources.slice(0, 8).map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-1.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-status-active/40 flex-shrink-0" />
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-surface-400 hover:text-accent-amber truncate hover:underline"
                      >
                        {s.title ?? getDomain(s.url)}
                      </a>
                      <ExternalLink className="w-2.5 h-2.5 text-surface-600 flex-shrink-0" />
                    </motion.div>
                  ))}
                </div>
              )}
              {!isFetch && sources.length === 0 && searchQuery && (
                <div className="text-[9px] text-surface-600 mt-0.5">
                  Fontes processadas pela IA internamente. Clique na query acima para ver os resultados.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Tool result labels ────────────────────────────────────────────────────────

/** Counts items in a tool result robustly.
 *  Handles:
 *    - direct array:               [..]                    → arr.length
 *    - NestJS pagination:          { data: [...], total }  → total ?? data.length
 *    - executor truncation wrap:   { __truncated, total, data: [...] } → total
 *    - objects with {count}:       { count: N }            → count
 *    - anything else:              0
 */
function countItems(result: unknown): number {
  if (result == null) return 0
  if (Array.isArray(result)) return result.length
  if (typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (typeof r.total === 'number') return r.total
    if (typeof r.count === 'number') return r.count
    if (Array.isArray(r.data)) return r.data.length
  }
  return 0
}

function getResultLabel(tc: ToolCallRecord): string {
  if (!tc.result) return 'Concluído'
  const r = tc.result as Record<string, unknown>
  switch (tc.name) {
    case 'list_contacts':           return `${countItems(tc.result)} contato(s) encontrado(s)`
    case 'get_contact_details':     return r?.name ? `Perfil de ${r.name}` : 'Informações obtidas'
    case 'list_conversations':      return `${countItems(tc.result)} conversa(s)`
    case 'list_tags':               return `${countItems(tc.result)} etiqueta(s)`
    case 'list_templates':          return `${countItems(tc.result)} template(s)`
    case 'list_campaigns':          return `${countItems(tc.result)} campanha(s)`
    case 'get_campaign_report':         return `Relatório: ${(r as { conversionsCount?: number })?.conversionsCount ?? 0} conversões · ${(r as { topAttributionSource?: string })?.topAttributionSource ?? ''}`
    case 'get_campaign_conversations':  return `${countItems(tc.result)} conversa(s) analisada(s)`
    case 'list_users':              return `${countItems(tc.result)} usuário(s)`
    case 'get_home_stats':          return 'Métricas obtidas'
    case 'get_pending_leads':       return `${countItems(tc.result)} lead(s) pendente(s)`
    case 'create_contact':          return `Contato ${r?.name} criado`
    case 'update_contact':          return `${r?.name} atualizado`
    case 'assign_conversation':     return `Atribuída a ${r?.assignedTo}`
    case 'set_conversation_status': return `Status → ${r?.newStatus}`
    case 'add_tag_to_conversation': return 'Etiqueta adicionada'
    case 'send_message':            return 'Mensagem enviada'
    case 'create_tag':              return `Etiqueta ${r?.name} criada`
    case 'update_tag':              return `Etiqueta ${r?.name} atualizada`
    case 'delete_tag':              return `Etiqueta excluída`
    case 'list_stages':             return `${countItems(tc.result)} estágio(s)`
    case 'create_stage':            return `Estágio "${r?.label}" criado`
    case 'update_stage':            return `Estágio "${r?.label}" atualizado`
    case 'delete_stage':            return `Estágio excluído`
    case 'create_template':         return `Template ${r?.name} enviado para revisão`
    case 'update_template':         return `Template ${r?.name} atualizado`
    case 'delete_template':         return `Template excluído`
    case 'create_campaign':         return `Campanha ${r?.name} criada`
    case 'update_campaign':         return `Campanha ${r?.name} atualizada`
    case 'delete_campaign':         return `Campanha excluída`
    case 'send_campaign':           return `Campanha ${r?.name} disparada`
    case 'list_custom_fields':      return `${countItems(tc.result)} campo(s) personalizado(s)`
    case 'create_custom_field':     return `Campo "${r?.label}" criado`
    case 'update_custom_field':     return `Campo "${r?.label}" atualizado`
    case 'delete_custom_field':     return `Campo excluído`
    case 'get_contact_history':     return `${(r as { total?: number })?.total ?? 0} evento(s) no histórico`
    case 'web_search': {
      const q = (tc.input as { query?: string } | null)?.query
      const count = (r as { sources?: unknown[] })?.sources?.length ?? 0
      return q ? `Pesquisou "${q}" · ${count} fonte${count !== 1 ? 's' : ''}` : `${count} fonte(s) encontrada(s)`
    }
    case 'web_fetch': {
      const url = (tc.input as { url?: string } | null)?.url ?? ''
      try { return `Acessou ${new URL(url).hostname.replace(/^www\./, '')}` } catch { return 'Página acessada' }
    }
    // Agent Builder
    case 'get_agent_config':        return r?.name ? `Agente: ${r.name}` : (r === null ? 'Nenhum rascunho em andamento' : 'Agente verificado')
    case 'create_agent_config':     return `Agente "${r?.name}" criado`
    case 'update_agent_config':     return `Agente "${r?.name}" atualizado`
    case 'list_agent_tools':        return `${countItems(tc.result)} ferramenta(s) configurada(s)`
    case 'add_agent_tool':          return `Ferramenta "${r?.name}" adicionada`
    case 'update_agent_tool':       return `Ferramenta "${r?.name}" atualizada`
    case 'delete_agent_tool':       return 'Ferramenta removida'
    // Labels that previously fell through to 'Concluído' with no count:
    case 'list_automations':        return `${countItems(tc.result)} automação(ões)`
    case 'list_departments':        return `${countItems(tc.result)} departamento(s)`
    case 'list_canned_responses':   return `${countItems(tc.result)} resposta(s) rápida(s)`
    case 'get_recent_messages':     return `${countItems(tc.result)} mensagem(ns) recente(s)`
    case 'get_activity_feed':       return `${countItems(tc.result)} evento(s) de atividade`
    case 'get_dashboard_snapshot':  return 'Snapshot do dashboard obtido'
    case 'get_unread_count':        return `${(r as { count?: number })?.count ?? 0} conversa(s) não-lida(s)`
    case 'get_company_brain':       return 'Contexto da empresa obtido'
    case 'search_knowledge_base':   return `${countItems(tc.result)} trecho(s) da base de conhecimento`
    // Phase 7 analytics tools (aggregates):
    case 'get_contacts_analytics':      return `Analytics: ${(r as { total?: number })?.total ?? 0} contato(s)`
    case 'get_conversations_analytics': return `Analytics: ${(r as { total?: number })?.total ?? 0} conversa(s)`
    case 'get_messages_analytics':      return `Analytics: ${(r as { totalToday?: number })?.totalToday ?? 0} mensagem(ns) hoje`
    // Phase 13 browser tools
    case 'browser_navigate':            return (r as { title?: string })?.title ? `Página: ${(r as { title: string }).title}` : 'Página carregada'
    case 'browser_click':               return (r as { title?: string })?.title ? `Clicou — ${(r as { title: string }).title}` : 'Clique executado'
    case 'browser_extract':             return `${(r as { count?: number })?.count ?? 0} elemento(s) extraído(s)`
    default:                        return 'Concluído'
  }
}

// ─── Tool chip ─────────────────────────────────────────────────────────────────

export function ToolCallChip({
  tc,
  onResolveBatch,
  onSendFollowup,
}: {
  tc: ToolCallRecord
  onResolveBatch?: (batchTcId: string, approvedIds: string[], editedInputs?: Record<string, Record<string, unknown>>) => void
  onSendFollowup?: (text: string) => void | Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)

  // ── Web search / fetch ────────────────────────────────────────────────────
  if (tc.name === 'web_search' || tc.name === 'web_fetch') {
    return <WebSearchChip tc={tc} />
  }

  // ── Multi-WABA "choose line" prompt ────────────────────────────────────────
  // The agent-server's pre-POST guard (requireWhatsappLineOrAsk) returns a
  // structured `choose_line_required` result instead of letting the backend
  // 400 on a missing whatsappNumberId. Render the available lines as chips
  // so the operator answers with one click — much tighter loop than typing.
  if (
    tc.status === 'done' &&
    tc.result &&
    typeof tc.result === 'object' &&
    (tc.result as Record<string, unknown>).error === 'choose_line_required'
  ) {
    return <ChooseLineCard tc={tc} onSendFollowup={onSendFollowup} />
  }

  // ── requires_setup: friendly CTA card instead of failure chip ──────────
  // Preflight blocks (e.g. "tenant has no WhatsApp line") reach here as a
  // tool_result. We render them as a clear setup card with a direct link
  // to the settings page so the operator can self-serve in one click,
  // instead of the generic error-looking collapsed chip.
  if (
    tc.status === 'done' &&
    tc.result &&
    typeof tc.result === 'object' &&
    'requires_setup' in (tc.result as Record<string, unknown>)
  ) {
    return <RequiresSetupCard tc={tc} />
  }

  // ── Batch approval: compact chip (Claude Code-style UX) ────────────────
  // The full review happens in PendingApprovalBar + ApprovalModal, mounted
  // above the composer. Inline we render only a compact chip so the chat
  // flow isn't disrupted by a giant card. Three visual states:
  //   pending/submitting → blue "Aguardando aprovação ↑ na barra acima"
  //   approved           → green "<tool> aprovado" (expandable)
  //   denied             → gray  "<tool> cancelado" (expandable)
  if (tc.name === '__approval_batch__') {
    return <InChatApprovalChip tc={tc} />
  }

  // ── Normal running / done ─────────────────────────────────────────────────
  const isRunning = tc.status === 'running'

  return (
    <div className={cn(
      'text-xs rounded-lg border overflow-hidden transition-all',
      isRunning ? 'border-surface-700/50 bg-surface-900/40' : 'border-surface-700/50 bg-surface-900/60',
    )}>
      <button
        onClick={() => !isRunning && setExpanded((v) => !v)}
        disabled={isRunning}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1.5 text-left',
          !isRunning && 'hover:bg-surface-800/30 cursor-pointer transition-colors',
        )}
      >
        {isRunning
          ? <Loader2 className="w-3 h-3 text-surface-500 animate-spin flex-shrink-0" />
          : <CheckCircle2 className="w-3 h-3 text-surface-500 flex-shrink-0" />}
        <span className="text-surface-500">
          {isRunning ? 'Executando...' : getResultLabel(tc)}
        </span>
        {!isRunning && (
          <span className="ml-auto text-surface-600">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
      </button>
      {expanded && tc.result != null && (
        <div className="px-3 pb-2 border-t border-surface-700/30">
          <pre className="text-[10px] text-surface-500 overflow-x-auto mt-1.5 leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(tc.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── User attachment display ───────────────────────────────────────────────────

function UserAttachments({ attachments }: { attachments: CopilotAttachment[] }) {
  const images = attachments.filter((a) => a.kind === 'image')
  const pdfs   = attachments.filter((a) => a.kind === 'pdf')

  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      {images.map((att) => (
        <img
          key={att.id}
          src={att.previewUrl}
          alt={att.name}
          className="h-24 max-w-[160px] rounded-xl object-cover border border-white/10 shadow-md"
        />
      ))}
      {pdfs.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-700/60 border border-brand-500/30 max-w-[180px]"
        >
          <FileText className="w-4 h-4 text-accent-rose flex-shrink-0" />
          <span className="text-xs text-white truncate">{att.name}</span>
        </div>
      ))}
    </div>
  )
}

// ─── User message bubble (stateful — edit + branch nav) ───────────────────────

function UserMessageBubble({
  message,
  onEdit,
  onSwitchBranch,
}: {
  message: CopilotMessage
  onEdit?: (newText: string) => void
  onSwitchBranch?: (direction: 'prev' | 'next') => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  const [hovered, setHovered] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      editRef.current?.focus()
      const len = editRef.current?.value.length ?? 0
      editRef.current?.setSelectionRange(len, len)
    }
  }, [editing])

  const handleEditSave = () => {
    const trimmed = editText.trim()
    if (!trimmed || !onEdit) return
    onEdit(trimmed)
    setEditing(false)
  }

  const handleEditCancel = () => {
    setEditText(message.content)
    setEditing(false)
  }

  const hasBranches = (message.totalBranches ?? 0) > 1

  if (editing) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] w-full flex flex-col gap-2">
          <textarea
            ref={editRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleEditSave()
              if (e.key === 'Escape') handleEditCancel()
            }}
            className="w-full bg-surface-800 border border-brand-500/50 rounded-2xl px-4 py-3 text-sm text-white resize-none outline-none focus:border-brand-400/70 min-h-[80px] leading-relaxed"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleEditCancel}
              className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEditSave}
              disabled={!editText.trim()}
              className="px-3 py-1.5 text-xs bg-brand-600 text-surface-950 rounded-lg hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex justify-end"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="max-w-[80%] flex flex-col items-end gap-1.5">
        {message.attachments && message.attachments.length > 0 && (
          <UserAttachments attachments={message.attachments} />
        )}
        {message.content && (
          <div className="bg-bubble-out text-bubble-out-fg text-sm px-4 py-3 rounded-2xl rounded-tr-sm leading-relaxed shadow-md shadow-black/10">
            {message.content}
          </div>
        )}
        {/* Controls row: branch nav + edit button.
            Always reserves h-5 of space so the message doesn't shift when
            hover state changes. Opacity is the only thing animated. */}
        <div
          className={`flex items-center gap-1.5 h-5 transition-opacity duration-150 ${
            hovered || hasBranches ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!(hovered || hasBranches)}
        >
          {hasBranches && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onSwitchBranch?.('prev')}
                className="w-5 h-5 flex items-center justify-center rounded text-surface-500 hover:text-surface-300 transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[11px] text-surface-500 tabular-nums px-0.5">
                {(message.branchIndex ?? 0) + 1}/{message.totalBranches}
              </span>
              <button
                onClick={() => onSwitchBranch?.('next')}
                className="w-5 h-5 flex items-center justify-center rounded text-surface-500 hover:text-surface-300 transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
          {onEdit && (
            <button
              onClick={() => { setEditText(message.content); setEditing(true) }}
              className="w-5 h-5 flex items-center justify-center rounded text-surface-600 hover:text-surface-300 transition-colors"
              title="Editar mensagem"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

export const CopilotMessageBubble = memo(function CopilotMessageBubble({
  message,
  onResolveBatch,
  onSendFollowup,
  onEdit,
  onSwitchBranch,
  activeAgentLabel,
  activeToolName,
}: {
  message: CopilotMessage
  onResolveBatch?: (batchTcId: string, approvedIds: string[], editedInputs?: Record<string, Record<string, unknown>>) => void
  /** Sends a new user-facing message into the current turn. Used by inline
   *  quick-response chips (e.g. the multi-WABA "choose a line" prompt) so
   *  the operator doesn't have to type the answer. */
  onSendFollowup?: (text: string) => void | Promise<void>
  onEdit?: (newText: string) => void
  onSwitchBranch?: (direction: 'prev' | 'next') => void
  activeAgentLabel?: string | null
  activeToolName?: string | null
}) {
  // ── User: delegate to stateful sub-component ──────────────────────────────
  if (message.role === 'user') {
    return <UserMessageBubble message={message} onEdit={onEdit} onSwitchBranch={onSwitchBranch} />
  }

  // ── AI: detect artifact vs normal ─────────────────────────────────────────
  const artifactType = detectArtifactType(message.content)
  const isArtifact = artifactType !== null
  const displayContent = isArtifact ? extractArtifactContent(message.content) : message.content
  const title = isArtifact ? extractTitle(displayContent, artifactType ?? 'document') : ''

  // Determine what body to show
  let body: React.ReactNode
  if (message.isStreaming) {
    if (isArtifact) {
      body = <ArtifactBuilding content={displayContent} type={artifactType ?? 'document'} />
    } else if (message.content) {
      body = <StreamingText content={displayContent} />
    } else {
      // No content yet — show contextual thinking label with agent + tool context
      body = <ThinkingLabel toolCalls={message.toolCalls} messageStatusLabel={message.statusLabel} agentLabel={activeAgentLabel} toolLabel={activeToolName} />
    }
  } else if (isArtifact) {
    body = <ArtifactCard content={displayContent} title={title} type={artifactType ?? 'document'} />
  } else {
    const segments = parseContent(displayContent)
    body = segments.length > 0 ? (
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => {
          if (seg.kind === 'code')  return <InlineCode  key={i} lang={seg.lang}      content={seg.content} />
          if (seg.kind === 'plan')  return <InlinePlan  key={i} title={seg.title}    items={seg.items}     />
          if (seg.kind === 'table') return <InlineTable key={i} headers={seg.headers} rows={seg.rows}      />
          return <RenderProse key={i} lines={seg.lines} />
        })}
      </div>
    ) : null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-3 max-w-[88%]"
    >
      {/* AI identity */}
      <div className="flex items-center gap-2">
        <CopilotIcon spinning={message.isStreaming} />
        <AnimatePresence mode="wait">
          <motion.span
            key={message.isStreaming ? 'busy' : 'idle'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-semibold text-surface-500"
          >
            Oryon AI
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Phase 9: live task plan. Tool calls tagged with a stepId are shown
          nested inside the corresponding step; untagged ones appear below. */}
      {message.plan && (
        <div className="ml-8">
          <PlanCard plan={message.plan} toolCalls={message.toolCalls} />
        </div>
      )}

      {/* Setup required nudge — short-circuit response from the orchestrator
          when a prerequisite is missing (e.g. no WhatsApp line). Clean CTA
          card, rendered inline WITHOUT a plan/tool chip around it. */}
      {message.setupRequired && (
        <div className="ml-8 mt-2">
          <SetupRequiredCard setup={message.setupRequired} />
        </div>
      )}

      {/* Tool chips. When a plan exists, only show orphan chips (no stepId) —
          the tagged ones are already rendered inline inside the PlanCard. */}
      {message.toolCalls && message.toolCalls.length > 0 && (() => {
        const visible = message.plan
          ? message.toolCalls.filter((tc) => !tc.stepId)
          : message.toolCalls
        if (visible.length === 0) return null
        return (
          <div className="flex flex-col gap-1.5 ml-8">
            {visible.map((tc, i) => (
              <ToolCallChip key={tc.id || i} tc={tc} onResolveBatch={onResolveBatch} onSendFollowup={onSendFollowup} />
            ))}
          </div>
        )
      })()}

      {/* Execution context — shows agent activity even during artifact building */}
      {message.isStreaming && message.content && (activeAgentLabel || activeToolName) && (
        <div className="ml-8 mb-1">
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 py-1"
          >
            <Loader2 className="w-3 h-3 text-status-pending animate-spin flex-shrink-0" />
            <div className="flex flex-col">
              {activeAgentLabel && (
                <span className="text-[11px] text-status-pending/70">{activeAgentLabel}</span>
              )}
              {activeToolName && (
                <span className="text-[11px] text-status-pending">{activeToolName}</span>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Body */}
      {body && (
        <div className="ml-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={message.isStreaming ? 'streaming' : 'done'}
              initial={{ opacity: message.isStreaming ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {body}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
})
