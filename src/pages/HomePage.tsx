import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  MessageSquare, Users, BarChart3, Settings,
  Clock, CheckCircle2, Inbox, CreditCard, Smartphone,
  ChevronRight, X, Sparkles, UserPlus, Tag, MessageCircle,
  Zap, Hand, Workflow, Send, TrendingUp,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useCopilotContext } from '@/contexts/CopilotContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { generateInsights } from '@/services/copilotService'
import { isFeatureVisible } from '@/config/featureFlags'
import { cn, getInitials } from '@/lib/utils'
import { WorkspaceReadinessBanner } from '@/components/common/WorkspaceReadinessBanner'
import type { AuditLog, Conversation, HomeStats, User, WhatsAppNumberDetailed } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

// ── Personal header ────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; chip: string }> = {
  super_admin:    { label: 'Equipe Oryon', chip: 'var(--color-brand-500)' },
  business_admin: { label: 'Admin',        chip: 'var(--color-brand-500)' },
  admin:          { label: 'Admin',        chip: 'var(--color-brand-500)' },
  supervisor:     { label: 'Supervisor',   chip: 'var(--color-status-pending)' },
  agent:          { label: 'Agente',       chip: 'var(--color-status-muted)' },
}

function PersonalHeader({ user }: { user: User }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const date = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())
  const role = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.agent

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-surface-50">
        {greeting}, {user.firstName} <Hand className="w-6 h-6 inline text-brand-400" />
      </h1>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className={cn('color-chip inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border')} style={{ ['--chip']: role.chip } as React.CSSProperties}>
          {role.label}
        </span>
        {user.departmentName && (
          <>
            <span className="text-surface-700">·</span>
            <span className="text-sm text-surface-400">{user.departmentName}</span>
          </>
        )}
        <span className="text-surface-700">·</span>
        <span className="text-sm text-surface-500 capitalize">{date}</span>
      </div>
    </div>
  )
}

// ── KPI cards ──────────────────────────────────────────────────────────────────

type KPIColor = 'brand' | 'green' | 'blue' | 'amber' | 'purple'

interface KPIData {
  label: string
  value: string | number
  subtext?: string
  icon: React.ComponentType<{ className?: string }>
  color: KPIColor
  trend?: string
  trendUp?: boolean
}

const KPI_COLORS: Record<KPIColor, { bg: string; icon: string; ring: string }> = {
  brand:  { bg: 'bg-brand-500/10',   icon: 'text-brand-400',   ring: 'ring-brand-500/20' },
  green:  { bg: 'bg-status-active-bg', icon: 'text-status-active', ring: 'ring-status-active-border' },
  blue:   { bg: 'bg-accent-blue/10',    icon: 'text-accent-blue',    ring: 'ring-accent-blue/20' },
  amber:  { bg: 'bg-status-pending-bg',   icon: 'text-status-pending',   ring: 'ring-status-pending-border' },
  purple: { bg: 'bg-accent-violet/10',  icon: 'text-accent-violet',  ring: 'ring-accent-violet/20' },
}

function KPICard({ data, hero }: { data: KPIData; hero?: boolean }) {
  const c = KPI_COLORS[data.color] ?? KPI_COLORS.brand
  const Icon = data.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl ring-1 flex items-center justify-center', c.bg, c.ring)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        {data.trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            data.trendUp === true  ? 'text-status-active bg-status-active-bg' :
            data.trendUp === false ? 'text-danger bg-danger/10' :
            'text-surface-500 bg-surface-800',
          )}>
            {data.trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-surface-50 leading-none tabular-nums">{data.value}</p>
        {data.subtext && <p className="text-xs text-surface-500 mt-1">{data.subtext}</p>}
        <p className="text-xs uppercase tracking-wide mt-1.5 text-surface-400">{data.label}</p>
      </div>
    </motion.div>
  )
}

