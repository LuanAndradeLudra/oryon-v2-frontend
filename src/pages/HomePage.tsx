import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  MessageSquare, Users, BarChart3, Settings, Bot,
  Clock, CheckCircle2, Inbox, CreditCard, Smartphone,
  ChevronRight, X, Sparkles, UserPlus, Tag, MessageCircle,
  AlertTriangle, Zap, Hand, Workflow,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useCopilotContext } from '@/contexts/CopilotContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { generateInsights } from '@/services/copilotService'
import { cn, getInitials } from '@/lib/utils'
import type { AuditLog, BillingPlan, Conversation, HomeStats, User, WhatsAppNumberDetailed } from '@/types'

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

// ── Hero Banner ────────────────────────────────────────────────────────────────

function HeroBanner() {
  const navigate = useNavigate()
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-white/10 px-5 py-6 sm:px-8 sm:py-8">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-12 right-1/4 w-48 h-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute top-0 left-1/3 w-[500px] h-40 rounded-full bg-white/3 blur-3xl" />

      <div className="relative flex items-center justify-between gap-8">
        {/* Left: content */}
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-3 bg-brand-500/20 text-brand-300">
            Oryon Platform
          </span>
          <h1 className="text-2xl font-bold text-white leading-snug">
            Sua central de atendimento<br />inteligente com IA
          </h1>
          <p className="text-sm text-white/60 mt-2 max-w-lg leading-relaxed">
            Conversas, CRM e automação conectados em um único lugar — com o Copilot sempre ao seu lado.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => navigate('/copilot')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Explorar Copilot
            </button>
            <button
              onClick={() => navigate('/conversations')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-white/60 hover:text-white text-sm font-medium transition-colors"
            >
              Ver conversas
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: floating icon grid */}
        <div className="relative w-52 h-36 flex-shrink-0 hidden lg:block">
          <div className="absolute top-0 right-6 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-xl">
            <Sparkles className="w-7 h-7 text-brand-300" />
          </div>
          <div className="absolute top-8 right-24 w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-brand-300" />
          </div>
          <div className="absolute bottom-2 right-10 w-12 h-12 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="absolute bottom-8 right-32 w-9 h-9 rounded-xl bg-white/6 border border-white/8 flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-sky-300" />
          </div>
          <div className="absolute top-2 right-36 w-8 h-8 rounded-xl bg-white/6 border border-white/8 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-300" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Personal header ────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  business_admin: { label: 'Admin',      cls: 'bg-brand-600/15 text-brand-400 border border-brand-600/30' },
  admin:          { label: 'Admin',      cls: 'bg-brand-600/15 text-brand-400 border border-brand-600/30' },
  supervisor:     { label: 'Supervisor', cls: 'bg-status-pending-bg text-status-pending border border-status-pending-border' },
  agent:          { label: 'Agente',     cls: 'bg-surface-700 text-surface-300 border border-surface-600' },
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
      <h1 className="text-2xl font-bold text-surface-50">
        {greeting}, {user.firstName} <Hand className="w-6 h-6 inline text-surface-400" />
      </h1>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', role.cls)}>
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
  blue:   { bg: 'bg-blue-500/10',    icon: 'text-blue-400',    ring: 'ring-blue-500/20' },
  amber:  { bg: 'bg-status-pending-bg',   icon: 'text-status-pending',   ring: 'ring-status-pending-border' },
  purple: { bg: 'bg-purple-500/10',  icon: 'text-purple-400',  ring: 'ring-purple-500/20' },
}

