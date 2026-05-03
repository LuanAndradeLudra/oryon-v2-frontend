import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Search, Bell, Sparkles, Home, MessageSquare, BarChart3, Users, Send,
  Megaphone, Workflow, Bot, MessagesSquare, Settings, Building2,
  Smartphone, CreditCard, UserPlus, Zap, X, Tag, Clock,
  Filter, Download, PlusCircle, ArrowRight, ChevronRight,
  LayoutGrid, List, KanbanSquare, FileText, Inbox,
  Globe, Users2, BellRing, Plug, BookOpen,
  AlertCircle, AtSign, Megaphone as MegaphoneIcon, ShieldAlert, UserCheck,
  Menu,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCopilotContext } from '@/contexts/CopilotContext'
import { useTopBarActions } from '@/contexts/TopBarActionsContext'
import { useMobileNav } from '@/contexts/MobileNavContext'
import {
  useNotifications,
  type AppNotification,
  type NotificationMetaKnown,
  type NotificationSourceKind,
} from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { isFeatureVisible, isRouteVisible } from '@/config/featureFlags'
import {
  categoryOf,
  CATEGORY_STYLE,
  priorityOf,
  PRIORITY_STYLE,
  avatarColorFor,
  initialsOf,
  contactSubject,
  formatListTime,
  inlineActionFor,
  emptyStateFor,
} from '@/lib/notificationsUx'

// ── Page title map ─────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/conversations': 'Conversas',
  '/dashboard': 'Dashboard',
  '/contacts': 'Contatos',
  '/campaigns': 'Disparos',
  '/marketing': 'Marketing',
  '/automations': 'Automações',
  '/agents': 'Agentes IA',
  '/copilot': 'Copilot AI',
  '/team': 'Nexus',
  '/settings': 'Configurações',
}

// ── Search index ───────────────────────────────────────────────────────────────

type SearchItemType = 'page' | 'action' | 'settings'

type SearchItem = {
  type: SearchItemType
  label: string
  description: string
  href: string
  Icon: React.ComponentType<{ className?: string }>
  keywords?: string[]
}