function getKPIs(stats: HomeStats, role: string): KPIData[] {
  // Admin/business_admin KPIs
  if (role === 'admin' || role === 'business_admin') return [
    { label: 'Conversas abertas', value: stats.conversationsOpen ?? 0, icon: MessageSquare, color: 'brand' },
    { label: 'Resolvidas hoje', value: stats.conversationsResolvedToday ?? 0, icon: CheckCircle2, color: 'green', trend: 'hoje' },
    { label: 'Novos contatos', value: stats.newContactsThisWeek ?? 0, icon: UserPlus, color: 'blue', subtext: 'esta semana' },
    { label: 'Mensagens hoje', value: stats.messagesSentToday ?? 0, icon: MessageCircle, color: 'purple' },
  ]
  if (role === 'supervisor') return [
    { label: 'Conversas abertas', value: stats.conversationsOpen ?? 0, icon: MessageSquare, color: 'brand' },
    { label: 'Na fila', value: stats.queueCount ?? 0, icon: Inbox, color: (stats.queueCount ?? 0) > 5 ? 'amber' : 'green' },
    { label: 'Resolvidas hoje', value: stats.conversationsResolvedToday ?? 0, icon: CheckCircle2, color: 'green' },
    { label: 'Mensagens hoje', value: stats.messagesSentToday ?? 0, icon: MessageCircle, color: 'purple' },
  ]
  return [
    { label: 'Conversas abertas', value: stats.conversationsOpen ?? 0, icon: MessageSquare, color: 'brand' },
    { label: 'Resolvidas hoje', value: stats.conversationsResolvedToday ?? 0, icon: CheckCircle2, color: 'green' },
    { label: 'Na fila', value: stats.queueCount ?? 0, icon: Inbox, color: 'amber' },
    { label: 'Mensagens hoje', value: stats.messagesSentToday ?? 0, icon: MessageCircle, color: 'purple' },
  ]
}

function KPIGrid({ stats, role }: { stats: HomeStats; role: string }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {getKPIs(stats, role).map((kpi, i) => (
        <KPICard key={kpi.label} data={kpi} hero={i === 0} />
      ))}
    </div>
  )
}

function KPIGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-surface-900 border border-surface-800 rounded-2xl h-28 animate-pulse" />
      ))}
    </div>
  )
}

// ── AI Insights widget ─────────────────────────────────────────────────────────

