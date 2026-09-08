// Admin-only "Saúde das Linhas" panel. Surfaces per-line health that was
// previously invisible:
//
//   - Which line is primary (editable here — previously only via SQL).
//   - How many templates / campaigns / automations live on each line,
//     and how many are stuck with `needsWabaAssignment=true`.
//   - Which departments point at each line (N→1 is allowed in this app,
//     so we show the full list instead of the first one).
//   - Whether each line has an AI agent and a system-user token.
//   - Orphan resources — rows still referencing a disconnected line.
//
// Design goal: the admin can glance at this page and say "X templates
// stuck on line B needs my attention" without opening three other
// tabs to piece it together.

import { useEffect, useState } from 'react'
import { Phone, Star, AlertTriangle, Loader2, Check, Bot, ShieldCheck, ShieldOff, Globe } from 'lucide-react'
import { whatsappNumbersApi, type WhatsappLinesHealth, type WhatsappLineHealth } from '@/services/api'
import { cn } from '@/lib/utils'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'

function formatPhone(raw?: string | null): string {
  if (!raw) return '—'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return raw
}

export function WhatsAppHealth() {
  const [data, setData] = useState<WhatsappLinesHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const { refresh: refreshWorkspace } = useWorkspaceNumber()

  const load = () => {
    setLoading(true)
    setError(null)
    whatsappNumbersApi.health()
      .then((r) => setData(r.data))
      .catch((err) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg || 'Não foi possível carregar a saúde das linhas.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handlePromote = async (lineId: string) => {
    if (promoting) return
    setPromoting(lineId)
    try {
      await whatsappNumbersApi.setPrimary(lineId)
      // Refresh both our local snapshot AND the workspace context so the
      // TopBar switcher picks up the new primary without a manual reload.
      await refreshWorkspace()
      load()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Falha ao definir linha primária.')
    } finally {
      setPromoting(null)
    }
  }

  const header = (
    <SectionHeader
      title="Saúde das Linhas"
      description="Estado de cada número WhatsApp: linha primária, recursos vinculados e pendências."
    />
  )

  if (loading && !data) {
    return (
      <div>
        {header}
        <div className="flex flex-col gap-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div>
        {header}
        <ErrorState compact hint={error} onRetry={load} />
      </div>
    )
  }

  if (!data || data.lines.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          icon={Phone}
          title="Nenhuma linha WhatsApp conectada ainda"
          hint="Conecte um número em Números WhatsApp para acompanhar a saúde das linhas."
        />
      </div>
    )
  }

  const needsAttentionTotal = data.lines.reduce((sum, l) =>
    sum + l.templates.needsAssignment + l.campaigns.needsAssignment + l.automations.needsAssignment, 0)
  const orphansTotal = data.orphans.templates + data.orphans.campaigns + data.orphans.automations

  return (
    <div>
      {header}

      {/* Global summary — admin's "everything OK" / "something off" snapshot */}
      <SettingsSection
        title="Visão geral"
        description="Linhas ativas e recursos que precisam de atenção."
      >
        <div className="grid grid-cols-3 gap-6">
          <SummaryStat
            label="Linhas ativas"
            value={data.lines.filter((l) => l.isActive).length}
            total={data.lines.length}
            icon={Phone}
          />
          <SummaryStat
            label="Recursos sem linha"
            value={needsAttentionTotal}
            tone={needsAttentionTotal > 0 ? 'warning' : 'ok'}
            icon={AlertTriangle}
          />
          <SummaryStat
            label="Recursos órfãos"
            value={orphansTotal}
            tone={orphansTotal > 0 ? 'warning' : 'ok'}
            icon={Globe}
            tooltip="Recursos apontando para uma linha desativada ou removida"
          />
        </div>
      </SettingsSection>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Per-line rows — lista densa em largura total, divisores hairline */}
      <div className="divide-y divide-surface-800/60">
        {data.lines.map((line) => (
          <LineHealthRow
            key={line.id}
            line={line}
            onPromote={() => handlePromote(line.id)}
            promoting={promoting === line.id}
            disabled={promoting !== null && promoting !== line.id}
          />
        ))}
      </div>
    </div>
  )
}

function SummaryStat({
  label, value, total, tone = 'default', icon: Icon, tooltip,
}: {
  label: string
  value: number
  total?: number
  tone?: 'default' | 'ok' | 'warning'
  icon: React.ComponentType<{ className?: string }>
  tooltip?: string
}) {
  const valueClass = tone === 'warning' ? 'text-status-pending' : 'text-surface-100'

  return (
    <div title={tooltip}>
      <div className="flex items-center gap-2 text-3xs uppercase tracking-wide text-surface-400">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={cn('text-2xl font-semibold mt-1', valueClass)}>
        {value}
        {total !== undefined && <span className="text-surface-500 text-base font-normal"> / {total}</span>}
      </div>
    </div>
  )
}