// `as SearchItem[]` is here because TS narrows the literal `type: 'page'` away
// when the array contains 80+ heterogeneous entries — cheap to keep the
// runtime shape correct since SearchItemType is a closed union of 3 values.
const SEARCH_INDEX = ([
  // ── Páginas principais
  { type: 'page', label: 'Home', description: 'Visão geral e atalhos rápidos', href: '/home', Icon: Home, keywords: ['início', 'painel', 'overview'] },
  { type: 'page', label: 'Conversas', description: 'Atendimento via WhatsApp', href: '/conversations', Icon: MessageSquare, keywords: ['whatsapp', 'chat', 'atendimento', 'mensagens'] },
  { type: 'page', label: 'Dashboard', description: 'Métricas, relatórios e KPIs', href: '/dashboard', Icon: BarChart3, keywords: ['métricas', 'relatório', 'gráfico', 'dados', 'análise'] },
  { type: 'page', label: 'Contatos', description: 'CRM e pipeline de leads', href: '/contacts', Icon: Users, keywords: ['crm', 'leads', 'clientes', 'pipeline', 'kanban'] },
  { type: 'page', label: 'Disparos', description: 'Campanhas de mensagens em massa', href: '/campaigns', Icon: Send, keywords: ['campanhas', 'broadcast', 'envio', 'massa'] },
  { type: 'page', label: 'Marketing', description: 'Meta Ads e funil de conversão', href: '/marketing', Icon: Megaphone, keywords: ['meta', 'ads', 'facebook', 'instagram', 'funil', 'tráfego'] },
  { type: 'page', label: 'Automações', description: 'Fluxos e regras automáticas', href: '/automations', Icon: Workflow, keywords: ['fluxo', 'regras', 'bot', 'trigger', 'automático'] },
  { type: 'page', label: 'Agentes IA', description: 'Assistentes autônomos com IA', href: '/agents', Icon: Bot, keywords: ['ia', 'inteligência', 'artificial', 'assistente', 'agente'] },
  { type: 'page', label: 'Copilot AI', description: 'Análise e ação com IA', href: '/copilot', Icon: Sparkles, keywords: ['oryon', 'ai', 'copiloto', 'análise'] },
  { type: 'page', label: 'Nexus', description: 'Chat interno da equipe', href: '/team', Icon: MessagesSquare, keywords: ['time', 'equipe', 'interno', 'chat', 'colaboração'] },

  // ── Ações em Conversas
  { type: 'action', label: 'Conversas abertas', description: 'Filtrar por status: Abertas', href: '/conversations', Icon: Inbox, keywords: ['aberta', 'open', 'filtro'] },
  { type: 'action', label: 'Conversas pendentes', description: 'Filtrar por status: Pendentes', href: '/conversations', Icon: Clock, keywords: ['pendente', 'waiting', 'filtro'] },
  { type: 'action', label: 'Conversas resolvidas', description: 'Filtrar por status: Resolvidas', href: '/conversations', Icon: Filter, keywords: ['resolvida', 'fechada', 'filtro'] },
  { type: 'action', label: 'Minhas conversas', description: 'Conversas atribuídas a mim', href: '/conversations', Icon: MessageSquare, keywords: ['minhas', 'atribuída', 'eu'] },

  // ── Ações em Contatos
  { type: 'action', label: 'Novo contato', description: 'Criar um contato manualmente', href: '/contacts', Icon: PlusCircle, keywords: ['criar', 'adicionar', 'novo', 'lead'] },
  { type: 'action', label: 'Importar contatos', description: 'Importar via CSV ou planilha', href: '/contacts', Icon: Download, keywords: ['importar', 'csv', 'planilha', 'upload'] },
  { type: 'action', label: 'Contatos — vista lista', description: 'Ver contatos em formato lista', href: '/contacts', Icon: List, keywords: ['lista', 'tabela', 'view'] },
  { type: 'action', label: 'Contatos — vista kanban', description: 'Ver pipeline em kanban', href: '/contacts', Icon: KanbanSquare, keywords: ['kanban', 'pipeline', 'board'] },
  { type: 'action', label: 'Segmentos de contatos', description: 'Criar segmentos e grupos', href: '/contacts', Icon: Users2, keywords: ['segmento', 'grupo', 'filtro'] },

  // ── Ações em Disparos
  { type: 'action', label: 'Novo disparo', description: 'Criar nova campanha de mensagens', href: '/campaigns', Icon: PlusCircle, keywords: ['criar', 'nova', 'campanha'] },
  { type: 'action', label: 'Templates de mensagem', description: 'Gerenciar templates aprovados', href: '/campaigns', Icon: FileText, keywords: ['template', 'modelo', 'hsm', 'mensagem'] },
  { type: 'action', label: 'Histórico de campanhas', description: 'Ver campanhas enviadas', href: '/campaigns', Icon: Clock, keywords: ['histórico', 'enviadas', 'passadas'] },

  // ── Ações em Automações
  { type: 'action', label: 'Nova automação', description: 'Criar um fluxo automático', href: '/automations', Icon: PlusCircle, keywords: ['criar', 'novo', 'fluxo'] },
  { type: 'action', label: 'Galeria de automações', description: 'Modelos prontos para usar', href: '/automations', Icon: LayoutGrid, keywords: ['galeria', 'templates', 'modelos'] },

  // ── Ações em Agentes IA
  { type: 'action', label: 'Criar agente IA', description: 'Configurar novo agente autônomo', href: '/agents', Icon: PlusCircle, keywords: ['criar', 'novo', 'agente'] },
  { type: 'action', label: 'Construtor de agentes', description: 'Wizard de criação de agentes', href: '/agents', Icon: Bot, keywords: ['wizard', 'builder', 'construtor'] },

  // ── Ações em Marketing
  { type: 'action', label: 'Meta Ads', description: 'Gestão de anúncios no Facebook/Instagram', href: '/marketing', Icon: Globe, keywords: ['anúncios', 'ads', 'facebook', 'instagram'] },
  { type: 'action', label: 'Funil de marketing', description: 'Visualizar funil de atribuição', href: '/marketing', Icon: BarChart3, keywords: ['funil', 'atribuição', 'conversão'] },

  // ── Ações no Copilot
  { type: 'action', label: 'Sessões do Copilot', description: 'Histórico de conversas com IA', href: '/copilot', Icon: BookOpen, keywords: ['sessões', 'histórico', 'conversas'] },

  // ── Dashboard
  { type: 'action', label: 'Relatório de agentes', description: 'Performance por atendente', href: '/dashboard', Icon: Users, keywords: ['agentes', 'atendentes', 'performance'] },
  { type: 'action', label: 'Métricas de conversas', description: 'Volume, tempo de resposta e CSAT', href: '/dashboard', Icon: BarChart3, keywords: ['volume', 'csat', 'tempo', 'resposta'] },

  // ── Configurações
  { type: 'settings', label: 'Minha conta', description: 'Perfil pessoal e senha', href: '/settings/account', Icon: Settings, keywords: ['perfil', 'senha', 'conta', 'pessoal'] },

  { type: 'settings', label: 'Equipe', description: 'Membros, funções, setores e permissões', href: '/settings/team', Icon: Users, keywords: ['membros', 'usuários', 'permissões', 'funções', 'setores', 'departamentos', 'grupos', 'times'] },
  { type: 'settings', label: 'WhatsApp — Números', description: 'Números de WhatsApp conectados', href: '/settings/whatsapp', Icon: Smartphone, keywords: ['numero', 'numeros', 'waba', 'meta', 'business', 'telefone', 'chip', 'conectar'] },
  { type: 'settings', label: 'Plano e cobrança', description: 'Assinatura, limites e faturas', href: '/settings/billing', Icon: CreditCard, keywords: ['plano', 'fatura', 'assinatura', 'pagamento', 'upgrade', 'limite', 'mensalidade'] },
  { type: 'settings', label: 'Etiquetas', description: 'Gerenciar tags de conversas', href: '/settings/tags', Icon: Tag, keywords: ['tags', 'etiquetas', 'labels', 'marcadores'] },
  { type: 'settings', label: 'Horários de atendimento', description: 'Definir horários e expediente', href: '/settings/hours', Icon: Clock, keywords: ['horario', 'expediente', 'disponibilidade', 'fora do horario', 'funcionamento'] },
  { type: 'settings', label: 'Notificações', description: 'Preferências de alertas', href: '/settings/notifications', Icon: BellRing, keywords: ['alertas', 'avisos', 'push', 'email'] },
  { type: 'settings', label: 'Integrações', description: 'Webhooks e APIs externas', href: '/settings/integrations', Icon: Plug, keywords: ['webhook', 'api', 'zapier', 'n8n', 'integracao', 'conectar', 'externo'] },
  { type: 'settings', label: 'Empresa', description: 'Dados, setores e configurações da organização', href: '/settings/company', Icon: Building2, keywords: ['empresa', 'organizacao', 'cnpj', 'logo', 'setores', 'departamentos', 'nome'] },
] as SearchItem[]).filter((item) => isRouteVisible(item.href))

// ── Notification types ─────────────────────────────────────────────────────────
//
// Phase 20: maps EACH backend notification type to a specific lucide icon.
// Previously we only had a coarse 5-bucket mapping that ALWAYS fell through
// to 'system' (since backend types don't match the bucket keys), making
// every row show a yellow warning icon. Fixed here by using the real type
// strings as keys and falling back to a neutral Bell for unknown types.

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  new_message: MessageSquare,
  conversation_assigned: UserCheck,
  conversation_transferred: UserCheck,
  agent_handoff: Bot,
  agent_ai_response: Sparkles,
  conversation_waiting: Clock,
  team_message: MessagesSquare,
  mention: AtSign,
  campaign_complete: Send,
  campaign_failed: AlertCircle,
  automation_executed: Workflow,
  automation_note: Zap,
  whatsapp_integration_error: Plug,
  security_alert: ShieldAlert,
}

function iconFor(type: string): React.ComponentType<{ className?: string }> {
  return TYPE_ICON[type] ?? Bell
}

