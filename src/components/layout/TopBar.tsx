import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { comVolta } from '@/lib/voltarPara'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Search, Bell, Sparkles, Home, MessageSquare, BarChart3, Users, Send, Megaphone, Workflow, Bot, MessagesSquare, Settings, Building2, Smartphone, CreditCard, UserPlus, X, Tag, Clock, Filter, Download, PlusCircle, ArrowRight, ChevronRight, LayoutGrid, KanbanSquare, FileText, Inbox, Globe, Users2, BellRing, Plug, BookOpen, Megaphone as MegaphoneIcon, User, LogOut, CheckCheck, Archive, Settings2, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NotificationItem, Kbd } from '@/components/notifications/NotificationItem'
import { CATEGORY_CHIPS, iconFor } from '@/components/notifications/notificationsMeta'
import { useAuth } from '@/contexts/AuthContext'
import { useLayer } from '@/contexts/LayerContext'
import { useCopilotContext } from '@/contexts/CopilotContext'
import { useTopBarActions } from '@/contexts/TopBarActionsContext'
import { TopBarReadinessIndicator } from './TopBarReadinessIndicator'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  useNotifications,
  type AppNotification,
  type NotificationMetaKnown,
  type NotificationSourceKind,
} from '@/hooks/useNotifications'
import { cn, getInitials } from '@/lib/utils'
import { isAdminTier, roleLabel } from '@/lib/roleHelpers'
import { isRouteVisible } from '@/config/featureFlags'
import { papelAlcancaSecao } from '@/components/settings/SettingsLayout'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  categoryOf,
  CATEGORY_STYLE,
  emptyStateFor,
  normalizeNotificationLink,
} from '@/lib/notificationsUx'

// ── Page title map ─────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/conversations': 'Conversas',
  '/dashboard': 'Dashboard',
  '/contacts': 'Contatos',
  '/pipelines': 'Funis',
  '/campaigns': 'Disparos',
  '/marketing': 'Marketing',
  '/automations': 'Automações',
  '/agents': 'Agentes IA',
  '/copilot': 'Copilot AI',
  '/team': 'Nexus',
  '/settings': 'Configurações',
}

/** Page subtitles — short noun phrases (2-4 words) rendered next to the
 *  title with a "·" bullet separator. Kept intentionally terse so the
 *  pattern stays single-line even on laptop widths; the longer-form copy
 *  belongs in section headers inside each page, not in the topbar. */
