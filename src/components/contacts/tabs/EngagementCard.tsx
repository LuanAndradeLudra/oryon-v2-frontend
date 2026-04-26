import { useState, useEffect } from 'react'
import {
  BarChart3, MessageSquare, Clock, ArrowDownLeft, ArrowUpRight,
  CheckCheck, XCircle, Image, FileText, Mic, Video,
  TrendingUp, Target, UserCheck, Loader2, Zap,
} from 'lucide-react'
import { contactsApi } from '@/services/api'

type Stats = Awaited<ReturnType<typeof contactsApi.getStats>>['data']

function formatTime(seconds: number | null) {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}min`
}

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  converted:       { label: 'Convertido', color: 'text-emerald-400' },
  interested:      { label: 'Interessado', color: 'text-amber-400' },
  follow_up:       { label: 'Follow-up', color: 'text-blue-400' },
  not_interested:  { label: 'Sem interesse', color: 'text-red-400' },
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text:     <MessageSquare className="w-3 h-3" />,
  image:    <Image className="w-3 h-3" />,
  document: <FileText className="w-3 h-3" />,
  audio:    <Mic className="w-3 h-3" />,
  video:    <Video className="w-3 h-3" />,
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 text-surface-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-surface-500">{label}</p>
        <p className="text-sm font-semibold text-surface-200 tabular-nums">{value}</p>
        {sub && <p className="text-[10px] text-surface-500">{sub}</p>}
      </div>
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-surface-500 tabular-nums w-6 text-right">{value}</span>
    </div>
  )
}

interface Props {
  contactId: string
}

export function EngagementCard({ contactId }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    contactsApi.getStats(contactId)
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contactId])

  if (loading) {
    return (
      <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!stats || (stats.messages.total === 0 && stats.conversations.total === 0)) {
    return null // Don't render if no engagement data
  }

  const { messages, conversations, avgResponseTimeSeconds, lastAnalysis, assignedTo } = stats
  const totalMsgs = messages.total
  const maxDir = Math.max(messages.totalInbound, messages.totalOutbound)

  return (
    <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-surface-400" /> Engajamento
        </h3>
        <span className="text-[10px] text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">
          {totalMsgs} mensagens · {conversations.total} conversas
        </span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Message flow */}
        <div className="grid grid-cols-2 gap-3">
          <Stat
            icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
            label="Recebidas"
            value={messages.totalInbound}
          />
          <Stat
            icon={<ArrowUpRight className="w-3.5 h-3.5" />}
            label="Enviadas"
            value={messages.totalOutbound}
          />
        </div>

        {/* Direction bars */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500 w-16">Recebidas</span>
            <MiniBar value={messages.totalInbound} max={maxDir} color="#3b82f6" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500 w-16">Enviadas</span>
            <MiniBar value={messages.totalOutbound} max={maxDir} color="#10b981" />
          </div>
        </div>

        {/* Delivery stats */}
        {(messages.readCount > 0 || messages.failedCount > 0) && (
          <div className="flex items-center gap-4 pt-1 border-t border-surface-800">
            {messages.readCount > 0 && (
              <div className="flex items-center gap-1.5">
                <CheckCheck className="w-3 h-3 text-blue-400" />
                <span className="text-[11px] text-surface-400">{messages.readCount} lidas</span>
              </div>
            )}
            {messages.failedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <XCircle className="w-3 h-3 text-red-400" />
                <span className="text-[11px] text-surface-400">{messages.failedCount} falhas</span>
              </div>
            )}
          </div>
        )}

        {/* Message types */}
        {Object.keys(messages.byType).length > 1 && (
          <div className="pt-1 border-t border-surface-800">
            <p className="text-[10px] text-surface-500 uppercase tracking-wide mb-2">Tipos de mensagem</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(messages.byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-1.5 text-[11px] text-surface-400 bg-surface-800 px-2 py-1 rounded-lg">
                  {TYPE_ICONS[type] ?? <MessageSquare className="w-3 h-3" />}
                  <span className="capitalize">{type}</span>
                  <span className="text-surface-500 font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response time + assigned */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-surface-800">
          <Stat
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Tempo médio de resposta"
            value={formatTime(avgResponseTimeSeconds)}
          />
          {assignedTo && (
            <Stat
              icon={<UserCheck className="w-3.5 h-3.5" />}
              label="Último atendente"
              value={assignedTo}
            />
          )}
        </div>

        {/* Conversation status breakdown */}
        {conversations.total > 0 && (
          <div className="pt-1 border-t border-surface-800">
            <p className="text-[10px] text-surface-500 uppercase tracking-wide mb-2">Conversas por status</p>
            <div className="flex gap-2">
              {Object.entries(conversations.byStatus).map(([status, count]) => {
                const colors: Record<string, string> = {
                  open: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
                  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                  resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                  abandoned: 'border-surface-600 bg-surface-800 text-surface-400',
                }
                const labels: Record<string, string> = { open: 'Abertas', pending: 'Pendentes', resolved: 'Resolvidas', abandoned: 'Abandonadas' }
                return (
                  <span key={status} className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${colors[status] ?? colors.abandoned}`}>
                    {labels[status] ?? status} {count}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Last analysis */}
        {lastAnalysis && (
          <div className="pt-1 border-t border-surface-800">
            <p className="text-[10px] text-surface-500 uppercase tracking-wide mb-2">Última análise de conversa</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-surface-400" />
                <span className={`text-xs font-medium ${OUTCOME_LABELS[lastAnalysis.outcome]?.color ?? 'text-surface-400'}`}>
                  {OUTCOME_LABELS[lastAnalysis.outcome]?.label ?? lastAnalysis.outcome}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-surface-400" />
                <span className="text-xs text-surface-300">{Math.round(lastAnalysis.confidence * 100)}% confiança</span>
              </div>
              {lastAnalysis.dealValue != null && (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-emerald-300">R$ {lastAnalysis.dealValue.toLocaleString('pt-BR')}</span>
                </div>
              )}
              {lastAnalysis.status === 'confirmed' && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  Confirmada
                </span>
              )}
            </div>
            {lastAnalysis.keyTopics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {lastAnalysis.keyTopics.map((topic, i) => (
                  <span key={i} className="text-[10px] text-surface-400 bg-surface-800 px-2 py-0.5 rounded-full">{topic}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