/** Groups notifications by relative-date bucket (Hoje / Ontem / Esta semana / Anteriores). */
function groupByDate(items: AppNotification[]): Array<{ label: string; items: AppNotification[] }> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const startOfWeek = startOfToday - 6 * 86_400_000

  const buckets: Record<string, AppNotification[]> = { Hoje: [], Ontem: [], 'Esta semana': [], Anteriores: [] }
  for (const n of items) {
    const t = new Date(n.createdAt).getTime()
    if (t >= startOfToday) buckets['Hoje'].push(n)
    else if (t >= startOfYesterday) buckets['Ontem'].push(n)
    else if (t >= startOfWeek) buckets['Esta semana'].push(n)
    else buckets['Anteriores'].push(n)
  }
  return Object.entries(buckets)
    .filter(([, arr]) => arr.length > 0)
    .map(([label, items]) => ({ label, items }))
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<SearchItemType, string> = {
  page: 'Páginas',
  action: 'Ações',
  settings: 'Configurações',
}

const TYPE_ORDER: SearchItemType[] = ['page', 'action', 'settings']

// Remove diacritics so "numeros" matches "números", "setores" matches, etc.
function norm(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function highlightText(text: string, query: string) {
  if (!query) return <>{text}</>
  const nText = norm(text)
  const nQuery = norm(query)
  const idx = nText.indexOf(nQuery)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand-600/20 text-brand-300 rounded-sm not-italic font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function scoreItem(item: SearchItem, q: string): number {
  const ql    = norm(q)
  const label = norm(item.label)
  const desc  = norm(item.description)
  const kws   = norm((item.keywords ?? []).join(' '))
  if (label.startsWith(ql)) return 3
  if (label.includes(ql))   return 2
  if (desc.includes(ql) || kws.includes(ql)) return 1
  return 0
}

// ── Inline search dropdown ─────────────────────────────────────────────────────

function SearchDropdown({
  query,
  activeIndex,
  onSelect,
  onHover,
}: {
  query: string
  activeIndex: number
  onSelect: (item: SearchItem) => void
  onHover: (flatIdx: number) => void
}) {
  const trimmed = query.trim()

  // Build filtered + scored list
  const scored = SEARCH_INDEX
    .map((item) => ({ item, score: scoreItem(item, trimmed) }))
    .filter(({ score }) => score > 0 || trimmed === '')
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)

  // Limit to 10 when filtering, all when empty
  const results = trimmed ? scored.slice(0, 10) : SEARCH_INDEX.slice(0, 8)

  // Group by type, in fixed order
  const groups = TYPE_ORDER
    .map((type) => ({ type, items: results.filter((i) => i.type === type) }))
    .filter(({ items }) => items.length > 0)

  // Flat index for keyboard navigation
  let flatCounter = 0
  const flatItems: SearchItem[] = []
  groups.forEach(({ items }) => items.forEach((i) => flatItems.push(i)))

  if (results.length === 0 && trimmed) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-900 border border-surface-700 rounded-xl shadow-xl z-50 py-4 text-center">
        <p className="text-xs text-surface-500">Nenhum resultado para <strong className="text-surface-300">"{trimmed}"</strong></p>
        <p className="text-[11px] text-surface-600 mt-1">Tente buscar contatos diretamente na página de Contatos</p>
      </div>
    )
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-900 border border-surface-700 rounded-xl shadow-xl z-50 overflow-hidden">
      {!trimmed && (
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">
            Sugestões
          </span>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto pb-1">
        {groups.map(({ type, items }) => (
          <div key={type}>
            {trimmed && (
              <div className="px-3 pt-2.5 pb-1 first:pt-2">
                <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">
                  {TYPE_LABEL[type]}
                </span>
              </div>
            )}
            {items.map((item) => {
              const flatIdx = flatCounter++
              const isActive = flatIdx === activeIndex
              const Icon = item.Icon
              return (
                <button
                  key={`${item.href}-${item.label}`}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item) }}
                  onMouseEnter={() => onHover(flatIdx)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                    isActive ? 'bg-surface-800' : 'hover:bg-surface-800/60',
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                    type === 'page'     ? 'bg-brand-600/10 text-brand-400' :
                    type === 'action'   ? 'bg-surface-700 text-surface-400' :
                                         'bg-surface-700 text-surface-500',
                  )}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-100 leading-none mb-0.5">
                      {highlightText(item.label, trimmed)}
                    </p>
                    <p className="text-[11px] text-surface-500 truncate leading-none">
                      {highlightText(item.description, trimmed)}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-surface-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        ))}

        {/* Contact search fallback */}
        {trimmed && (
          <div className="border-t border-surface-800 mt-1 pt-1">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onHover(flatItems.length) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                activeIndex === flatItems.length ? 'bg-surface-800' : 'hover:bg-surface-800/60',
              )}
              onMouseEnter={() => onHover(flatItems.length)}
            >
              <div className="w-6 h-6 rounded-md bg-surface-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3 text-surface-400" />
              </div>
              <p className="text-xs text-surface-300 flex-1 min-w-0 truncate">
                Buscar <strong className="text-surface-100">"{trimmed}"</strong> em Contatos
              </p>
              <ArrowRight className="w-3 h-3 text-surface-500 flex-shrink-0" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Notifications panel ────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff}min`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

/**
 * Phase 20: notification row with full visual treatment:
 *   - 3px left accent strip by category
 *   - Priority ring + pulse for urgent
 *   - Unread: background tint + bold title + 8px dot
 *   - Contact avatar with category icon overlay (when notification is
 *     about a contact) OR plain category icon otherwise
 *   - Contextual timestamp (hoje/ontem/terça)
 *   - Inline primary action on hover (Abrir / Responder / Ver relatório)
 *   - Hover actions: mark-unread, archive
 *   - Keyboard focus ring when active via J/K navigation
 */
function NotificationItem({
  n,
  onClick,
  onArchive,
  onMarkUnread,
  onCategoryClick,
  isFocused = false,
}: {
  n: AppNotification
  onClick: () => void
  onArchive?: () => void
  onMarkUnread?: () => void
  onCategoryClick?: (types: string[]) => void
  isFocused?: boolean
}) {
  const navigate = useNavigate()
  const category = categoryOf(n.type)
  const style = CATEGORY_STYLE[category]
  const priority = priorityOf(n)
  const priorityStyle = PRIORITY_STYLE[priority]
  const Icon = iconFor(n.type)
  const subject = contactSubject(n)
  const action = inlineActionFor(n)

  const handleInlineAction = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!action) return
    navigate(action.href)
  }

  const handleCategoryChip = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCategoryClick?.([n.type])
  }

  return (
    <div
      onClick={onClick}
      role="listitem"
      aria-label={`${n.title}. ${n.isRead ? 'Lida' : 'Não lida'}. ${formatListTime(n.createdAt)}`}
      className={cn(
        'group relative flex items-start gap-3 pl-3 pr-4 py-3 border-l-[3px] cursor-pointer transition-colors',
        // Phase 20 V1: left accent strip by category
        style.stripClass,
        // Phase 20 V3: stronger unread treatment
        !n.isRead ? 'bg-brand-600/[0.04]' : 'bg-transparent',
        // Hover + keyboard focus state
        'hover:bg-surface-800/50',
        isFocused && 'bg-surface-800/60 ring-1 ring-brand-600/40',
        // Phase 20 V2: priority visual
        priorityStyle.containerClass,
        // Touch targets — min-h bump on coarse pointers (R2)
        '[@media(pointer:coarse)]:min-h-[72px]',
      )}
    >
      {/* Avatar + icon overlay. Contact-centric notifications show the
          contact's avatar; others show the plain category icon. */}
      {subject ? (
        <div className="relative flex-shrink-0 mt-0.5">
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white',
              avatarColorFor(subject.name),
            )}
            aria-hidden
          >
            {initialsOf(subject.name)}
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-surface-900 bg-white"
          >
            <Icon className="w-2.5 h-2.5 text-surface-950" />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
            style.iconBg,
          )}
          aria-hidden
        >
          <Icon className={cn('w-4 h-4', style.iconText)} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Title + unread emphasis via weight */}
        <div className="flex items-start gap-2">
          <p
            className={cn(
              'text-xs leading-snug flex-1 min-w-0',
              !n.isRead ? 'font-semibold text-surface-50' : 'font-medium text-surface-200',
            )}
          >
            {n.title}
          </p>
          {priority === 'urgent' && (
            <span
              className={cn(
                'shrink-0 text-[9px] font-bold uppercase tracking-wider text-danger px-1.5 py-0.5 rounded bg-danger/10 border border-danger/30',
                priorityStyle.showPulse && 'animate-pulse',
              )}
            >
              urgente
            </span>
          )}
        </div>

        {n.description && (
          <p
            className={cn(
              'text-xs mt-0.5 line-clamp-2',
              !n.isRead ? 'text-surface-300' : 'text-surface-500',
            )}
          >
            {n.description}
          </p>
        )}

        {/* Meta row: category chip + contextual time + inline action on hover */}
        <div className="flex items-center gap-2 mt-1.5">
          {onCategoryClick && (
            <button
              onClick={handleCategoryChip}
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors',
                style.iconBg,
                style.iconText,
                'hover:brightness-125',
              )}
              title="Filtrar por este tipo"
            >
              {style.label}
            </button>
          )}
          <span className="text-[10px] text-surface-600">{formatListTime(n.createdAt)}</span>
          {action && (
            <button
              onClick={handleInlineAction}
              className={cn(
                'ml-auto text-[10px] font-medium px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                action.variant === 'primary'
                  ? 'bg-brand-600 text-surface-950 hover:bg-brand-500'
                  : 'text-brand-300 hover:bg-brand-600/20',
              )}
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>

      {/* Right-side hover actions (mark unread, archive) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-start mt-1">
        {onMarkUnread && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkUnread() }}
            className="p-1.5 rounded text-surface-500 hover:text-surface-200 hover:bg-surface-800 [@media(pointer:coarse)]:p-2"
            title="Marcar como não lida (U)"
            aria-label="Marcar como não lida"
          >
            <div className="w-3 h-3 rounded-full border-2 border-current" />
          </button>
        )}
        {onArchive && (
          <button
            onClick={(e) => { e.stopPropagation(); onArchive() }}
            className="p-1.5 rounded text-surface-500 hover:text-surface-200 hover:bg-surface-800 [@media(pointer:coarse)]:p-2"
            title="Arquivar (E)"
            aria-label="Arquivar"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Unread indicator — bigger than before */}
      {!n.isRead && (
        <div
          className="absolute right-2 top-3 w-2 h-2 rounded-full bg-brand-cta"
          aria-hidden
        />
      )}
    </div>
  )
}

// Phase 18: metadata keys already rendered by dedicated UI blocks — hidden
// from the advanced details section so we don't duplicate them.
const HANDLED_META_KEYS = new Set([
  'contacts',
  'affectedCount',
  'source',
  'sourceLabel',
  'sourceActor',
  'userNote',
  'trigger',
  'context',
])
// Phase 18: noisy technical fields that don't help a regular user — stripped
// from the collapsed "Detalhes técnicos" too. Keep UUIDs out of the UI.
const TECH_NOISE_KEYS = new Set([
  'automationId',
  'automationType',
  'campaignId',
  'contactId',
  'conversationId',
  'actionsExecuted',
])

const SOURCE_STYLES: Record<NotificationSourceKind, { label: string; className: string }> = {
  manual:     { label: 'Manual',        className: 'bg-brand-600/15 text-brand-300 border-brand-600/30' },
  bulk:       { label: 'Lote',          className: 'bg-brand-600/15 text-brand-300 border-brand-600/30' },
  webhook:    { label: 'WhatsApp',      className: 'bg-success/15 text-success border-success/30' },
  automation: { label: 'Automação',     className: 'bg-warning/15 text-warning border-warning/30' },
  api:        { label: 'API',           className: 'bg-info/15 text-info border-info/30' },
  system:     { label: 'Sistema',       className: 'bg-surface-700/40 text-surface-300 border-surface-600' },
  unknown:    { label: 'Origem n/d',    className: 'bg-surface-700/30 text-surface-400 border-surface-700' },
}

/** Format a Brazilian mobile phone number ("5522992934557") into a readable
 *  string ("+55 22 99293-4557"). Falls back to the raw input if the shape
 *  doesn't match any known pattern. */
function formatPhone(raw?: string | null): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  // +55 (DDD 2) 9XXXX-XXXX — 13 digits total: 55 + 2-digit DDD + 9-digit mobile
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  // (DDD 2) 9XXXX-XXXX — 11 digits (local mobile without country code)
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  // Fallback: return as-is so we never hide the info on unexpected formats.
  return raw
}

/** Relative time ("há 2 min", "agora") up to ~24h, then falls back to a
 *  compact absolute format. Locale is pt-BR. */
function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const diff = Math.floor((Date.now() - d.getTime()) / 1000) // seconds
  if (diff < 30) return 'agora mesmo'
  if (diff < 60) return `há ${diff}s`
  const min = Math.floor(diff / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const days = Math.floor(h / 24)
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
  return d.toLocaleDateString('pt-BR')
}

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

/** One row of the event "fact sheet" — a labeled topic. The value can be a
 *  plain string or a React node (used when we want to embed a colored badge
 *  like the Origem row). */
interface FlowStep {
  label: string
  value: React.ReactNode
}

/** Phase 18: turn the notification's raw metadata into a short, ordered list
 *  of discrete facts. One row = one fact. No prose, no narrative — the UI
 *  renders it as labeled key/value rows so the user scans the event like
 *  they scan a Linear/Stripe event: "origem, gatilho, automação, impacto". */
function buildFlow(
  n: AppNotification,
  meta: NotificationMetaKnown | null,
  sourceStyle: { label: string; className: string },
): FlowStep[] | null {
  if (!meta) return null

  const actor = meta.sourceActor
  const count = meta.affectedCount ?? meta.contacts?.length ?? 0

  // Origem cell — same shape across all types that carry a source.
  const origemCell = (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium', sourceStyle.className)}>
        {sourceStyle.label}
      </span>
      {actor && <span className="text-surface-300">· por {actor}</span>}
    </div>
  )

  if (n.type === 'automation_executed' || meta.context === 'automation_execution') {
    const steps: FlowStep[] = []
    if (meta.source) steps.push({ label: 'Origem', value: origemCell })
    if (meta.trigger?.label) steps.push({ label: 'Gatilho', value: meta.trigger.label })
    if (meta.automationName) steps.push({ label: 'Automação', value: `"${meta.automationName}"` })
    if (count > 0) {
      steps.push({
        label: 'Impacto',
        value: `${count} ${pluralize(count, 'contato', 'contatos')} ${pluralize(count, 'afetado', 'afetados')}`,
      })
    }
    return steps.length > 0 ? steps : null
  }

  if (n.type === 'automation_note' || meta.context === 'automation_trigger') {
    const steps: FlowStep[] = []
    if (meta.source) steps.push({ label: 'Origem', value: origemCell })
    if (meta.trigger?.label) steps.push({ label: 'Gatilho', value: meta.trigger.label })
    if (meta.automationName) steps.push({ label: 'Automação', value: `"${meta.automationName}"` })
    if (count > 0) {
      steps.push({
        label: 'Impacto',
        value: `${count} ${pluralize(count, 'contato', 'contatos')}`,
      })
    }
    return steps.length > 0 ? steps : null
  }

  if (n.type === 'campaign_complete' || meta.context === 'campaign_completion') {
    const steps: FlowStep[] = []
    if (meta.campaignName) steps.push({ label: 'Campanha', value: `"${meta.campaignName}"` })
    if (meta.templateName) steps.push({ label: 'Template', value: meta.templateName })
    const sent = meta.sent ?? 0
    const failed = meta.failed ?? 0
    const total = meta.totalContacts ?? count
    if (sent > 0 || failed > 0) {
      const parts: string[] = [`${sent} ${pluralize(sent, 'enviada', 'enviadas')}`]
      if (failed > 0) parts.push(`${failed} ${pluralize(failed, 'falha', 'falhas')}`)
      steps.push({ label: 'Envio', value: parts.join(' · ') })
    }
    if (total > 0) {
      steps.push({ label: 'Total', value: `${total} ${pluralize(total, 'contato', 'contatos')}` })
    }
    return steps.length > 0 ? steps : null
  }

  return null
}

// Human-readable labels for the "Detalhes técnicos" fallback section.
const TECH_FIELD_LABELS: Record<string, string> = {
  automationName: 'Automação',
  campaignName: 'Campanha',
  templateName: 'Template',
  note: 'Nota',
  sent: 'Enviadas',
  failed: 'Falhas',
  totalContacts: 'Total de contatos',
}

/** Modal that shows the full notification + metadata when available. */
function NotificationDetailModal({ n, onClose }: { n: AppNotification; onClose: () => void }) {
  const navigate = useNavigate()
  const [showTech, setShowTech] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const category = categoryOf(n.type)
  const catStyle = CATEGORY_STYLE[category]
  const Icon = iconFor(n.type)
  const meta = (n.metadata ?? null) as NotificationMetaKnown | null
  const groupedContacts = meta?.contacts
  const affectedTotal = meta?.affectedCount ?? (groupedContacts?.length ?? 0)
  const sourceKind: NotificationSourceKind = (meta?.source?.kind ?? 'unknown') as NotificationSourceKind
  const sourceStyle = SOURCE_STYLES[sourceKind] ?? SOURCE_STYLES.unknown
  const userNote = meta?.userNote
  const flow = buildFlow(n, meta, sourceStyle)

  // Absolute timestamp, shown next to the relative one.
  const abs = new Date(n.createdAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // Tech details: trimmed to human-meaningful keys only (no UUIDs, no internal
  // type strings). We render them only when the user asks for it.
  const techEntries = n.metadata
    ? Object.entries(n.metadata)
        .filter(([k]) => !HANDLED_META_KEYS.has(k) && !TECH_NOISE_KEYS.has(k))
    : []

  // Phase 20 X5: focus trap + ESC to close + return focus to opener.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const container = modalRef.current
    if (!container) return

    // Focus the close button initially — gives keyboard users an
    // obvious way out.
    const focusables = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )
    focusables[0]?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      // Trap: cycle focus within the modal.
      const list = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // Return focus to the item that opened us, if it still exists in DOM.
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [onClose])

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.96, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: 8 },
        transition: { duration: 0.15, ease: 'easeOut' as const },
      }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-modal-title"
    >
      <motion.div
        ref={modalRef}
        {...motionProps}
        className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-surface-800">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              catStyle.iconBg,
            )}
            aria-hidden
          >
            <Icon className={cn('w-5 h-5', catStyle.iconText)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="notif-modal-title" className="text-sm font-semibold text-surface-100 leading-snug">{n.title}</h3>
            <p className="text-[11px] text-surface-500 mt-0.5" title={abs}>
              {formatRelativeTime(n.createdAt)} <span className="text-surface-700">·</span> {abs}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-surface-500 hover:text-surface-200 transition-colors p-1.5 rounded [@media(pointer:coarse)]:p-2"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 space-y-3 overflow-y-auto">
          {/* Fact-sheet flow — one row per discrete fact. Replaces the raw
              description line so we don't duplicate info. Keys on the left,
              values on the right. Scannable in < 1 second. */}
          {flow && flow.length > 0 ? (
            <dl className="rounded-xl border border-surface-800 bg-surface-950/40 overflow-hidden">
              {flow.map((step, i) => (
                <div
                  key={step.label}
                  className={cn(
                    'flex items-baseline gap-3 px-3.5 py-2.5',
                    i !== flow.length - 1 && 'border-b border-surface-800/60',
                  )}
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 w-20 shrink-0">
                    {step.label}
                  </dt>
                  <dd className="flex-1 min-w-0 text-sm text-surface-100 break-words">
                    {step.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : n.description ? (
            <p className="text-sm text-surface-200 leading-relaxed">{n.description}</p>
          ) : null}

          {/* Grouped contacts list — name first, phone formatted and smaller. */}
          {groupedContacts && groupedContacts.length > 0 && (
            <div className="rounded-xl border border-surface-800 bg-surface-950/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-500 mb-2">
                {pluralize(affectedTotal, 'Contato afetado', 'Contatos afetados')} ({affectedTotal})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {groupedContacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-800/40"
                  >
                    <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                      <UserPlus className="w-3.5 h-3.5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-100 font-medium truncate">
                        {c.name ?? 'Sem nome'}
                      </p>
                      {c.phone && (
                        <p className="text-[11px] text-surface-500 truncate">{formatPhone(c.phone)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {affectedTotal > groupedContacts.length && (
                  <p className="text-[11px] text-surface-500 text-center py-1.5">
                    e mais {affectedTotal - groupedContacts.length} {pluralize(affectedTotal - groupedContacts.length, 'contato', 'contatos')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* User's supplemental note (from send_note action). Clearly labeled
              so it's never mistaken for the system-generated narrative above. */}
          {userNote && (
            <div className="rounded-xl border border-brand-600/20 bg-brand-600/5 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-300 mb-1">
                Observação da automação
              </p>
              <p className="text-xs text-surface-200 leading-relaxed whitespace-pre-line break-words">
                {userNote}
              </p>
            </div>
          )}

          {/* Advanced details — collapsed by default, stripped of UUIDs. */}
          {techEntries.length > 0 && (
            <div className="rounded-xl border border-surface-800 bg-surface-950/30">
              <button
                type="button"
                onClick={() => setShowTech((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-surface-400 hover:text-surface-200 transition-colors"
              >
                <span>{showTech ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}</span>
                <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', showTech && 'rotate-90')} />
              </button>
              {showTech && (
                <dl className="px-3 pb-3 space-y-1.5 text-xs">
                  {techEntries.slice(0, 8).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="text-surface-500 min-w-28 flex-shrink-0 capitalize">
                        {TECH_FIELD_LABELS[k] ?? k}
                      </dt>
                      <dd className="text-surface-200 min-w-0 break-words">{formatMetaValue(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {isValidLink(n.link) && (
            <button
              onClick={() => { navigate(n.link!); onClose() }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-semibold transition-colors [@media(pointer:coarse)]:py-3"
            >
              Abrir <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function formatMetaValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') {
    // Give nested structures a readable shape instead of a minified JSON blob.
    // For arrays just show count. For objects show summary or the first 120
    // chars of a pretty JSON — whichever is shorter. Keeps the modal tidy
    // even when the backend attaches rich context.
    if (Array.isArray(v)) return `${v.length} item(s)`
    try {
      const pretty = JSON.stringify(v)
      if (pretty.length <= 120) return pretty
      return pretty.slice(0, 117) + '…'
    } catch {
      return '[objeto não serializável]'
    }
  }
  return String(v)
}

/** Accepts only in-app paths that start with '/' and look like a route —
 *  prevents navigating to '/campaigns/undefined' or external URLs that
 *  slipped in via buggy metadata. */
function isValidLink(link: string | null | undefined): boolean {
  if (!link || typeof link !== 'string') return false
  const trimmed = link.trim()
  if (!trimmed.startsWith('/')) return false
  if (trimmed.includes('/undefined') || trimmed.includes('/null')) return false
  return true
}

type NotifFilter = 'all' | 'unread'

// Phase 19: category chips — maps UI label to the set of notification
// types the backend filters on.
const CATEGORY_CHIPS: Array<{ key: string; label: string; types: string[] }> = [
  { key: 'all', label: 'Todas', types: [] },
  { key: 'conversations', label: 'Conversas', types: ['new_message', 'conversation_assigned', 'conversation_transferred', 'agent_handoff', 'agent_ai_response', 'conversation_waiting'] },
  { key: 'team', label: 'Equipe', types: ['team_message', 'mention'] },
  { key: 'campaigns', label: 'Campanhas', types: ['campaign_complete', 'campaign_failed'] },
  { key: 'automations', label: 'Automações', types: ['automation_executed', 'automation_note'] },
  { key: 'security', label: 'Segurança', types: ['whatsapp_integration_error', 'security_alert'] },
]

function NotificationsPanel() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    archive,
    markAsUnread,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    setFilterTypes,
    showArchived,
    setShowArchived,
  } = useNotifications()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<NotifFilter>('unread')
  const [detail, setDetail] = useState<AppNotification | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('')
  const panelRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Read tab (unread/all) is a client-side filter over the already-fetched
  // list; category chip drives the backend `type` filter (so we don't
  // re-fetch on every unread toggle).
  const visible = useMemo(() => (
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications
  ), [filter, notifications])

  // Phase 20 V2: urgent priority items bubble to the top, preserving order
  // within each priority band. Stable sort via index.
  const sortedVisible = useMemo(() => {
    const weight = (p?: string) => (p === 'urgent' ? 0 : p === 'low' ? 2 : 1)
    return [...visible]
      .map((n, idx) => ({ n, idx }))
      .sort((a, b) => {
        const d = weight(a.n.priority) - weight(b.n.priority)
        return d !== 0 ? d : a.idx - b.idx
      })
      .map((x) => x.n)
  }, [visible])

  const groups = groupByDate(sortedVisible)
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleCategoryClick = useCallback((chip: typeof CATEGORY_CHIPS[number]) => {
    setActiveCategory(chip.key)
    setFilterTypes(chip.types)
    setFocusedIndex(-1)
  }, [setFilterTypes])

  // Phase 20 I5: clicking a category chip inside a notification item filters
  // the whole list by that single type. Fast drill-down.
  const handleItemCategoryClick = useCallback((types: string[]) => {
    setActiveCategory('custom')
    setFilterTypes(types)
    setFocusedIndex(-1)
  }, [setFilterTypes])

  const handleItemClick = useCallback((n: AppNotification) => {
    if (!n.isRead) markAsRead(n.id)
    if (n.metadata && Object.keys(n.metadata).length > 0) {
      setDetail(n)
    } else if (isValidLink(n.link)) {
      navigate(n.link!)
    }
  }, [markAsRead, navigate])

  // Phase 20 X1: keyboard navigation. Captured only while the panel is
  // mounted — binds to window so arrow keys work regardless of which child
  // has focus. Items are selected by index into flatItems.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in an input or when the detail modal is open
      // (the modal has its own key handling).
      if (detail) return
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (flatItems.length === 0) return

      const len = flatItems.length
      const moveDown = () => setFocusedIndex((i) => Math.min(len - 1, (i < 0 ? 0 : i + 1)))
      const moveUp = () => setFocusedIndex((i) => Math.max(0, (i < 0 ? 0 : i - 1)))

      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') { e.preventDefault(); moveDown(); return }
      if (e.key === 'ArrowUp'   || e.key.toLowerCase() === 'k') { e.preventDefault(); moveUp(); return }
      if (e.key === 'Enter' && focusedIndex >= 0) { e.preventDefault(); handleItemClick(flatItems[focusedIndex]); return }
      const active = focusedIndex >= 0 ? flatItems[focusedIndex] : null
      if (!active) return
      if (e.key.toLowerCase() === 'e' && !showArchived) { e.preventDefault(); archive(active.id); return }
      if (e.key.toLowerCase() === 'u') {
        e.preventDefault()
        if (active.isRead) markAsUnread(active.id)
        else markAsRead(active.id)
        return
      }
      if (e.key.toLowerCase() === 'a' && unreadCount > 0) { e.preventDefault(); markAllAsRead(); return }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [flatItems, focusedIndex, detail, showArchived, archive, markAsUnread, markAsRead, markAllAsRead, unreadCount, handleItemClick])

  // Phase 20 X5: announce the newest notification to screen readers when
  // the list grows. Only announces the TITLE of the top item so the user
  // isn't flooded.
  useEffect(() => {
    if (notifications.length === 0) return
    const top = notifications[0]
    if (!top || top.isRead) return
    setAriaAnnouncement(`Nova notificação: ${top.title}`)
    const t = setTimeout(() => setAriaAnnouncement(''), 1500)
    return () => clearTimeout(t)
  }, [notifications])

  const empty = emptyStateFor(activeCategory, filter, showArchived)

  // Scroll focused item into view when keyboard nav moves past viewport.
  useEffect(() => {
    if (focusedIndex < 0 || !panelRef.current) return
    const el = panelRef.current.querySelector<HTMLElement>(`[data-notif-index="${focusedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [focusedIndex, prefersReducedMotion])

  return (
    <>
      {/* Phase 20 X5: aria-live for screen readers. Polite so it doesn't
          interrupt the user's flow but still gets announced. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      <div className="absolute top-full right-0 mt-2 w-[26rem] max-w-[calc(100vw-1rem)] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-in-right">
        <div className="px-4 py-3 border-b border-surface-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-surface-100">Notificações</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={cn(
                  'text-[11px] transition-colors',
                  showArchived ? 'text-brand-300' : 'text-surface-500 hover:text-surface-300',
                )}
                title={showArchived ? 'Voltar às ativas' : 'Ver arquivadas'}
              >
                {showArchived ? '← ativas' : 'arquivadas'}
              </button>
              {unreadCount > 0 && !showArchived && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors"
                  title="Marcar todas como lidas (A)"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </div>

          {!showArchived && (
            <div className="flex items-center gap-1">
              <FilterTab active={filter === 'unread'} onClick={() => setFilter('unread')} count={unreadCount}>Não lidas</FilterTab>
              <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>Todas</FilterTab>
            </div>
          )}

          {/* Phase 19: category chips — narrows the server-side type filter. */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-hide">
            {CATEGORY_CHIPS.map((chip) => (
              <button
                key={chip.key}
                onClick={() => handleCategoryClick(chip)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-medium border shrink-0 transition-colors',
                  activeCategory === chip.key
                    ? 'bg-brand-600/20 border-brand-600/40 text-brand-200'
                    : 'bg-surface-800/40 border-surface-700 text-surface-400 hover:text-surface-200',
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={panelRef} className="max-h-[28rem] overflow-y-auto" role="list">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedVisible.length === 0 ? (
            <EmptyState title={empty.title} hint={empty.hint} />
          ) : (
            <>
              {/* Phase 20 X2: animated list. AnimatePresence handles enter/exit
                  for new and archived items. Reduced-motion disables transitions. */}
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-500 bg-surface-950/40 sticky top-0 backdrop-blur-sm">
                    {g.label}
                  </div>
                  <AnimatePresence initial={false}>
                    {g.items.map((n) => {
                      const flatIdx = flatItems.findIndex((it) => it.id === n.id)
                      return (
                        <motion.div
                          key={n.id}
                          data-notif-index={flatIdx}
                          layout={!prefersReducedMotion}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 20, transition: { duration: 0.15 } }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                        >
                          <NotificationItem
                            n={n}
                            onClick={() => handleItemClick(n)}
                            onArchive={!showArchived ? () => archive(n.id) : undefined}
                            onMarkUnread={!showArchived && n.isRead ? () => markAsUnread(n.id) : undefined}
                            onCategoryClick={handleItemCategoryClick}
                            isFocused={focusedIndex === flatIdx}
                          />
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              ))}
              {hasMore && (
                <div className="py-3 text-center">
                  <button
                    onClick={() => loadMore()}
                    disabled={loadingMore}
                    className="text-[11px] text-brand-400 hover:text-brand-300 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? 'Carregando…' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Phase 20 X1: keyboard shortcuts hint bar. Discoverable without
            being in the way. */}
        {sortedVisible.length > 0 && (
          <div className="hidden sm:flex items-center justify-center gap-3 px-3 py-1.5 border-t border-surface-800 bg-surface-950/50 text-[9px] text-surface-600">
            <Kbd>J</Kbd><Kbd>K</Kbd> navegar
            <Kbd>↵</Kbd> abrir
            <Kbd>E</Kbd> arquivar
            <Kbd>U</Kbd> lida/não
            <Kbd>A</Kbd> todas
          </div>
        )}
      </div>
      <AnimatePresence>
        {detail && <NotificationDetailModal n={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </>
  )
}

/** Kbd chip for the shortcut hints bar. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1 py-0.5 rounded border border-surface-700 bg-surface-900 text-surface-400 font-mono text-[9px] leading-none">
      {children}
    </span>
  )
}

/** Phase 20 I3: empty state with contextual copy per filter. */
function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-800/60 mb-3">
        <Bell className="w-4 h-4 text-surface-500" />
      </div>
      <p className="text-xs font-medium text-surface-300">{title}</p>
      {hint && <p className="text-[11px] text-surface-500 mt-1">{hint}</p>}
    </div>
  )
}

function FilterTab({ active, onClick, count, children }: {
  active: boolean
  onClick: () => void
  count?: number
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
        active
          ? 'bg-surface-800 text-surface-100'
          : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50',
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-brand-cta text-surface-950 text-[9px] font-semibold px-1.5 min-w-4 text-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

// ── TopBar ─────────────────────────────────────────────────────────────────────

export function TopBar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const { open: openCopilot } = useCopilotContext()
  const { pageActions } = useTopBarActions()
  const { unreadCount } = useNotifications()
  const { toggle: toggleMobileNav } = useMobileNav()

  const [query,       setQuery]       = useState('')
  const [dropOpen,    setDropOpen]    = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(0)
  const [notifOpen,   setNotifOpen]   = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const notifRef  = useRef<HTMLDivElement>(null)

  // Derived
  const segment   = '/' + location.pathname.split('/')[1]
  const pageTitle = PAGE_TITLES[segment] ?? ''

  // Flat list for keyboard nav (rebuilt per render — cheap)
  const flatItems: SearchItem[] = (() => {
    const trimmed = query.trim()
    const scored = SEARCH_INDEX
      .map((item) => ({ item, score: scoreItem(item, trimmed) }))
      .filter(({ score }) => score > 0 || trimmed === '')
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
    return trimmed ? scored.slice(0, 10) : SEARCH_INDEX.slice(0, 8)
  })()

  // Total navigable items (including "search in contacts" row when query present)
  const totalNav = query.trim() ? flatItems.length + 1 : flatItems.length

  // Click outside — search
  useEffect(() => {
    if (!dropOpen) return
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  // Click outside — notifications
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  // Reset active index when query changes
  useEffect(() => { setActiveIdx(0) }, [query])

  const handleSelect = (item: SearchItem) => {
    navigate(item.href)
    setQuery('')
    setDropOpen(false)
    inputRef.current?.blur()
  }

  const handleContactSearch = (q: string) => {
    navigate(`/contacts?search=${encodeURIComponent(q)}`)
    setQuery('')
    setDropOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropOpen) return
    if (e.key === 'Escape') {
      setDropOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, totalNav - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = query.trim()
      // Contact-search row only reachable when user ArrowDown'd past all results
      if (activeIdx === flatItems.length && flatItems.length > 0 && trimmed) {
        handleContactSearch(trimmed)
      } else if (flatItems[activeIdx]) {
        handleSelect(flatItems[activeIdx])
      }
      // No results + Enter → do nothing (don't redirect anywhere)
    }
  }

  return (
    <div className="h-12 flex-shrink-0 bg-black border-b border-surface-700/50 px-4 flex items-center gap-3">

      {/* Mobile-only hamburger — opens the nav drawer (AppShell renders it). */}
      <button
        type="button"
        onClick={toggleMobileNav}
        aria-label="Abrir menu"
        className="md:hidden -ml-1 w-9 h-9 flex items-center justify-center rounded-lg text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors flex-shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Left: page title */}
      <span className="text-sm font-semibold text-surface-100 w-32 flex-shrink-0 truncate">
        {pageTitle}
      </span>

      {/* Center: inline search */}
      <div ref={searchRef} className="flex-1 max-w-md relative">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors',
          dropOpen
            ? 'bg-surface-800 border-brand-500/40 ring-2 ring-brand-500/10'
            : 'bg-surface-800 border-surface-700/60 hover:border-surface-600',
        )}>
          <Search className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setDropOpen(true) }}
            onFocus={() => setDropOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas, ações, configurações..."
            className="flex-1 bg-transparent text-surface-100 placeholder-surface-500 outline-none text-xs min-w-0"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              className="text-surface-500 hover:text-surface-300 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-surface-700 text-[10px] text-surface-400 font-medium flex-shrink-0">
              /
            </kbd>
          )}
        </div>

        {dropOpen && (
          <SearchDropdown
            query={query}
            activeIndex={activeIdx}
            onSelect={handleSelect}
            onHover={setActiveIdx}
          />
        )}
      </div>

      {/* Right: page-specific actions + global buttons */}
      <div className="ml-auto flex items-center gap-1.5">

        {/* Page actions slot */}
        {pageActions && (
          <>
            {pageActions}
            <div className="w-px h-5 bg-surface-700/60 mx-0.5 flex-shrink-0" />
          </>
        )}

        {/* Copilot drawer shortcut — mirrors the admin + route gate used by
             the CopilotPanel itself, so the button only shows where the drawer
             can actually render. */}
        {isFeatureVisible('copilot') && (user?.role === 'admin' || user?.role === 'business_admin') && !location.pathname.startsWith('/copilot') && (
          <button
            onClick={() => openCopilot()}
            title="Abrir Copilot"
            aria-label="Abrir Copilot"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-brand-400 hover:text-brand-300 hover:bg-surface-800 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-cta text-[9px] font-bold text-surface-950 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && <NotificationsPanel />}
        </div>
      </div>
    </div>
  )
}
