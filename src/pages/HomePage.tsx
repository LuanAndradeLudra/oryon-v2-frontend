import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Users, BarChart3, Settings,
  Clock, CheckCircle2, Inbox,
  ChevronRight, Sparkles, UserPlus, Tag, MessageCircle,
  Zap, Hand, Send, TrendingUp, Keyboard, Lightbulb,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useCopilotContext } from '@/contexts/CopilotContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { generateInsights } from '@/services/copilotService'
import { isFeatureVisible } from '@/config/featureFlags'
import { cn, getInitials } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { WorkspaceReadinessBanner } from '@/components/common/WorkspaceReadinessBanner'
import type { Conversation, HomeStats, User } from '@/types'
import { api, conversationsApi } from '@/services/api'
import { listTenantAuditFeed, type TenantAuditRow } from '@/services/tenantAuditApi'
import { formatActivity } from '@/components/dashboard/activityFormatter'
import { isAdminTier } from '@/lib/roleHelpers'
import { comVolta } from '@/lib/voltarPara'
import type { ConversationFilters } from '@/types'


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
  super_admin:    { label: 'Equipe Oryon', chip: 'var(--color-accent-dark)' },
  business_admin: { label: 'Dono',         chip: 'var(--color-brand-500)' },
  admin:          { label: 'Admin',        chip: 'var(--color-brand-500)' },
  supervisor:     { label: 'Supervisor',   chip: 'var(--color-status-pending)' },
  agent:          { label: 'Agente',       chip: 'var(--color-status-muted)' },
}

function PersonalHeader({ user }: { user: User }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dataLonga = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())
  // Só a primeira letra maiúscula: o `capitalize` do CSS fazia "29 De Setembro De".
  const date = dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1)
  const role = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.agent

  return (
    <div>
      <h1 className="text-2xl font-display font-bold tracking-[-0.01em] text-surface-100">
        {greeting}, {user.firstName}
        <Hand className="w-6 h-6 inline-block ml-3 align-[-3px] text-brand-400" aria-hidden />
      </h1>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className={cn('color-chip-soft inline-flex items-center h-5 px-1.5 rounded-xs text-[11px] font-semibold border')} style={{ ['--chip']: role.chip } as React.CSSProperties}>
          {role.label}
        </span>
        {user.departmentName && (
          <>
            <span className="text-surface-500">·</span>
            <span className="text-sm text-surface-400">{user.departmentName}</span>
          </>
        )}
        <span className="text-surface-500">·</span>
        <span className="text-sm text-surface-500">{date}</span>
      </div>
    </div>
  )
}

// ── KPI cards ──────────────────────────────────────────────────────────────────

type KPIColor = 'brand' | 'green' | 'blue' | 'amber' | 'purple'

interface KPIData {
  label: string
  /** Destino ao clicar (ex.: "Na fila" abre a Fila da inbox). */
  href?: string
  value: string | number
  subtext?: string
  icon: React.ComponentType<{ className?: string }>
  color: KPIColor
  trend?: string
  trendUp?: boolean
}