const PAGE_SUBTITLES: Record<string, string> = {
  '/home': 'Seu dia num relance',
  '/conversations': 'Chat com clientes',
  '/dashboard': 'A operação agora e os relatórios',
  // O funil saiu daqui (D2 · SCRUM-935): virou /pipelines, com página e
  // subtítulo próprios. Prometer "pipeline" nesta tela virou promessa falsa.
  '/contacts': 'Base de clientes',
  '/pipelines': 'Negócios por etapa',
  '/campaigns': 'Campanhas em massa',
  '/marketing': 'Estratégia e canais',
  '/automations': 'Fluxos automáticos',
  '/agents': 'Construtor de IA',
  '/copilot': 'Assistente Oryon',
  '/team': 'Habilidades dos agentes',
  '/settings': 'Central do workspace',
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
  { type: 'page', label: 'Dashboard', description: 'Fila ao vivo, equipe e relatórios', href: '/dashboard', Icon: BarChart3, keywords: ['relatórios', 'fila', 'painel', 'métricas', 'relatório', 'gráfico', 'dados', 'análise'] },
  { type: 'page', label: 'Contatos', description: 'CRM e situação dos contatos', href: '/contacts', Icon: Users, keywords: ['crm', 'leads', 'clientes', 'base'] },
  // 'pipeline'/'kanban'/'funil' migraram de Contatos para cá junto com a tela
  // (D2 · SCRUM-935): quem busca por essas palavras quer o quadro, e ele não
  // mora mais em /contacts.
  { type: 'page', label: 'Funis', description: 'Quadro de negócios por etapa', href: '/pipelines', Icon: KanbanSquare, keywords: ['funil', 'pipeline', 'kanban', 'board', 'negócios', 'quadro'] },
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
  // As duas ações de 'vista' (lista × kanban) saíram: o segmented control que
  // as ligava não existe mais em /contacts — a lista é a única vista, e o
  // quadro virou /pipelines. Levavam a /contacts e não faziam nada.
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
  // Todo href aqui precisa ser uma seção real de /settings (VALID_SECTIONS em
  // SettingsPage): antes /settings/team, /whatsapp, /hours e /integrations não
  // existiam e caíam calados na primeira seção. Teste: TopBar.searchSettings.test.
  { type: 'settings', label: 'Minha conta', description: 'Perfil pessoal e senha', href: '/settings/account', Icon: Settings, keywords: ['perfil', 'senha', 'conta', 'pessoal'] },

  { type: 'settings', label: 'Usuários', description: 'Membros da equipe e papéis', href: '/settings/agents', Icon: Users, keywords: ['membros', 'usuários', 'permissões', 'funções', 'setores', 'departamentos', 'grupos', 'times'] },
  { type: 'settings', label: 'Setores', description: 'Equipes, linha de atendimento e acesso a funis', href: '/settings/departments', Icon: Users2, keywords: ['setores', 'departamentos', 'grupos', 'times'] },
  { type: 'settings', label: 'Respostas rápidas', description: 'Atalhos de texto para as conversas', href: '/settings/quick-replies', Icon: MessagesSquare, keywords: ['atalho', 'resposta pronta', 'modelo de texto', 'barra'] },
  { type: 'settings', label: 'Números WhatsApp', description: 'Linha conectada e agente de IA', href: '/settings/numbers', Icon: Smartphone, keywords: ['numero', 'numeros', 'waba', 'meta', 'business', 'telefone', 'chip', 'conectar'] },
  { type: 'settings', label: 'Plano e cobrança', description: 'Assinatura, limites e faturas', href: '/settings/billing', Icon: CreditCard, keywords: ['plano', 'fatura', 'assinatura', 'pagamento', 'upgrade', 'limite', 'mensalidade'] },
  { type: 'settings', label: 'Etiquetas', description: 'Gerenciar tags de conversas', href: '/settings/tags', Icon: Tag, keywords: ['tags', 'etiquetas', 'labels', 'marcadores'] },
  { type: 'settings', label: 'Notificações', description: 'Preferências de alertas', href: '/settings/notifications', Icon: BellRing, keywords: ['alertas', 'avisos', 'push', 'email'] },
  { type: 'settings', label: 'Conectores', description: 'Integrações com sistemas externos', href: '/settings/connectors', Icon: Plug, keywords: ['webhook', 'api', 'zapier', 'n8n', 'integracao', 'conectar', 'externo'] },
  { type: 'settings', label: 'Perfil da empresa', description: 'Nome e e-mail de contato da organização', href: '/settings/company', Icon: Building2, keywords: ['empresa', 'organizacao', 'cnpj', 'logo', 'setores', 'departamentos', 'nome'] },
] as SearchItem[])