function AIInsightsWidget({ stats }: { stats: HomeStats }) {
  const { open } = useCopilotContext()
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  const load = () => {
    setLoading(true)
    generateInsights(stats)
      .then((result) => { setInsights(result); setGeneratedAt(new Date()) })
      .catch(() => setInsights([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [stats]) // eslint-disable-line react-hooks/exhaustive-deps

  const timeAgo = generatedAt
    ? (() => {
        const diff = Math.floor((Date.now() - generatedAt.getTime()) / 60_000)
        return diff < 1 ? 'agora mesmo' : `${diff}min atrás`
      })()
    : null

  return (
    // h-full + flex-col garantem que o card iguale altura com o
    // MyPerformanceCard ao lado quando estão em col-span-6 cada.
    <div className="bg-surface-900 border border-surface-700 shadow-sm rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-semibold text-surface-100">Insights da Oryon AI</span>
        </div>
        <div className="flex items-center gap-3">
          {timeAgo && <span className="text-[10px] text-surface-600">Gerado {timeAgo}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors disabled:opacity-40"
          >
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-xs text-surface-500">Analisando seus dados...</span>
        </div>
      ) : insights.length === 0 ? (
        <p className="text-xs text-surface-500 py-2">Não foi possível gerar insights no momento.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              <span className="text-sm text-surface-300 flex-1">{insight}</span>
              {/* Hidden when aiInsightsAskButton is off — same gate used by
                  the Dashboard / CRM cards. */}
              {isFeatureVisible('aiInsightsAskButton') && (
                <button
                  onClick={() => open(insight)}
                  className="text-[11px] text-brand-400 hover:text-brand-300 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap"
                >
                  Perguntar →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── My performance card ───────────────────────────────────────────────────────
// Senta lado a lado com o AIInsightsWidget no grid principal (cada um span-6
// na linha de Insights). Mostra os mesmos KPIs do "Atendimento agora" mas
// filtrados pro usuário logado, usando os campos myXxx do HomeStats. Útil
// pro atendente ver seu trabalho do dia sem precisar ir em Métricas.

function MyPerformanceCard({ stats }: { stats: HomeStats }) {
  // Fallback p/ 0 quando o backend não popula os campos myXxx (acontece com
  // super_admin / users sem conversas atribuídas, ou se o endpoint
  // /home/stats ainda não retorna esses campos). Sem isso, o template
  // literal `${undefined}min` vira "undefinedmin" na UI.
  const myOpen      = stats.myConversationsOpen ?? 0
  const myResolved  = stats.myConversationsResolvedToday ?? 0
  const mySent      = stats.myMessagesSentToday ?? 0
  const myAvgMin    = stats.myAvgResponseMinutes ?? 0

  return (
    <div className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-400" />
          Seu desempenho hoje
        </h4>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {[
          {
            label: 'Conversas abertas',
            value: myOpen,
            cls: 'text-surface-200',
            icon: <MessageSquare className="w-3.5 h-3.5" />,
          },
          {
            label: 'Resolvidas hoje',
            value: myResolved,
            cls: myResolved > 0 ? 'text-status-active' : 'text-surface-500',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          },
          {
            label: 'Mensagens enviadas',
            value: mySent,
            cls: 'text-surface-200',
            icon: <Send className="w-3.5 h-3.5" />,
          },
          {
            label: 'Tempo médio resposta',
            value: `${myAvgMin}min`,
            // Mesma régua do "Atendimento agora": >10min = atenção.
            cls: myAvgMin > 10 ? 'text-status-pending' : 'text-surface-200',
            icon: <Clock className="w-3.5 h-3.5" />,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-surface-500">
              {row.icon}
              <span className="text-xs">{row.label}</span>
            </div>
            <span className={cn('text-sm font-semibold tabular-nums', row.cls)}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Quick actions ──────────────────────────────────────────────────────────────

interface QuickAction {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
  href: string
}

function getQuickActions(role: string): QuickAction[] {
  if (role === 'admin') return [
    { label: 'Conversas',         description: 'Ver todas as conversas',          icon: MessageSquare, iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/conversations' },
    { label: 'Convidar usuário',  description: 'Adicionar à equipe',              icon: UserPlus,      iconColor: 'text-accent-blue',    iconBg: 'bg-accent-blue/10',    href: '/settings/agents' },
    { label: 'Plano & Cobrança',  description: 'Gerenciar assinatura',            icon: CreditCard,    iconColor: 'text-accent-amber',   iconBg: 'bg-accent-amber/10',   href: '/settings/billing' },
    { label: 'Configurar CRM',    description: 'Estágios e campos personalizados', icon: Settings,      iconColor: 'text-accent-green', iconBg: 'bg-accent-green/10', href: '/contacts' },
    { label: 'Automações',         description: 'Fluxos automáticos',               icon: Workflow,      iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/automations' },
    { label: 'Relatórios',        description: 'Dashboard de métricas',            icon: BarChart3,     iconColor: 'text-surface-400', iconBg: 'bg-surface-700',    href: '/dashboard' },
  ]
  if (role === 'supervisor') return [
    { label: 'Fila de espera',    description: 'Sem agente atribuído',            icon: Inbox,         iconColor: 'text-accent-amber',   iconBg: 'bg-accent-amber/10',   href: '/conversations' },
    { label: 'Minha equipe',      description: 'Gerenciar usuários',              icon: Users,         iconColor: 'text-accent-blue',    iconBg: 'bg-accent-blue/10',    href: '/settings/agents' },
    { label: 'Criar tag',         description: 'Organizar conversas',             icon: Tag,           iconColor: 'text-accent-green', iconBg: 'bg-accent-green/10', href: '/settings/tags' },
    { label: 'Relatórios',        description: 'Métricas da equipe',              icon: BarChart3,     iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/dashboard' },
    { label: 'Respostas rápidas', description: 'Templates de mensagem',           icon: Zap,           iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/settings/quick-replies' },
    { label: 'CRM',               description: 'Pipeline de vendas',              icon: MessageSquare, iconColor: 'text-surface-400', iconBg: 'bg-surface-700',    href: '/contacts' },
  ]
  return [
    { label: 'Minhas conversas',  description: 'Ver atribuídas a mim',            icon: MessageSquare, iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/conversations' },
    { label: 'Contatos',          description: 'Gerenciar CRM',                   icon: Users,         iconColor: 'text-accent-blue',    iconBg: 'bg-accent-blue/10',    href: '/contacts' },
    { label: 'Respostas rápidas', description: 'Usar templates salvos',           icon: Zap,           iconColor: 'text-accent-green', iconBg: 'bg-accent-green/10', href: '/settings/quick-replies' },
    { label: 'Relatórios',        description: 'Meu desempenho',                  icon: BarChart3,     iconColor: 'text-accent-amber',   iconBg: 'bg-accent-amber/10',   href: '/dashboard' },
  ]
}

function QuickActions({ role }: { role: string }) {
  const navigate = useNavigate()
  const actions = getQuickActions(role)
  return (
    <div className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5 h-full">
      <h3 className="text-sm font-semibold text-surface-100 mb-4">Ações rápidas</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.href)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left group"
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', a.iconBg)}>
                <Icon className={cn('w-4 h-4', a.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-200 group-hover:text-surface-50 transition-colors truncate">{a.label}</p>
                <p className="text-xs text-surface-500 truncate">{a.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Activity feed ──────────────────────────────────────────────────────────────

const ACTION_MAP: Record<string, { label: string; dot: string }> = {
  'conversation.resolved':  { label: 'resolveu uma conversa',          dot: 'bg-status-active' },
  'conversation.assigned':  { label: 'assumiu uma conversa',           dot: 'bg-brand-400' },
  'conversation.archived':  { label: 'arquivou uma conversa',          dot: 'bg-surface-500' },
  'message.sent':           { label: 'enviou uma mensagem',            dot: 'bg-blue-400' },
  'agent.invited':          { label: 'convidou um usuário',            dot: 'bg-brand-400' },
  'automation.toggled':     { label: 'alterou uma automação',          dot: 'bg-status-pending' },
  'tag.created':            { label: 'criou uma tag',                  dot: 'bg-status-active' },
  'user.role_changed':      { label: 'alterou o papel de um usuário',  dot: 'bg-orange-400' },
}

function ActivityFeed({ logs, loading }: { logs: AuditLog[]; loading: boolean }) {
  return (
    <div className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5 h-full">
      <h3 className="text-sm font-semibold text-surface-100 mb-4">Atividade recente</h3>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        // /audit-logs ainda e um stub no backend (sempre retorna lista vazia --
        // ver SecuritySettings.tsx), entao "nenhuma atividade" seria enganoso:
        // nao e que nada aconteceu, e que o rastreamento ainda nao existe.
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <p className="text-sm text-surface-500">Em breve — o feed de atividade ainda está em desenvolvimento.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {logs.map((log, i) => {
            const action = ACTION_MAP[log.action] ?? { label: log.action, dot: 'bg-surface-500' }
            return (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-surface-800/60 last:border-0">
                <div className="flex flex-col items-center flex-shrink-0 mt-1.5 gap-1">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', action.dot)} />
                  {i < logs.length - 1 && <div className="w-px h-4 bg-surface-800" />}
                </div>
                <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-surface-300 mt-0.5">
                  {getInitials(log.userName)}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-surface-300 leading-snug">
                    <span className="font-medium text-surface-100">{log.userName}</span>
                    {' '}{action.label}
                  </p>
                </div>
                <span className="text-xs text-surface-600 flex-shrink-0 pt-0.5">{relativeTime(log.createdAt)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Contextual block ───────────────────────────────────────────────────────────

// ── Admin cards (Phase 28+ — split do antigo AdminBlock pra entrar como
//    células do grid unificado de 12 colunas na Home). Cada card é
//    independente: tem altura própria conforme conteúdo, mas como vão
//    ocupar a mesma "linha" do grid principal (3 cards span-4), o grid
//    alinha as alturas automaticamente — efeito harmônico sem flex hacks.

function TeamCard({ stats }: { stats: HomeStats }) {
  const navigate = useNavigate()
  return (
    <div className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-surface-100">Equipe</h4>
        <Users className="w-4 h-4 text-surface-600" />
      </div>
      <div className="flex flex-col gap-3 mt-1 flex-1">
        {[
          { label: 'Online agora',    value: stats.agentsOnline ?? 0,  cls: 'text-status-active' },
          { label: 'Total contatos',  value: stats.totalContacts ?? 0, cls: 'text-surface-200' },
          { label: 'Sem atendente',   value: stats.unassignedCount ?? 0, cls: (stats.unassignedCount ?? 0) > 0 ? 'text-status-pending' : 'text-surface-500' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-surface-400">{row.label}</span>
            <span className={cn('text-sm font-semibold tabular-nums', row.cls)}>{row.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/settings/agents')}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 border border-surface-700 hover:border-surface-600 rounded-xl py-2 transition-colors"
      >
        Gerenciar equipe <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function WhatsAppNumbersCard() {
  const navigate = useNavigate()
  const [waNumbers, setWaNumbers] = useState<WhatsAppNumberDetailed[]>([])

  useEffect(() => {
    axios
      .get<WhatsAppNumberDetailed[]>(`${API}/whatsapp/numbers`)
      .then((w) => setWaNumbers(Array.isArray(w.data) ? w.data : []))
      .catch(() => setWaNumbers([]))
  }, [])

  return (
    <div className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-surface-100">Números WhatsApp</h4>
        <Smartphone className="w-4 h-4 text-surface-600" />
      </div>
      <div className="flex-1">
        {waNumbers.length === 0 ? (
          <div className="flex flex-col gap-2 py-4">
            <p className="text-xs text-surface-500">Nenhum número conectado ainda.</p>
            <button
              onClick={() => navigate('/settings/numbers')}
              className="self-start text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Conectar agora →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {waNumbers.map((num) => (
              <div key={num.id} className="flex items-center gap-2.5">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', (num.status === 'connected' || num.status === 'CONNECTED') ? 'bg-status-active' : 'bg-surface-600')} />
                <span className="text-sm text-surface-300 flex-1 truncate">{num.displayPhoneNumber}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full leading-none font-medium',
                  (num.status === 'connected' || num.status === 'CONNECTED') ? 'text-status-active bg-status-active-bg' : 'text-surface-500 bg-surface-800',
                )}>
                  {(num.status === 'connected' || num.status === 'CONNECTED') ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => navigate('/settings/numbers')}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 border border-surface-700 hover:border-surface-600 rounded-xl py-2 transition-colors"
      >
        Gerenciar números <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function LiveServiceCard({ stats }: { stats: HomeStats }) {
  const navigate = useNavigate()
  return (
    <div className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-surface-100">Atendimento agora</h4>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-status-active animate-pulse" />
          <span className="text-[10px] text-status-active font-medium">Ao vivo</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {[
          {
            label: 'Na fila',
            value: stats.queueCount,
            cls: stats.queueCount > 5 ? 'text-red-400' : stats.queueCount > 2 ? 'text-status-pending' : 'text-status-active',
            icon: <Inbox className="w-3.5 h-3.5" />,
          },
          {
            label: 'Abertas',
            value: stats.conversationsOpen,
            cls: 'text-surface-200',
            icon: <MessageSquare className="w-3.5 h-3.5" />,
          },
          {
            label: 'Resolvidas hoje',
            value: stats.conversationsResolvedToday,
            cls: 'text-status-active',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          },
          {
            label: 'Tempo médio',
            value: `${stats.avgResponseMinutes}min`,
            cls: stats.avgResponseMinutes > 10 ? 'text-status-pending' : 'text-surface-200',
            icon: <Clock className="w-3.5 h-3.5" />,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-surface-500">
              {row.icon}
              <span className="text-xs">{row.label}</span>
            </div>
            <span className={cn('text-sm font-semibold tabular-nums', row.cls)}>{row.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/conversations')}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 border border-surface-700 hover:border-surface-600 rounded-xl py-2 transition-colors"
      >
        Ver conversas <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function SupervisorBlock() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/conversations`, { params: { assignedTo: 'unassigned', status: 'open' } })
      .then((r) => { const list = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []; setQueue(list.slice(0, 5)); setLoading(false) })
      .catch(() => { setQueue([]); setLoading(false) })
  }, [])

  return (
    <div className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-surface-100">Fila de espera</h4>
        <span className="text-xs text-surface-500">{loading ? '…' : `${queue.length} sem usuário`}</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-sm text-surface-400">Fila vazia — todas as conversas estão atribuídas!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {queue.map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigate('/conversations')}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left w-full"
            >
              <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300 flex-shrink-0">
                {getInitials(conv.contact.displayName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">{conv.contact.displayName}</p>
                <p className="text-xs text-surface-500 truncate">{conv.lastMessagePreview}</p>
              </div>
              <span className="text-xs text-status-pending bg-status-pending-bg px-2 py-0.5 rounded-full flex-shrink-0">Na fila</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => navigate('/conversations')}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 border border-surface-700 hover:border-surface-600 rounded-xl py-2 transition-colors"
      >
        Ver todas as conversas <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function AgentBlock() {
  const navigate = useNavigate()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/conversations`, { params: { assignedTo: 'me', status: 'open' } })
      .then((r) => { const list = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []; setConvs(list.slice(0, 5)); setLoading(false) })
      .catch(() => { setConvs([]); setLoading(false) })
  }, [])

  return (
    <div className="card-glow bg-surface-900 border border-surface-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-surface-100">Minhas conversas abertas</h4>
        <span className="text-xs text-surface-500">{loading ? '…' : `${convs.length} abertas`}</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : convs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <MessageSquare className="w-8 h-8 text-surface-700" />
          <p className="text-sm text-surface-400">Nenhuma conversa aberta no momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {convs.map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigate('/conversations')}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left w-full"
            >
              <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300 flex-shrink-0">
                {getInitials(conv.contact.displayName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">{conv.contact.displayName}</p>
                <p className="text-xs text-surface-500 truncate">{conv.lastMessagePreview}</p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand-600 text-surface-950 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => navigate('/conversations')}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 border border-surface-700 hover:border-surface-600 rounded-xl py-2 transition-colors"
      >
        Ver todas as conversas <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function HomePage() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [stats, setStats] = useState<HomeStats | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    const fallbackStats: HomeStats = {
      conversationsOpen: 0, conversationsResolvedToday: 0, messagesSentToday: 0,
      newContactsThisWeek: 0, agentsOnline: 0, agentsActive: 0, agentsPending: 0,
      avgResponseMinutes: 0, queueCount: 0, planUsed: 0, planLimit: 0,
      myConversationsOpen: 0, myConversationsResolvedToday: 0, myAvgResponseMinutes: 0, myMessagesSentToday: 0,
    }
    axios.get<HomeStats>(`${API}/home/stats`)
      .then((r) => setStats(r.data))
      .catch(() => setStats(fallbackStats))
    axios.get<{ data: AuditLog[] }>(`${API}/audit-logs`, { params: { limit: 8 } })
      .then((r) => { setLogs(Array.isArray(r.data?.data) ? r.data.data : []); setLogsLoading(false) })
      .catch(() => { setLogs([]); setLogsLoading(false) })
  }, [])

  const role = user?.role ?? 'agent'
  const currentUser = user
    ? { firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }
    : undefined

  // Phase 28+ — Single 12-column grid for the whole Home page. Each card
  // declares its own col-span so cards on the same row align in height
  // automatically (CSS Grid behavior). On mobile (<lg) the grid collapses
  // to a single column and everything stacks vertically.
  //
  // Row layout (desktop):
  //   1. Saudação                     — col-span-12
  //   2. WorkspaceReadinessBanner     — col-span-12  (auto-hides when no blockers)
  //   3. 4 KPIs (sub-grid)            — col-span-12  (KPIGrid mantém grid-cols-4 interno)
  //   4. Insights da Oryon AI         — col-span-12
  //   5. 3 cards admin (Equipe / Whatsapp / Atendimento) — col-span-4 cada
  //      Renderizado apenas pra admin / business_admin / super_admin.
  //   6. Quick Actions                — col-span-8
  //      Activity Feed                — col-span-4
  const isAdminRole = role === 'admin' || role === 'business_admin' || role === 'super_admin'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isMobile && <MobilePageHeader title="Home" />}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* max-w-screen-2xl + mx-auto: limita a largura útil em telas
            muito largas (≥1536px) e centraliza, mantendo respiro visual
            sem comprimir os cards. Mid-ground entre max-w-7xl (estreito
            demais) e largura total (cards esticam). */}
        <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-screen-2xl mx-auto w-full">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

            {/* ── Linha 1: saudação ────────────────────────────────────── */}
            {user && (
              <div className="lg:col-span-12">
                <PersonalHeader user={user} />
              </div>
            )}

            {/* ── Linha 2: workspace readiness banner ──────────────────────
                Auto-hides quando não há pendências (return null no componente).
                Sem placeholder — KPIs encostam direto na saudação no estado OK. */}
            <div className="lg:col-span-12">
              <WorkspaceReadinessBanner mode="checklist" />
            </div>

            {/* ── Arquitetura main + rail ────────────────────────────────
                MAIN (8/12): a narrativa do MEU dia — desempenho pessoal,
                números do workspace, insights da IA, gestão e fila.
                RAIL (4/12): o que eu FAÇO e o que ACONTECE — atendimento ao
                vivo (admin), ações rápidas e atividade recente, sempre à
                mão sem competir com a leitura principal. */}
            <div className="lg:col-span-12 xl:col-span-8">
              <div className="flex flex-col gap-5 sm:gap-6">
                {stats && <MyPerformanceCard stats={stats} />}

                {stats ? <KPIGrid stats={stats} role={role} /> : <KPIGridSkeleton />}

                {stats && <AIInsightsWidget stats={stats} />}

                {stats && isAdminRole && !isMobile && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                    <TeamCard stats={stats} />
                    <WhatsAppNumbersCard />
                  </div>
                )}

                {role === 'supervisor' && !isMobile && <SupervisorBlock />}
                {role === 'agent' && !isMobile && <AgentBlock />}
              </div>
            </div>

            <div className="lg:col-span-12 xl:col-span-4">
              <div className="flex flex-col gap-5 sm:gap-6">
                {stats && isAdminRole && !isMobile && <LiveServiceCard stats={stats} />}
                <QuickActions role={role} />
                <ActivityFeed logs={logs} loading={logsLoading} />
              </div>
            </div>

          </div>

          {/* Footer spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