function KPICard({ data }: { data: KPIData }) {
  const corpo = (
    <>
      <span className="text-[11px] font-medium text-surface-400 truncate">{data.label}</span>
      <p className="text-[26px] font-extrabold tracking-[-0.02em] leading-[1.15] mt-0.5 text-surface-100 tabular-nums">{typeof data.value === 'number' ? data.value.toLocaleString('pt-BR') : data.value}</p>
      <div className="flex items-center gap-1.5 min-w-0 text-[11.5px]">
        {data.trend && (
          <span className={cn(
            'font-medium',
            data.trendUp === true ? 'text-status-active' : data.trendUp === false ? 'text-danger' : 'text-surface-500',
          )}>
            {data.trend}
          </span>
        )}
        {data.subtext && <span className="text-surface-500 truncate">{data.subtext}</span>}
        {!data.trend && !data.subtext && <span>&nbsp;</span>}
      </div>
    </>
  )
  return data.href ? (
    <Link to={data.href} className="flex flex-col gap-0.5 px-3.5 py-3 lg:py-2.5 min-w-0 hover:bg-[var(--rowhover)] transition-colors">
      {corpo}
    </Link>
  ) : (
    <div className="flex flex-col gap-0.5 px-3.5 py-3 lg:py-2.5 min-w-0">{corpo}</div>
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
    { label: 'Na fila', value: stats.queueCount ?? 0, icon: Inbox, color: (stats.queueCount ?? 0) > 5 ? 'amber' : 'green', href: '/conversations?aba=fila', subtext: 'pendentes sem dono' },
    { label: 'Resolvidas hoje', value: stats.conversationsResolvedToday ?? 0, icon: CheckCircle2, color: 'green' },
    { label: 'Mensagens hoje', value: stats.messagesSentToday ?? 0, icon: MessageCircle, color: 'purple' },
  ]
  return [
    { label: 'Conversas abertas', value: stats.conversationsOpen ?? 0, icon: MessageSquare, color: 'brand' },
    { label: 'Resolvidas hoje', value: stats.conversationsResolvedToday ?? 0, icon: CheckCircle2, color: 'green' },
    { label: 'Na fila', value: stats.queueCount ?? 0, icon: Inbox, color: 'amber', href: '/conversations?aba=fila', subtext: 'pendentes sem dono' },
    { label: 'Mensagens hoje', value: stats.messagesSentToday ?? 0, icon: MessageCircle, color: 'purple' },
  ]
}

function KPIGrid({ stats, role, linkAoVivo = false }: { stats: HomeStats; role: string; linkAoVivo?: boolean }) {
  return (
    // Rótulo: sem ele, "Conversas abertas 1.948" (equipe) ficava logo abaixo de
    // "Conversas abertas 0" (o seu desempenho) sem dizer que são números diferentes.
    <section aria-label="Toda a equipe agora">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[.08em] text-surface-500">Toda a equipe</h3>
      {/* A operação ao vivo (quem espera, equipe online) mora no Dashboard. */}
      {linkAoVivo && (
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-surface-400 hover:text-surface-100 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-online" aria-hidden />
          Ao vivo no Dashboard <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      )}
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-surface-800 border border-surface-700 rounded-lg overflow-hidden divide-x divide-surface-700 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-surface-700 lg:[&>*:nth-child(n+3)]:border-t-0">
      {getKPIs(stats, role).map((kpi) => (
        <KPICard key={kpi.label} data={kpi} />
      ))}
    </div>
    </section>
  )
}

function KPIGridSkeleton() {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg h-[84px] animate-pulse" />
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
    <div className="bg-surface-800 border border-surface-700 rounded-lg p-3.5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {/* Eixo 10: mesmo badge do AiInsightsSection.tsx (Dashboard) — bg-white
              + text-black não é selo de marca, ficava sem contraste no claro. */}
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
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
                  className="text-[11px] text-accent-dark hover:opacity-80 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap"
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

/** Total de uma consulta de conversas (limit=1; só o `total` interessa). */
function useTotalDeConversas(filtros: ConversationFilters): number | null {
  const [total, setTotal] = useState<number | null>(null)
  const chave = JSON.stringify(filtros)
  useEffect(() => {
    let vivo = true
    conversationsApi.list(JSON.parse(chave) as ConversationFilters, 1, 1)
      .then((r) => { if (vivo) setTotal(r.data.total ?? null) })
      .catch(() => { if (vivo) setTotal(null) })
    return () => { vivo = false }
  }, [chave])
  return total
}