// ── Notification types ─────────────────────────────────────────────────────────
//
// Phase 20: maps EACH backend notification type to a specific lucide icon.
// Previously we only had a coarse 5-bucket mapping that ALWAYS fell through
// to 'system' (since backend types don't match the bucket keys), making
// every row show a yellow warning icon. Fixed here by using the real type
// strings as keys and falling back to a neutral Bell for unknown types.


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
  searchIndex,
}: {
  query: string
  activeIndex: number
  onSelect: (item: SearchItem) => void
  onHover: (flatIdx: number) => void
  searchIndex: SearchItem[]
}) {
  const trimmed = query.trim()

  // Build filtered + scored list
  const scored = searchIndex
    .map((item) => ({ item, score: scoreItem(item, trimmed) }))
    .filter(({ score }) => score > 0 || trimmed === '')
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)

  // Limit to 10 when filtering, all when empty
  const results = trimmed ? scored.slice(0, 10) : searchIndex.slice(0, 8)

  // Group by type, in fixed order
  const groups = TYPE_ORDER
    .map((type) => ({ type, items: results.filter((i) => i.type === type) }))
    .filter(({ items }) => items.length > 0)

  // Flat index for keyboard navigation
  let flatCounter = 0
  const flatItems: SearchItem[] = []
  groups.forEach(({ items }) => items.forEach((i) => flatItems.push(i)))

  // Dropdown is now embedded inside the search overlay (centered modal), so
  // we render it as inline content — no absolute positioning, no own
  // background/border/shadow (the overlay panel already supplies those).
  if (results.length === 0 && trimmed) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-surface-500">Nenhum resultado para <strong className="text-surface-300">"{trimmed}"</strong></p>
        <p className="text-2xs text-surface-600 mt-1">Tente buscar contatos diretamente na página de Contatos</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      {!trimmed && (
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-3xs font-semibold text-surface-500 uppercase tracking-widest">
            Sugestões
          </span>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto pb-1">
        {groups.map(({ type, items }) => (
          <div key={type}>
            {trimmed && (
              <div className="px-3 pt-2.5 pb-1 first:pt-2">
                <span className="text-3xs font-semibold text-surface-500 uppercase tracking-widest">
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
                    isActive ? 'bg-surface-800' : 'hover:bg-[var(--rowhover)]',
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
                    <p className="text-2xs text-surface-500 truncate leading-none">
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
          <div className="border-t border-surface-700 mt-1 pt-1">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onHover(flatItems.length) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                activeIndex === flatItems.length ? 'bg-surface-800' : 'hover:bg-[var(--rowhover)]',
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
      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-3xs font-medium', sourceStyle.className)}>
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-scrim-soft)] backdrop-blur-sm px-3 sm:px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-modal-title"
    >
      <motion.div
        ref={modalRef}
        {...motionProps}
        className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col rounded-2xl overlay-frame border bg-surface-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-surface-700">
          <div
            className="w-10 h-10 rounded-xl color-chip border flex items-center justify-center flex-shrink-0"
            style={{ ['--chip']: catStyle.chip } as React.CSSProperties}
            aria-hidden
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="notif-modal-title" className="text-sm font-semibold text-surface-100 leading-snug">{n.title}</h3>
            <p className="text-2xs text-surface-500 mt-0.5" title={abs}>
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
            <dl className="rounded-xl border border-surface-700 bg-surface-950/40 overflow-hidden">
              {flow.map((step, i) => (
                <div
                  key={step.label}
                  className={cn(
                    'flex items-baseline gap-3 px-3.5 py-2.5',
                    i !== flow.length - 1 && 'border-b border-surface-700',
                  )}
                >
                  <dt className="text-3xs font-semibold uppercase tracking-wider text-surface-500 w-20 shrink-0">
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
            <div className="rounded-xl border border-surface-700 bg-surface-950/40 p-3">
              <p className="text-3xs font-semibold uppercase tracking-wide text-surface-500 mb-2">
                {pluralize(affectedTotal, 'Contato afetado', 'Contatos afetados')} ({affectedTotal})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {groupedContacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--sf2)]"
                  >
                    <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                      <UserPlus className="w-3.5 h-3.5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-100 font-medium truncate">
                        {c.name ?? 'Sem nome'}
                      </p>
                      {c.phone && (
                        <p className="text-2xs text-surface-500 truncate">{formatPhone(c.phone)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {affectedTotal > groupedContacts.length && (
                  <p className="text-2xs text-surface-500 text-center py-1.5">
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
              <p className="text-3xs font-semibold uppercase tracking-wide text-brand-300 mb-1">
                Observação da automação
              </p>
              <p className="text-xs text-surface-200 leading-relaxed whitespace-pre-line break-words">
                {userNote}
              </p>
            </div>
          )}

          {/* Advanced details — collapsed by default, stripped of UUIDs. */}
          {techEntries.length > 0 && (
            <div className="rounded-xl border border-surface-700 bg-surface-950/30">
              <button
                type="button"
                onClick={() => setShowTech((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-2xs text-surface-400 hover:text-surface-200 transition-colors"
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
              onClick={() => { navigate(normalizeNotificationLink(n.link!)); onClose() }}
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

function NotificationsPanel() {
  // Localização do roteador: as preferências voltam para a tela de onde o sino foi aberto.
  const location = useLocation()
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
    showArchived,
    setShowArchived,
  } = useNotifications()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<NotifFilter>('unread')
  const [detail, setDetail] = useState<AppNotification | null>(null)
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

  // Direção A (23/09): seções por CATEGORIA (Conversas, Equipe, Campanhas,
  // Automações, Segurança), recolhíveis, com contagem de não lidas — o ritmo
  // visual vem das seções; dentro de cada uma, urgentes primeiro e depois
  // ordem de chegada. O estado de recolhimento persiste em localStorage.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('oryon:notif:collapsed') || '{}') } catch { return {} }
  })
  const toggleSection = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('oryon:notif:collapsed', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])
  const groups = useMemo(() => {
    const ordem = CATEGORY_CHIPS.filter((c) => c.key !== 'all')
    return ordem
      .map((c) => ({ key: c.key, label: c.label, items: sortedVisible.filter((x) => c.types.includes(x.type)) }))
      .concat([{ key: 'outros', label: 'Outras', items: sortedVisible.filter((x) => !ordem.some((c) => c.types.includes(x.type))) }])
      .filter((g) => g.items.length > 0)
  }, [sortedVisible])
  const flatItems = useMemo(() => groups.flatMap((g) => (collapsed[g.key] ? [] : g.items)), [groups, collapsed])
  const unreadCount = notifications.filter((n) => !n.isRead).length


  const handleItemClick = useCallback((n: AppNotification) => {
    if (!n.isRead) markAsRead(n.id)
    if (n.metadata && Object.keys(n.metadata).length > 0) {
      setDetail(n)
    } else if (isValidLink(n.link)) {
      navigate(normalizeNotificationLink(n.link!))
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

  // Direção A: sem filtro de categoria (as seções categorizam) — só 'all'.
  const empty = emptyStateFor('all', filter, showArchived)

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

      {/* Painel — SCRUM-1097 (23/09), direção C. Referências: Linear Inbox
          (prioridade separada, uma linha de filtros), Smashing/Courier
          ("quem, o quê, por quê em 2 s"; ações em massa; preferências por
          tipo). Antes: cabeçalho de 111px com três alturas de controle
          (16/24/21) e chips de 10px; itens de 101px. Agora: cabeçalho de
          44px com ações como botões de ícone 28×28, uma linha de filtros com
          SegmentedControl sm + categoria em Dropdown, item de ~64px. */}
      <div className="absolute top-full right-0 mt-2 w-[400px] max-w-[calc(100vw-1rem)] overlay-surface overlay-vidro border rounded-lg z-50 overflow-hidden animate-slide-in-right">
        <div className="h-11 px-3 flex items-center gap-2 border-b border-surface-700">
          <span className="text-[13px] font-bold text-surface-50 tracking-[-0.01em]">Notificações</span>
          {!showArchived && (
            <span className="text-[11px] text-surface-500 tabular-nums">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}` : 'em dia'}
            </span>
          )}
          {showArchived && <span className="text-[11px] text-surface-500">arquivadas</span>}
          <div className="ml-auto flex items-center gap-0.5">
            {!showArchived && (
              <button
                type="button"
                onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
                title={filter === 'unread' ? 'Mostrando só não lidas — clique para ver todas' : 'Mostrar só não lidas'}
                aria-label="Só não lidas"
                aria-pressed={filter === 'unread'}
                className={cn(
                  'w-7 h-7 rounded-xs flex items-center justify-center transition-colors hover:bg-[var(--rowhover)]',
                  filter === 'unread' ? 'text-surface-100 bg-[var(--sf2)]' : 'text-surface-500 hover:text-surface-100',
                )}
              >
                <span className={cn('w-2.5 h-2.5 rounded-full border-2 border-current', filter === 'unread' && 'bg-current')} />
              </button>
            )}
            {unreadCount > 0 && !showArchived && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                title="Marcar todas como lidas (A)"
                aria-label="Marcar todas como lidas"
                className="w-7 h-7 rounded-xs flex items-center justify-center text-surface-500 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              title={showArchived ? 'Voltar às ativas' : 'Ver arquivadas'}
              aria-label={showArchived ? 'Voltar às ativas' : 'Ver arquivadas'}
              aria-pressed={showArchived}
              className={cn(
                'w-7 h-7 rounded-xs flex items-center justify-center transition-colors hover:bg-[var(--rowhover)]',
                showArchived ? 'text-surface-100 bg-[var(--sf2)]' : 'text-surface-500 hover:text-surface-100',
              )}
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate(comVolta('/settings/notifications', `${location.pathname}${location.search}`))}
              title="Preferências de notificação"
              aria-label="Preferências de notificação"
              className="w-7 h-7 rounded-xs flex items-center justify-center text-surface-500 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div ref={panelRef} className="max-h-[28rem] overflow-y-auto py-1" role="list">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedVisible.length === 0 ? (
            <EmptyState icon={Bell} title={empty.title} hint={empty.hint} className="py-12 border-none bg-transparent" />
          ) : (
            <>
              {/* Phase 20 X2: animated list. AnimatePresence handles enter/exit
                  for new and archived items. Reduced-motion disables transitions. */}
              {groups.map((g) => (
                <div key={g.key}>
                  <button
                    type="button"
                    onClick={() => toggleSection(g.key)}
                    aria-expanded={!collapsed[g.key]}
                    className="w-full h-8 px-4 flex items-center gap-1.5 text-[11px] font-semibold text-surface-400 hover:text-surface-200 bg-[var(--color-overlay)] sticky top-0 z-10 transition-colors"
                  >
                    <span>{g.label}</span>
                    <span className="font-medium text-surface-500 tabular-nums">· {g.items.filter((x) => !x.isRead).length || g.items.length}</span>
                    <ChevronDown className={cn('ml-auto w-3 h-3 text-surface-500 transition-transform', collapsed[g.key] && '-rotate-90')} />
                  </button>
                  <AnimatePresence initial={false}>
                    {!collapsed[g.key] && g.items.map((n) => {
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
                            isFocused={focusedIndex === flatIdx}
                          />
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              ))}
              {hasMore && (
                <div className="py-2 flex justify-center border-t border-surface-700">
                  <Button size="sm" variant="ghost" onClick={() => loadMore()} disabled={loadingMore}>
                    {loadingMore ? 'Carregando…' : 'Carregar mais'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Phase 20 X1: keyboard shortcuts hint bar. Discoverable without
            being in the way. */}
        {sortedVisible.length > 0 && (
          <div className="hidden sm:flex items-center justify-center gap-3 h-8 px-3 border-t border-surface-700 bg-[var(--sf2)] text-[11px] text-surface-500">
            <span className="inline-flex items-center gap-1"><Kbd>J</Kbd><Kbd>K</Kbd> navegar</span>
            <span className="inline-flex items-center gap-1"><Kbd>↵</Kbd> abrir</span>
            <span className="inline-flex items-center gap-1"><Kbd>E</Kbd> arquivar</span>
            <span className="inline-flex items-center gap-1"><Kbd>U</Kbd> lida</span>
            <span className="inline-flex items-center gap-1"><Kbd>A</Kbd> todas</span>
          </div>
        )}
      </div>
      <AnimatePresence>
        {detail && <NotificationDetailModal n={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </>
  )
}


// ── User menu ──────────────────────────────────────────────────────────────────
//
// SCRUM-1100 (Leva 2 · handoff 3.13 "Shell final"): Configurações e avatar
// saíram do rodapé da NavSidebar — este menu é a nova porta de entrada.
// `/settings` continua sendo a rota real; o menu só oferece outro caminho até
// ela. Tema e Sair reaproveitam a MESMA lógica que já existia na sidebar
// (useTheme / useAuth().logout) — só a UI foi realocada.

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]

/** Avatar de 28px `rounded-[30%]` do gatilho do menu — o componente `Avatar`
 *  compartilhado só tem tamanhos fixos (24/32/40/48px, ver Avatar.tsx), então
 *  o gatilho replica seu visual "operador" (mesmas classes/tokens) no tamanho
 *  exato pedido pelo handoff. O header do menu (32px) já usa `Avatar` direto. */
function UserMenuTrigger({ name, imageUrl, active }: { name: string; imageUrl?: string; active: boolean }) {
  return (
    <span
      className="relative inline-flex flex-shrink-0 w-7 h-7 rounded-[30%] overflow-hidden transition-shadow duration-150"
      // Anel teal — único estado em que o avatar recebe cor, sinaliza "menu aberto" (handoff 3.13).
      // SHELL-TOPBAR-07: camada interna do anel na cor da TopBar (--sf).
      style={active ? { boxShadow: '0 0 0 2px var(--color-topbar), 0 0 0 4px var(--color-accent)' } : undefined}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="avatar-operador w-full h-full flex items-center justify-center text-2xs font-semibold">
          {getInitials(name)}
        </span>
      )}
    </span>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  const name = user ? `${user.firstName} ${user.lastName}` : ''
  const settingsVisible = isRouteVisible('/settings', user?.email ?? null)

  const close = () => setOpen(false)
  const go = (href: string) => { navigate(href); close() }
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Dropdown
      open={open}
      onClose={close}
      align="right"
      className="w-60"
      anchor={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Menu do usuário"
          aria-label="Menu do usuário"
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center justify-center w-7 h-7 rounded-sm hover:bg-[var(--rowhover)] transition-colors"
        >
          <UserMenuTrigger name={name} imageUrl={user?.avatarUrl} active={open} />
        </button>
      }
    >
      {/* Header: avatar 32px + nome + e-mail · papel — SHELL-USERMENU-02:
          8 8 10, gap 10, mb 4, nome 13px. */}
      <div className="flex items-center gap-2.5 px-2 pt-2 pb-2.5 mb-1">
        <Avatar name={name} imageUrl={user?.avatarUrl} size="sm" kind="operator" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-surface-100 truncate">{name}</p>
          <p className="text-[11px] text-surface-500 truncate">
            {user?.email}{user?.role ? ` · ${roleLabel(user.role)}` : ''}
          </p>
        </div>
      </div>

      <DropdownItem icon={User} onClick={() => go('/settings/account')}>
        Meu perfil
      </DropdownItem>

      {settingsVisible && (
        <DropdownItem icon={Settings} onClick={() => go('/settings')}>
          <span className="flex-1">Configurações</span>
          <kbd className="font-mono text-2xs text-surface-500">⌘,</kbd>
        </DropdownItem>
      )}

      {/* Tema — único item que NÃO fecha o menu ao interagir (handoff 3.13).
          Não é um DropdownItem: o SegmentedControl é interativo por dentro,
          e DropdownItem é um <button> — não dá para aninhar botão em botão. */}
      <div role="none" className="px-3 py-2.5 flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-surface-200">Tema</span>
        <SegmentedControl
          label="Tema"
          size="sm"
          value={theme}
          onChange={setTheme}
          options={THEME_OPTIONS}
        />
      </div>

      <DropdownSeparator />

      {/* Linha de workspace — produto hoje é single-tenant por login (não há
          troca de workspace implementada em nenhum outro lugar da UI); o link
          fica desabilitado em vez de simular uma ação que não existe. */}
      <div role="none" className="px-3 py-2.5 flex items-center gap-2.5">
        <span
          className="w-5 h-5 rounded-[6px] flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))' }}
          aria-hidden
        />
        <span className="text-sm text-surface-200 truncate flex-1">Meu workspace</span>
        <button
          type="button"
          disabled
          title="Troca de workspace ainda não disponível"
          className="text-2xs font-medium text-surface-600 cursor-not-allowed flex-shrink-0"
        >
          Trocar ›
        </button>
      </div>

      <DropdownSeparator />

      <DropdownItem icon={LogOut} danger onClick={handleLogout}>
        Sair
      </DropdownItem>
    </Dropdown>
  )
}

// ── TopBar ─────────────────────────────────────────────────────────────────────

export function TopBar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const { userEmail, isFeatureVisible: isFeatureVisibleForUser } = useFeatureVisibility()

  const visibleSearchIndex = useMemo(
    () => SEARCH_INDEX.filter((item) => isRouteVisible(item.href, userEmail)
      // Revisão 02/10: a busca não oferece seção de Configurações que o papel não abre.
      && (item.type !== 'settings' || !user?.role || papelAlcancaSecao(item.href.replace('/settings/', ''), user.role))),
    [userEmail, user?.role],
  )
  const { open: openCopilot } = useCopilotContext()
  const { pageActions, pageSubtitle: dynamicSubtitle } = useTopBarActions()
  const { unreadCount } = useNotifications()

  const [query,       setQuery]       = useState('')
  const [dropOpen,    setDropOpen]    = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(0)
  const [notifOpen,   setNotifOpen]   = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const notifRef  = useRef<HTMLDivElement>(null)

  // Derived
  const segment      = '/' + location.pathname.split('/')[1]
  const pageTitle    = PAGE_TITLES[segment] ?? ''
  // Subtítulo dinâmico registrado pela página (useRegisterTopBarSubtitle)
  // vence o fixo da rota — TOPBAR-02 / DASH-HEADER-01.
  const pageSubtitle = dynamicSubtitle ?? PAGE_SUBTITLES[segment] ?? ''

  // Global "/" shortcut to pop the search palette open. Skip while the user
  // is typing in any input/textarea so the slash stays usable as a literal
  // character. Skip while the palette is already open so the slash typed in
  // its input goes to the input. Matches the legacy hint kbd that the inline
  // input used to display.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (dropOpen) return
      if (e.key !== '/') return
      const t = e.target as HTMLElement | null
      const isTyping =
        !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (isTyping) return
      e.preventDefault()
      setDropOpen(true)
      // Focus is grabbed by the overlay input via autoFocus on mount.
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [dropOpen])

  // Lock body scroll while the search overlay is open — same trick the Modal
  // component uses, prevents the page underneath from jiggling when the user
  // scrolls a long result list.
  useEffect(() => {
    if (!dropOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [dropOpen])

  // Flat list for keyboard nav (rebuilt per render — cheap)
  const flatItems: SearchItem[] = useMemo(() => {
    const trimmed = query.trim()
    const scored = visibleSearchIndex
      .map((item) => ({ item, score: scoreItem(item, trimmed) }))
      .filter(({ score }) => score > 0 || trimmed === '')
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
    return trimmed ? scored.slice(0, 10) : visibleSearchIndex.slice(0, 8)
  }, [query, visibleSearchIndex])

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

  // Esc fecha o popover pelo LayerContext (só quando é o overlay do topo —
  // o modal de detalhe aberto por cima fecha primeiro). Achado da auditoria
  // a11y: o sino era a única camada sem Esc.
  const closeNotif = useCallback(() => setNotifOpen(false), [])
  useLayer(notifOpen, closeNotif)

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
    <div className="conv-surface h-12 flex-shrink-0 bg-[var(--color-topbar)] border-b border-surface-700 px-4 flex items-center gap-3">
      {/* SHELL-TOPBAR-01/02 (spec shell.md): 48px em --sf com hairline --bd;
          título 14/700 -.01em; subtítulo 12px --tx2, sem bullet. */}

      {/* Left: page title + subtitle. Subtitle hidden on small viewports so
          the row stays single-line on phones. */}
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-sm font-display font-bold tracking-[-0.01em] text-surface-50 flex-shrink-0 truncate">
          {pageTitle}
        </span>
        {pageSubtitle && (
          <span className="text-xs text-surface-400 hidden md:inline truncate">
            {pageSubtitle}
          </span>
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

        {/* Search trigger — collapsed pill on desktop, icon-only on mobile.
            Clicking (or pressing "/") opens the same command palette that
            used to live inline at the top of the bar, now as a centered
            overlay. The pill shows the "/" hint so the shortcut is
            discoverable without expanding the input. */}
        <button
          type="button"
          onClick={() => setDropOpen(true)}
          title="Buscar (atalho /)"
          aria-label="Abrir busca"
          // SHELL-TOPBAR-04: 28px, raio 7, fundo --sf2, borda --bd, 200px; kbd só borda --bd2.
          className="hidden md:inline-flex items-center gap-2 px-2.5 h-7 rounded-sm border border-surface-700 hover:border-[var(--bd2)] bg-[var(--sf2)] text-xs text-surface-400 hover:text-surface-200 transition-colors w-[200px] flex-shrink-0"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-left truncate">Buscar</span>
          <kbd className="px-1 rounded-[4px] border border-[var(--bd2)] text-3xs text-surface-500 font-medium flex-shrink-0 leading-4">
            /
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setDropOpen(true)}
          title="Buscar"
          aria-label="Abrir busca"
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Copilot drawer shortcut — mirrors the admin + route gate used by
             the CopilotPanel itself, so the button only shows where the drawer
             can actually render. */}
        {isFeatureVisibleForUser('copilot') && isAdminTier(user?.role) && !location.pathname.startsWith('/copilot') && (
          <button
            onClick={() => openCopilot()}
            title="Abrir Copilot"
            aria-label="Abrir Copilot"
            className="flex items-center justify-center w-7 h-7 rounded-sm text-brand-400 hover:text-brand-300 hover:bg-[var(--rowhover)] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* Workspace readiness — botão de ícone (alerta + ponto âmbar) entre a
            busca e as notificações (PO 01/10). Não renderiza nada quando não
            há pendência obrigatória. */}
        <TopBarReadinessIndicator />

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            title="Notificações"
            aria-haspopup="dialog"
            aria-expanded={notifOpen}
            aria-label={unreadCount > 0 ? `Notificações (${unreadCount > 9 ? '9+' : unreadCount} não lidas)` : 'Notificações'}
            className="relative flex items-center justify-center w-7 h-7 rounded-sm text-surface-400 [html:not([data-theme=light])_&]:text-[#E3EBEB] hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              /* PL-5-4: canvas 7a põe o contador DENTRO do alvo (top 2 / right 0),
                 14px e min-width 14 — não pendurado 2px fora do botão a 16px. */
              <span className="absolute top-0.5 right-0 min-w-[14px] h-3.5 px-[3px] rounded-full bg-brand-cta text-[9px] font-bold text-surface-950 [[data-theme=light]_&]:bg-[#0F766E] [[data-theme=light]_&]:text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="overlay-scrim z-40" aria-hidden onMouseDown={() => setNotifOpen(false)} />
              <NotificationsPanel />
            </>
          )}
        </div>

        {/* User menu — última coisa à direita (handoff 3.13). Configurações
            e avatar vieram da NavSidebar; ver `UserMenu` acima. */}
        <UserMenu />
      </div>

      {/* Command palette overlay — portal-rendered so it covers the whole
          viewport regardless of any ancestor with `transform`/`filter` that
          would otherwise clip a position:fixed child. Reuses the existing
          search index + SearchDropdown by feeding them through a centered
          panel with autoFocus on the input. Escape and outside-click both
          close it; `/` opens it (handler at top of component). */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {dropOpen && (
            <motion.div
              className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[15vh]"
              onClick={() => setDropOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 bg-[var(--color-scrim-soft)]" />
              <motion.div
                ref={searchRef}
                className="relative z-10 w-full max-w-xl bg-surface-900 overlay-frame border rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-700">
                  <Search className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar páginas, ações, configurações..."
                    className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none min-w-0"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); inputRef.current?.focus() }}
                      title="Limpar"
                      aria-label="Limpar busca"
                      className="text-surface-500 hover:text-surface-300 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDropOpen(false)}
                    title="Fechar"
                    className="text-3xs text-surface-500 hover:text-surface-300 px-1.5 py-0.5 rounded border border-surface-700"
                  >
                    Esc
                  </button>
                </div>
                {/* The SearchDropdown was built to be absolute-positioned
                    under an input. Inside the overlay we render it inline
                    via a relative wrapper so it occupies the body of the
                    panel naturally. */}
                <div className="relative">
                  <SearchDropdown
                    query={query}
                    activeIndex={activeIdx}
                    onSelect={handleSelect}
                    onHover={setActiveIdx}
                    searchIndex={visibleSearchIndex}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