function LineHealthRow({
  line,
  onPromote,
  promoting,
  disabled,
}: {
  line: WhatsappLineHealth
  onPromote: () => void
  promoting: boolean
  disabled: boolean
}) {
  const needsAttention =
    line.templates.needsAssignment + line.campaigns.needsAssignment + line.automations.needsAssignment

  return (
    <div className="py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Phone className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-surface-100 truncate">
              {line.label || formatPhone(line.displayPhoneNumber)}
            </span>
            {line.isPrimary && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-semibold bg-brand-cta/10 text-brand-cta border border-brand-cta/30">
                <Star className="w-2.5 h-2.5" /> Primária
              </span>
            )}
            {!line.isActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-semibold bg-surface-700 text-surface-400 border border-surface-600">
                Inativa
              </span>
            )}
            {line.hasSystemUserToken ? (
              <span className="color-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium border" style={{ ['--chip']: 'var(--color-status-active)' } as React.CSSProperties} title="Token de system user presente">
                <ShieldCheck className="w-2.5 h-2.5" />
                Token OK
              </span>
            ) : (
              <span className="color-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium border" style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties} title="Sem token — mensagens falharão">
                <ShieldOff className="w-2.5 h-2.5" />
                Sem token
              </span>
            )}
            {line.agentId ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium bg-surface-700 text-surface-300 border border-surface-600">
                <Bot className="w-2.5 h-2.5" />
                IA atribuída
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium bg-surface-800 text-surface-500 border border-surface-700">
                Sem IA
              </span>
            )}
          </div>
          {line.label && (
            <p className="text-xs text-surface-500 mt-0.5">{formatPhone(line.displayPhoneNumber)}</p>
          )}
          {line.wabaName && (
            <p className="text-2xs text-surface-500 mt-0.5">WABA: {line.wabaName}</p>
          )}
        </div>

        {!line.isPrimary && line.isActive && (
          <button
            type="button"
            onClick={onPromote}
            disabled={disabled || promoting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-medium bg-surface-800 border border-surface-700/60 text-surface-200 hover:border-brand-500/40 hover:text-brand-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {promoting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Promovendo...
              </>
            ) : (
              <>
                <Star className="w-3 h-3" />
                Tornar primária
              </>
            )}
          </button>
        )}
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <CountBlock
          label="Templates"
          total={line.templates.total}
          chips={[
            { label: 'APPROVED', count: line.templates.approved, tone: 'ok' },
            { label: 'PENDING', count: line.templates.pending, tone: 'warn' },
            { label: 'REJECTED', count: line.templates.rejected, tone: 'danger' },
          ]}
          needs={line.templates.needsAssignment}
        />
        <CountBlock
          label="Campanhas"
          total={line.campaigns.total}
          chips={[
            { label: 'Rascunhos', count: line.campaigns.draft, tone: 'muted' },
            { label: 'Agendadas', count: line.campaigns.scheduled, tone: 'warn' },
            { label: 'Enviadas', count: line.campaigns.sent, tone: 'ok' },
          ]}
          needs={line.campaigns.needsAssignment}
        />
        <CountBlock
          label="Automações"
          total={line.automations.total}
          chips={[
            { label: 'Ativas', count: line.automations.active, tone: 'ok' },
            { label: 'Inativas', count: line.automations.inactive, tone: 'muted' },
            { label: 'Rascunhos', count: line.automations.draft, tone: 'muted' },
          ]}
          needs={line.automations.needsAssignment}
        />
      </div>

      {/* Departments + summary */}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-3xs uppercase tracking-wide text-surface-500">Setores</span>
          {line.departments.length === 0 ? (
            <span className="text-2xs text-surface-500">Nenhum setor atribuído</span>
          ) : (
            line.departments.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-3xs font-medium bg-surface-800 text-surface-300 border border-surface-700/60"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
            ))
          )}
        </div>
        {needsAttention > 0 && (
          <span className="color-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-semibold border" style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}>
            <AlertTriangle className="w-3 h-3" />
            {needsAttention} sem linha
          </span>
        )}
      </div>
    </div>
  )
}

function CountBlock({
  label, total, chips, needs,
}: {
  label: string
  total: number
  chips: Array<{ label: string; count: number; tone: 'ok' | 'warn' | 'danger' | 'muted' }>
  needs: number
}) {
  const toneClass = (t: string) =>
    t === 'ok'
      ? 'text-status-active'
      : t === 'warn'
      ? 'text-status-pending'
      : t === 'danger'
      ? 'text-danger'
      : 'text-surface-400'

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-3xs uppercase tracking-wide text-surface-500">{label}</span>
        <span className="text-sm font-semibold text-surface-100">{total}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {chips.map((c) => (
          <span key={c.label} className="text-3xs">
            <span className={cn('font-semibold', toneClass(c.tone))}>{c.count}</span>
            <span className="text-surface-500 ml-1">{c.label}</span>
          </span>
        ))}
      </div>
      {needs > 0 && (
        <div className="mt-2 flex items-center gap-1 text-3xs text-status-pending">
          <Check className="w-2.5 h-2.5 opacity-0" /> {/* alignment spacer */}
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>{needs} sem linha atribuída</span>
        </div>
      )}
    </div>
  )
}