function MyPerformanceCard({ stats }: { stats: HomeStats }) {
  // Pessoais e acionáveis: as que a IA passou para mim (pendentes) e as em
  // que o cliente falou por último. Mesmos filtros das abas da inbox.
  const precisamDeVoce = useTotalDeConversas({ status: 'pending', assignedTo: 'me' })
  const esperandoResposta = useTotalDeConversas({ assignedTo: 'me', awaitingReply: true })
  // Fallback p/ 0 quando o backend não popula os campos myXxx (acontece com
  // super_admin / users sem conversas atribuídas, ou se o endpoint
  // /home/stats ainda não retorna esses campos). Sem isso, o template
  // literal `${undefined}min` vira "undefinedmin" na UI.
  const myOpen      = stats.myConversationsOpen ?? 0
  const myResolved  = stats.myConversationsResolvedToday ?? 0
  const mySent      = stats.myMessagesSentToday ?? 0
  const myAvgMin    = stats.myAvgResponseMinutes

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-400" />
          Seu desempenho hoje
        </h4>
      </div>
      {/* Linhas próximas (antes se espalhavam na altura e o card parecia vazio). */}
      <div className="flex flex-col gap-2">
        {[
          {
            label: 'Precisam de você',
            value: precisamDeVoce ?? '—',
            cls: (precisamDeVoce ?? 0) > 0 ? 'text-status-pending' : 'text-surface-200',
            icon: <Hand className="w-3.5 h-3.5" />,
          },
          {
            label: 'Esperando sua resposta',
            value: esperandoResposta ?? '—',
            cls: (esperandoResposta ?? 0) > 0 ? 'text-status-pending' : 'text-surface-200',
            icon: <MessageCircle className="w-3.5 h-3.5" />,
          },
          {
            label: 'Minhas conversas abertas',
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
            label: 'Tempo médio de resposta',
            // Sem mensagem enviada hoje não há tempo médio: "—", não "0min".
            value: myAvgMin == null ? '—' : `${myAvgMin.toLocaleString('pt-BR')} min`,
            // Mesma régua do "Atendimento agora": >10min = atenção.
            cls: (myAvgMin ?? 0) > 10 ? 'text-status-pending' : 'text-surface-200',
            icon: <Clock className="w-3.5 h-3.5" />,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-surface-500">
              {row.icon}
              <span className="text-xs">{row.label}</span>
            </div>
            <span className={cn('text-sm font-semibold tabular-nums', row.cls)}>{typeof row.value === 'number' ? row.value.toLocaleString('pt-BR') : row.value}</span>
          </div>
        ))}
      </div>
      <Link
        to="/conversations?aba=minhas"
        className="mt-auto pt-3 inline-flex items-center gap-1 text-xs font-medium text-surface-400 hover:text-surface-100 transition-colors"
      >
        Abrir minhas conversas <ChevronRight className="w-3.5 h-3.5" aria-hidden />
      </Link>
    </Card>
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
  // Admin, dono e equipe Oryon: antes só `admin` caía aqui — dono e staff
  // viam os atalhos de atendente.
  if (isAdminTier(role)) return [
    { label: 'Conversas',         description: 'Ver todas as conversas',          icon: MessageSquare, iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/conversations?aba=todas' },
    { label: 'Convidar usuário',  description: 'Adicionar à equipe',              icon: UserPlus,      iconColor: 'text-accent-blue',    iconBg: 'bg-accent-blue/10',    href: '/settings/agents' },
    { label: 'Configurar CRM',    description: 'Situações e campos',              icon: Settings,      iconColor: 'text-accent-green', iconBg: 'bg-accent-green/10', href: '/contacts?config=crm' },
    { label: 'Relatórios',        description: 'Métricas da equipe',              icon: BarChart3,     iconColor: 'text-surface-400', iconBg: 'bg-[var(--sf2)]',    href: '/dashboard?aba=relatorios' },
  ]
  if (role === 'supervisor') return [
    { label: 'Fila',              description: 'Pendentes sem dono',              icon: Inbox,         iconColor: 'text-accent-amber',   iconBg: 'bg-accent-amber/10',   href: '/conversations?aba=fila' },
    { label: 'Minha equipe',      description: 'Gerenciar usuários',              icon: Users,         iconColor: 'text-accent-blue',    iconBg: 'bg-accent-blue/10',    href: '/settings/agents' },
    { label: 'Etiquetas',         description: 'Organizar conversas',             icon: Tag,           iconColor: 'text-accent-green', iconBg: 'bg-accent-green/10', href: '/settings/tags' },
    { label: 'Relatórios',        description: 'Métricas da equipe',              icon: BarChart3,     iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/dashboard?aba=relatorios' },
    { label: 'Respostas rápidas', description: 'Atalhos de texto',                icon: Zap,           iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/settings/quick-replies' },
    { label: 'Leads',             description: 'Contatos e funis',                icon: MessageSquare, iconColor: 'text-surface-400', iconBg: 'bg-[var(--sf2)]',    href: '/contacts' },
  ]
  return [
    { label: 'Minhas conversas',  description: 'Atribuídas a mim',                icon: MessageSquare, iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10',   href: '/conversations?aba=minhas' },
    { label: 'Leads',             description: 'Contatos e funis',                icon: Users,         iconColor: 'text-accent-blue',    iconBg: 'bg-accent-blue/10',    href: '/contacts' },
    { label: 'Funis',             description: 'Negócios em andamento',           icon: Zap,           iconColor: 'text-accent-green', iconBg: 'bg-accent-green/10', href: '/pipelines' },
    { label: 'Relatórios',        description: 'Meu desempenho',                  icon: BarChart3,     iconColor: 'text-accent-amber',   iconBg: 'bg-accent-amber/10',   href: '/dashboard?aba=relatorios' },
  ]
}

function QuickActions({ role }: { role: string }) {
  const navigate = useNavigate()
  const { isRouteVisible } = useFeatureVisibility()
  const actions = getQuickActions(role).filter((action) => isRouteVisible(action.href))
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg p-3.5 h-full">
      <h3 className="text-sm font-semibold text-surface-100 mb-3">Ações rápidas</h3>
      {/* Na grade de 3 (desktop) uma por linha: em duas, os textos saíam cortados. */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              // Configurações leva o caminho de volta para a Home.
              onClick={() => navigate(a.href.startsWith('/settings/') ? comVolta(a.href, '/home', 'Voltar para a Home') : a.href)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-sm hover:bg-[var(--rowhover)] transition-colors text-left group"
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', a.iconBg)}>
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

/**
 * Atividade recente: o mesmo feed da Auditoria (`/audit/tenant-feed`, só
 * admin/dono). Antes lia `/audit-logs` com outro formato (userName, ações
 * `conversation.resolved`) e mostrava "Em breve" — o registro já existe e
 * funciona em Configurações → Auditoria.
 */
/** Quem fez: "Você", a IA, o sistema ou o nome (e-mail vira só a parte antes do @). */
function quemFez(row: TenantAuditRow, meuId: string | undefined): string {
  if (row.actorId && row.actorId === meuId) return 'Você'
  if (row.actorType === 'agent') return row.actorName ? `IA · ${row.actorName}` : 'IA'
  if (row.actorType !== 'user') return 'Sistema'
  const nome = row.actorName ?? ''
  return nome.includes('@') ? nome.split('@')[0] : nome || 'Alguém da equipe'
}

type ItemDeAtividade = TenantAuditRow & { vezes: number }

/** Junta eventos seguidos iguais (mesma ação, mesmo alvo, mesmo autor) numa linha. */
function agruparRepeticoes(rows: TenantAuditRow[]): ItemDeAtividade[] {
  const out: ItemDeAtividade[] = []
  for (const row of rows) {
    const ant = out[out.length - 1]
    if (ant && ant.action === row.action && ant.entityName === row.entityName && ant.actorId === row.actorId) ant.vezes++
    else out.push({ ...row, vezes: 1 })
  }
  return out
}

function ActivityFeed() {
  const { user } = useAuth()
  const meuId = user?.id
  const [rows, setRows] = useState<ItemDeAtividade[] | null>(null)
  const [erro, setErro] = useState(false)
  // Busca 30 e agrupa repetições seguidas (ex.: a sincronização de modelos
  // roda muitas vezes): 6 linhas de coisas DIFERENTES, com a contagem.
  const buscar = () => listTenantAuditFeed({ limit: 30 })
    .then((r) => setRows(agruparRepeticoes(r.data).slice(0, 5)))
    .catch(() => setErro(true))
  // Primeira carga direto no efeito (o estado inicial já é "carregando").
  useEffect(() => { void buscar() }, [])
  const carregar = () => {
    setErro(false)
    setRows(null)
    void buscar()
  }

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg p-3.5 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-100">Atividade recente</h3>
        <Link to={comVolta('/settings/audit', '/home', 'Voltar para a Home')} className="text-[11px] text-surface-500 hover:text-surface-200 transition-colors">
          Ver tudo
        </Link>
      </div>
      {erro ? (
        <div className="py-6 text-center">
          <p className="text-sm text-surface-500">Não foi possível carregar a atividade.</p>
          <button type="button" onClick={carregar} className="mt-2 text-xs font-semibold text-brand-300 hover:text-brand-200">Tentar de novo</button>
        </div>
      ) : rows === null ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-surface-500">Nenhuma atividade da equipe ainda.</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-3 py-1.5 border-b border-surface-700 last:border-0">
              <div className="w-7 h-7 rounded-full bg-[var(--sf2)] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-surface-300 mt-0.5">
                {getInitials(quemFez(row, meuId))}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {/* A frase é o que aconteceu (em português, por evento); quem fez
                    e quando vão embaixo — antes o nome vinha colado numa frase
                    na voz passiva ("admin@… Templates pulled from meta"). */}
                {/* Uma linha (o card não cresce em telas menores); a frase inteira no title. */}
                {(() => {
                  const frase = formatActivity({ action: row.action, subject: row.entityName ?? '', details: row.details, description: row.description })
                  return <p className="text-sm text-surface-200 leading-snug truncate" title={frase}>{frase}</p>
                })()}
                <p className="mt-0.5 text-xs text-surface-500 truncate">
                  {quemFez(row, meuId)} · {relativeTime(row.createdAt)}{row.vezes > 1 ? ` · ${row.vezes} vezes` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Contextual block ───────────────────────────────────────────────────────────

// ── A operação fica no Dashboard (passada estrutural de 27/09) ────────────────
// A Home é o MEU dia; a operação ao vivo mora no Dashboard (aba Agora). A porta
// até lá é o link "Ao vivo no Dashboard" no título de "Toda a equipe" — o card
// solto que fazia isso saiu na grade alinhada de 29/09.

// ── Parte de baixo: atalhos e dica (informativo) ───────────────────────────────
// Não repete o Dashboard: é o que ajuda a usar a plataforma no dia a dia. Só
// atalhos e comportamentos que existem de verdade (conferidos no código).

const ATALHOS: { teclas: string[]; oQue: string }[] = [
  { teclas: ['/'], oQue: 'Buscar em qualquer tela' },
  { teclas: ['J', 'K'], oQue: 'Próxima e anterior conversa' },
  { teclas: ['R'], oQue: 'Assumir a conversa aberta' },
  { teclas: ['E'], oQue: 'Resolver a conversa aberta' },
  { teclas: ['/'], oQue: 'Respostas rápidas ao escrever' },
  { teclas: ['↑', '↓'], oQue: 'Trocar de contato em Leads' },
  { teclas: ['Esc'], oQue: 'Fechar janela ou painel' },
]

const DICAS: string[] = [
  'Na Fila ficam as conversas que a IA passou para a equipe e ninguém assumiu, as mais antigas primeiro.',
  'Pausar a IA numa conversa já atribui a conversa a você.',
  'Depois de 24 horas sem mensagem do cliente, o WhatsApp só permite escrever com um modelo aprovado.',
  'Ao resolver uma conversa, registre o desfecho do negócio: é ele que alimenta os relatórios do funil.',
  'Os endereços de Leads, Conversas e Funis guardam os filtros: copie o link para mostrar a mesma tela a alguém.',
  'Em Configurações → Respostas rápidas você cria atalhos de texto para as mensagens que mais se repetem.',
  'Conversas com o selo de verificação pedem que alguém confira o que a IA respondeu antes de seguir.',
]

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-[5px] border border-surface-600 bg-[var(--sf2)] text-[11px] font-semibold text-surface-200 font-mono">
      {children}
    </kbd>
  )
}

function AtalhosEDica() {
  // Uma dica por dia (muda à meia-noite; a mesma para toda a equipe no dia).
  const dia = Math.floor(Date.now() / 86_400_000)
  const dica = DICAS[dia % DICAS.length]
  return (
    <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-4 items-stretch">
      <section aria-labelledby="home-atalhos" className="lg:col-span-2 bg-surface-800 border border-surface-700 rounded-lg p-3.5">
        <h3 id="home-atalhos" className="flex items-center gap-2 text-sm font-semibold text-surface-100 mb-3">
          <Keyboard className="w-4 h-4 text-brand-400" aria-hidden /> Atalhos do teclado
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2">
          {ATALHOS.map((a) => (
            <li key={a.oQue} className="flex items-center gap-3 min-w-0">
              <span className="flex items-center gap-1 flex-shrink-0 w-[64px]">
                {a.teclas.map((t) => <Tecla key={t}>{t}</Tecla>)}
              </span>
              <span className="text-xs text-surface-400 truncate">{a.oQue}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="home-dica" className="bg-surface-800 border border-surface-700 rounded-lg p-3.5 flex flex-col">
        <h3 id="home-dica" className="flex items-center gap-2 text-sm font-semibold text-surface-100 mb-3">
          <Lightbulb className="w-4 h-4 text-accent-amber" aria-hidden /> Você sabia?
        </h3>
        <p className="text-sm text-surface-300 leading-relaxed">{dica}</p>
      </section>
    </div>
  )
}

function AgentBlock() {
  const navigate = useNavigate()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // O total vem do servidor (antes contava só as 5 da lista).
  useEffect(() => {
    Promise.all([
      conversationsApi.list({ status: 'pending', assignedTo: 'me' }, 1, 5),
      conversationsApi.list({ status: 'open', assignedTo: 'me' }, 1, 5),
    ])
      .then(([pend, abertas]) => {
        const todas = [...(pend.data.data ?? []), ...(abertas.data.data ?? [])]
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        setConvs(todas.slice(0, 5))
        setTotal((pend.data.total ?? 0) + (abertas.data.total ?? 0))
      })
      .catch(() => { setConvs([]); setTotal(null) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg p-3.5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-surface-100">Minhas conversas</h4>
        <span className="text-xs text-surface-500">{loading ? '…' : total === null ? '' : `${total.toLocaleString('pt-BR')} em andamento`}</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : convs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <MessageSquare className="w-8 h-8 text-surface-700" />
          <p className="text-sm text-surface-400">Nenhuma conversa com você no momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {convs.map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigate(`/conversations?aba=minhas&id=${conv.id}`)}
              className="flex items-center gap-3 p-3 rounded-sm hover:bg-[var(--rowhover)] transition-colors text-left w-full"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--sf2)] flex items-center justify-center text-xs font-bold text-surface-300 flex-shrink-0">
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
        onClick={() => navigate('/conversations?aba=minhas')}
        className="mt-auto pt-2 w-full flex items-center justify-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 border border-surface-700 hover:border-surface-600 rounded-xl py-2 transition-colors"
      >
        Ver minhas conversas <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function HomePage() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [stats, setStats] = useState<HomeStats | null>(null)
  // Os números não carregaram: mostra o erro em vez de zeros que parecem reais.
  const [statsErro, setStatsErro] = useState(false)

  useEffect(() => {
    const fallbackStats: HomeStats = {
      conversationsOpen: 0, conversationsResolvedToday: 0, messagesSentToday: 0,
      newContactsThisWeek: 0, agentsOnline: 0, agentsActive: 0, agentsPending: 0,
      avgResponseMinutes: 0, queueCount: 0, planUsed: 0, planLimit: 0,
      myConversationsOpen: 0, myConversationsResolvedToday: 0, myAvgResponseMinutes: 0, myMessagesSentToday: 0,
    }
    // "Na fila" do /home/stats (queueCount) conta TODAS as pendentes, com ou
    // sem dono; "sem atendente" (unassignedCount) conta abertas + pendentes sem
    // dono. A Fila do produto é pendentes SEM dono (inbox e Dashboard): busca o
    // total real e usa nos dois campos — é o que os cards e os insights leem.
    Promise.all([
      api.get<HomeStats>('/home/stats').then((r) => r.data).catch(() => { setStatsErro(true); return fallbackStats }),
      conversationsApi.list({ status: 'pending', assignedTo: 'unassigned' }, 1, 1).then((r) => r.data.total).catch(() => null),
    ]).then(([base, fila]) => {
      setStats(fila === null || fila === undefined ? base : { ...base, queueCount: fila, unassignedCount: fila })
    })
  }, [])

  const role = user?.role ?? 'agent'

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
  //   5. (27/09) os 3 cards admin do "agora" saíram — a operação ao vivo
  //      mora no Dashboard; no rail fica só a porta até lá.
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
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:pt-5 lg:pb-4 max-w-screen-2xl mx-auto w-full">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-4">

            {/* ── Linha 1: saudação ────────────────────────────────────── */}
            {user && (
              <div className="lg:col-span-12">
                <PersonalHeader user={user} />
              </div>
            )}

            {/* ── Linha 2: workspace readiness banner ──────────────────────
                Auto-hides quando não há pendências (return null no componente).
                Sem placeholder — KPIs encostam direto na saudação no estado OK. */}
            {/* empty:hidden — sem pendências o banner não renderiza nada, e a linha
                vazia ainda levava o espaçamento da grade. */}
            <div className="lg:col-span-12 empty:hidden">
              <WorkspaceReadinessBanner mode="checklist" />
            </div>

            {/* ── Linha 3: números da equipe, na largura toda ─────────────── */}
            <div className="lg:col-span-12">
              {statsErro ? (
                <div role="alert" className="bg-surface-800 border border-surface-700 rounded-lg p-3.5 text-sm text-surface-400">
                  Não foi possível carregar os números de hoje. Recarregue a página para tentar de novo.
                </div>
              ) : stats ? (
                <KPIGrid stats={stats} role={role} linkAoVivo={isAdminRole} />
              ) : (
                <KPIGridSkeleton />
              )}
            </div>

            {/* Desligado (flag homeAiInsights): sem montar, sem chamada à IA. */}
            {stats && !statsErro && isFeatureVisible('homeAiInsights') && (
              <div className="lg:col-span-12"><AIInsightsWidget stats={stats} /></div>
            )}

            {/* ── Linha 4: três cards de mesma largura e altura ────────────
                A grade estica cada card até a altura do mais alto: nada de
                coluna curta com vazio embaixo (o layout 8+4 anterior deixava).
                admin: desempenho · ações · atividade; supervisor: desempenho ·
                Fila · ações; atendente: desempenho · minhas conversas · ações. */}
            {(() => {
              const cards = [
                stats && !statsErro ? <MyPerformanceCard key="desempenho" stats={stats} /> : null,
                role === 'supervisor' || role === 'agent' ? <AgentBlock key="minhas" /> : null,
                <QuickActions key="acoes" role={role} />,
                isAdminRole ? <ActivityFeed key="atividade" /> : null,
              ].filter(Boolean)
              const colunas = ['lg:grid-cols-1', 'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3'][cards.length] ?? 'lg:grid-cols-3'
              return (
                <div className={cn('lg:col-span-12 grid grid-cols-1 gap-5 sm:gap-6 lg:gap-4 items-stretch', colunas)}>
                  {cards}
                </div>
              )
            })()}

            {/* ── Linha 5: atalhos do teclado e dica do dia (informativo) ── */}
            <AtalhosEDica />
          </div>

          {/* Footer spacer */}
          <div className="h-4 lg:hidden" />
        </div>
      </div>
    </div>
  )
}