function KPICard({ data }: { data: KPIData }) {
  const c = KPI_COLORS[data.color] ?? KPI_COLORS.brand
  const Icon = data.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-surface-900 border border-surface-800 rounded-2xl p-5 flex flex-col gap-3"
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
        <p className="text-xs text-surface-400 uppercase tracking-wide mt-1.5">{data.label}</p>
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
      {getKPIs(stats, role).map((kpi) => (
        <KPICard key={kpi.label} data={kpi} />
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
    <div className="bg-surface-900 border border-surface-700 shadow-sm rounded-2xl p-5">
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
              <button
                onClick={() => open(insight)}
                className="text-[11px] text-brand-400 hover:text-brand-300 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap"
              >
                Perguntar →
              </button>
            </div>
          ))}
        </div>
      )}
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
    { label: 'Convidar usuário',  description: 'Adicionar à equipe',              icon: UserPlus,      iconColor: 'text-blue-400',    iconBg: 'bg-blue-500/10',    href: '/settings/agents' },
    { label: 'Plano & Cobrança',  description: 'Gerenciar assinatura',            icon: CreditCard,    iconColor: 'text-amber-400',   iconBg: 'bg-amber-500/10',   href: '/settings/billing' },
    { label: 'Configurar CRM',    description: 'Estágios e campos personalizados', icon: Settings,      iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10', href: '/contacts' },
    { label: 'Automações',         description: 'Fluxos automáticos',               icon: Workflow,      iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/automations' },
    { label: 'Relatórios',        description: 'Dashboard de métricas',            icon: BarChart3,     iconColor: 'text-surface-400', iconBg: 'bg-surface-700',    href: '/dashboard' },
  ]
  if (role === 'supervisor') return [
    { label: 'Fila de espera',    description: 'Sem agente atribuído',            icon: Inbox,         iconColor: 'text-amber-400',   iconBg: 'bg-amber-500/10',   href: '/conversations' },
    { label: 'Minha equipe',      description: 'Gerenciar usuários',              icon: Users,         iconColor: 'text-blue-400',    iconBg: 'bg-blue-500/10',    href: '/settings/agents' },
    { label: 'Criar tag',         description: 'Organizar conversas',             icon: Tag,           iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10', href: '/settings/tags' },
    { label: 'Relatórios',        description: 'Métricas da equipe',              icon: BarChart3,     iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/dashboard' },
    { label: 'Respostas rápidas', description: 'Templates de mensagem',           icon: Zap,           iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/settings/quick-replies' },
    { label: 'CRM',               description: 'Pipeline de vendas',              icon: MessageSquare, iconColor: 'text-surface-400', iconBg: 'bg-surface-700',    href: '/contacts' },
  ]
  return [
    { label: 'Minhas conversas',  description: 'Ver atribuídas a mim',            icon: MessageSquare, iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/conversations' },
    { label: 'Contatos',          description: 'Gerenciar CRM',                   icon: Users,         iconColor: 'text-blue-400',    iconBg: 'bg-blue-500/10',    href: '/contacts' },
    { label: 'Respostas rápidas', description: 'Usar templates salvos',           icon: Zap,           iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10', href: '/settings/quick-replies' },
    { label: 'Relatórios',        description: 'Meu desempenho',                  icon: BarChart3,     iconColor: 'text-amber-400',   iconBg: 'bg-amber-500/10',   href: '/dashboard' },
  ]
}

function QuickActions({ role }: { role: string }) {
  const navigate = useNavigate()
  const actions = getQuickActions(role)
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 h-full">
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
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 h-full">
      <h3 className="text-sm font-semibold text-surface-100 mb-4">Atividade recente</h3>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <p className="text-sm text-surface-500">Nenhuma atividade registrada ainda.</p>
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

function AdminBlock({ stats }: { stats: HomeStats }) {
  const navigate = useNavigate()
  const [billing, setBilling] = useState<BillingPlan | null>(null)
  const [waNumbers, setWaNumbers] = useState<WhatsAppNumberDetailed[]>([])

  useEffect(() => {
    Promise.all([
      axios.get<BillingPlan>(`${API}/billing`).catch(() => ({ data: null })),
      axios.get<WhatsAppNumberDetailed[]>(`${API}/whatsapp/numbers`).catch(() => ({ data: [] })),
    ]).then(([b, w]) => {
      if (b.data) setBilling(b.data)
      setWaNumbers(Array.isArray(w.data) ? w.data : [])
    })
  }, [])

  const planPct = billing && (billing.conversationsLimit ?? 0) > 0 ? Math.round(((billing.conversationsUsed ?? 0) / (billing.conversationsLimit ?? 1)) * 100) : 0
  const PLAN_NAMES: Record<string, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }

  return (
    <div className="flex flex-col gap-4">
      {/* Plan */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-surface-100">Plano atual</h4>
          <CreditCard className="w-4 h-4 text-surface-600" />
        </div>
        {billing ? (
          <>
            <p className="text-xl font-bold text-surface-50">{PLAN_NAMES[billing.planName] ?? billing.planName}</p>
            <p className="text-xs text-surface-500 mt-0.5 mb-4">
              Renova em {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(billing.renewalDate))}
            </p>
            <div>
              <div className="flex justify-between text-xs text-surface-400 mb-1.5">
                <span>{(billing.conversationsUsed ?? 0).toLocaleString('pt-BR')} conversas usadas</span>
                <span className={planPct > 80 ? 'text-status-pending font-semibold' : ''}>{planPct}%</span>
              </div>
              <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', planPct > 80 ? 'bg-status-pending' : 'bg-brand-500')}
                  style={{ width: `${Math.min(planPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-surface-600 mt-1">de {(billing.conversationsLimit ?? 0).toLocaleString('pt-BR')}/mês</p>
            </div>
            {planPct > 80 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-status-pending bg-status-pending-bg border border-status-pending-border rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Próximo do limite — considere fazer upgrade
              </div>
            )}
          </>
        ) : (
          <div className="h-20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <button
          onClick={() => navigate('/settings/billing')}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 border border-brand-600/30 hover:border-brand-500/50 rounded-xl py-2 transition-colors"
        >
          Ver plano completo <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Team */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-surface-100">Equipe</h4>
          <Users className="w-4 h-4 text-surface-600" />
        </div>
        <div className="flex flex-col gap-3 mt-1">
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

      {/* WhatsApp numbers */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-surface-100">Números WhatsApp</h4>
          <Smartphone className="w-4 h-4 text-surface-600" />
        </div>
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
        <button
          onClick={() => navigate('/settings/numbers')}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 border border-surface-700 hover:border-surface-600 rounded-xl py-2 transition-colors"
        >
          Gerenciar números <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Atendimento agora */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-surface-100">Atendimento agora</h4>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-active animate-pulse" />
            <span className="text-[10px] text-status-active font-medium">Ao vivo</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
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
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
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
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
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

// ── Section label ──────────────────────────────────────────────────────────────

const CONTEXT_LABELS: Record<string, string> = {
  business_admin: 'Visão geral da organização',
  admin:          'Visão geral da organização',
  supervisor:     'Fila do seu setor',
  agent:          'Suas conversas',
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isMobile && <MobilePageHeader title="Home" />}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-4 py-5 sm:px-6 sm:py-6 flex flex-col gap-5 sm:gap-6">

          {/* HeroBanner so em desktop — em mobile ocupa muito espaco para
              pouca informacao acionavel. */}
          {!isMobile && <HeroBanner />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* ── LEFT: personal section ── */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {user && <PersonalHeader user={user} />}

              {stats ? <KPIGrid stats={stats} role={role} /> : <KPIGridSkeleton />}

              {/* AI Insights so em desktop — bloco grande com varias linhas
                  longas que polui a Home em viewport estreita. Atendente ve
                  insights via Copilot quando precisar. */}
              {!isMobile && stats && <AIInsightsWidget stats={stats} />}

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:min-h-[300px]">
                <div className="lg:col-span-2">
                  <QuickActions role={role} />
                </div>
                <div className="lg:col-span-3">
                  <ActivityFeed logs={logs} loading={logsLoading} />
                </div>
              </div>
            </div>

            {/* ── RIGHT: org overview — desktop only ── */}
            {!isMobile && (
              <div className="flex flex-col gap-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600">
                  {CONTEXT_LABELS[role]}
                </p>
                {stats && (role === 'admin' || role === 'business_admin') && <AdminBlock stats={stats} />}
                {role === 'supervisor' && <SupervisorBlock />}
                {role === 'agent' && <AgentBlock />}
              </div>
            )}

          </div>

          {/* Footer spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
