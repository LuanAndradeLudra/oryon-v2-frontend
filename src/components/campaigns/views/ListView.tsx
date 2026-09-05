import { useCallback, useState, useEffect } from 'react'
import {
  Plus, Loader2, Send, Clock, BarChart3, Users, Copy, Trash2,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { campaignsApi } from '@/services/api'
import { CampaignWizard } from '../CampaignWizard'
import { CampaignReport } from '../CampaignReport'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useContextMenu } from '@/hooks/useContextMenu'
import { WhatsappLineChip } from '@/components/common/WhatsappLineChip'
import { WabaAssignmentBadge } from '@/components/common/WabaAssignmentBadge'
import { AssignWabaModal } from '@/components/common/AssignWabaModal'
import { LineFilterChip, lineMatches, type LineFilterValue } from '@/components/common/LineFilterChip'
import { WhatsappLineRequiredBanner } from '@/components/shared/WhatsappLineRequiredBanner'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { CampaignStatusChip } from '../shared/CampaignStatusChip'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import type { Campaign, CampaignStatus } from '@/types'

const FILTER_OPTIONS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'Todas' },
  { value: 'draft',     label: 'Rascunhos' },
  { value: 'scheduled', label: 'Agendadas' },
  { value: 'sent',      label: 'Enviadas' },
]

export function ListView() {
  // Gate on WhatsApp line availability — the backend rejects
  // create_campaign with 400 when no line is connected.
  const { numbers: whatsappLines, loading: waLoading } = useWorkspaceNumber()
  const hasWhatsappLine = whatsappLines.length > 0

  const isMobile = useIsMobile()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [reportCampaign, setReportCampaign] = useState<Campaign | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    campaignsApi.list().then((r) => setCampaigns(r.data)).finally(() => setLoading(false))
  }, [])

  const handleCreated = useCallback((camp: Campaign) => {
    setCampaigns((prev) => {
      // Remove duplicata caso o wizard já tenha feito o envio e
      // o status tenha mudado (draft → sending/sent).
      const withoutDup = prev.filter((c) => c.id !== camp.id)
      return [camp, ...withoutDup]
    })
    setWizardOpen(false)
  }, [])

  const handleSend = async (id: string) => {
    setSending(id)
    try {
      const res = await campaignsApi.send(id)
      setCampaigns((prev) => prev.map((c) => c.id === id ? res.data : c))
    } finally {
      setSending(null)
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [assignWabaTarget, setAssignWabaTarget] = useState<Campaign | null>(null)
  const [lineFilter, setLineFilter] = useState<LineFilterValue>('all')

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget)
    try {
      await campaignsApi.delete(deleteTarget)
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget))
    } finally {
      setDeleting(null)
      setDeleteTarget(null)
    }
  }

  // Local filter via LineFilterChip. Campaigns without an explicit
  // whatsappNumberId still show so the badge + modal can resolve them.
  const filtered = campaigns.filter((c) => {
    if (!lineMatches(lineFilter, { whatsappNumberId: c.whatsappNumberId })) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* WhatsApp gate banner (only when no active line) */}
      {!waLoading && !hasWhatsappLine && (
        <div className="px-5 pt-4">
          <WhatsappLineRequiredBanner resource="campanhas" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-800 flex-shrink-0">
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          label="Filtrar campanhas por status"
        />

        <LineFilterChip value={lineFilter} onChange={setLineFilter} />

        <div className="flex-1" />

        <Button
          onClick={() => hasWhatsappLine && setWizardOpen(true)}
          disabled={!hasWhatsappLine}
          title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar campanhas' : undefined}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nova campanha
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <SkeletonList items={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Nenhuma campanha de disparo encontrada"
            hint="Os modelos ativos no Gerenciador do WhatsApp ficam na aba Templates. Aqui você cria disparos em massa que usam esses templates."
            action={
              campaigns.length === 0 && hasWhatsappLine
                ? { label: 'Criar primeira campanha', onClick: () => setWizardOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((camp) => (
              <CampaignCard
                key={camp.id}
                campaign={camp}
                onSend={() => handleSend(camp.id)}
                onDelete={() => setDeleteTarget(camp.id)}
                onReport={() => setReportCampaign(camp)}
                onAssignWaba={() => setAssignWabaTarget(camp)}
                sending={sending === camp.id}
                deleting={deleting === camp.id}
              />
            ))}
          </div>
        )}
      </div>

      {isMobile ? (
        <MobileFeatureGate
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          featureName="Criar campanha"
          description="Wizard de campanhas envolve seleção de template, audiência e variáveis. No celular fica apertado — abra no desktop."
        />
      ) : (
        <CampaignWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onCreated={handleCreated}
        />
      )}

      <AnimatePresence>
        {reportCampaign && (
          <CampaignReport
            campaign={reportCampaign}
            onClose={() => setReportCampaign(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir campanha"
        description="Esta ação é irreversível. A campanha e todo o histórico de envios serão excluídos permanentemente."
        confirmLabel="Excluir campanha"
        danger
        loading={!!deleting}
      />

      {assignWabaTarget && (
        <AssignWabaModal
          resourceType="campaign"
          resourceId={assignWabaTarget.id}
          resourceName={assignWabaTarget.name}
          currentNumberId={assignWabaTarget.whatsappNumberId}
          onClose={() => setAssignWabaTarget(null)}
          onSaved={() => {
            setAssignWabaTarget(null)
            campaignsApi.list().then((r) => setCampaigns(r.data)).catch(() => {})
          }}
        />
      )}
    </div>
  )
}

function CampaignCard({
  campaign, onSend, onDelete, onReport, onAssignWaba, sending, deleting,
}: {
  campaign: Campaign
  onSend: () => void
  onDelete: () => void
  onReport: () => void
  onAssignWaba: () => void
  sending: boolean
  deleting: boolean
}) {
  const { stats } = campaign
  const isSent = campaign.status === 'sent'
  const canSend = campaign.status === 'draft' || campaign.status === 'scheduled'

  const readRate = stats.sent > 0 ? Math.round((stats.read / stats.sent) * 100) : 0
  const deliveredRate = stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0

  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = [
      {
        label: 'Copiar nome',
        icon: Copy,
        onClick: () => navigator.clipboard.writeText(campaign.name).catch(() => {}),
      },
    ]
    if (isSent) {
      items.push({ label: 'Ver relatório', icon: BarChart3, onClick: onReport })
    }
    if (canSend && !sending) {
      items.push({ label: 'Enviar agora', icon: Send, onClick: onSend })
    }
    if (canSend) {
      items.push({ separator: true })
      items.push({ label: 'Excluir', icon: Trash2, danger: true, onClick: onDelete })
    }
    return items
  }, [campaign.name, isSent, canSend, sending, onReport, onSend, onDelete])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <div
      onContextMenu={onContextMenu}
      className="p-4 bg-surface-800/50 hover:bg-surface-800 border border-surface-800 rounded-xl transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-surface-100">{campaign.name}</span>
            <CampaignStatusChip status={campaign.status} />
            {campaign.needsWabaAssignment && <WabaAssignmentBadge onClick={onAssignWaba} />}
            <WhatsappLineChip whatsappNumberId={campaign.whatsappNumberId} />
          </div>

          <div className="flex items-center gap-3 text-[11px] text-surface-500 mb-3">
            <span className="font-mono">{campaign.templateName}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {stats.total > 0 ? `${stats.total} contatos` : 'Contagem pendente'}
            </span>
            {campaign.scheduledAt && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(campaign.scheduledAt).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </>
            )}
            {campaign.sentAt && (
              <>
                <span>·</span>
                <span>Enviada em {new Date(campaign.sentAt).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit',
                })}</span>
              </>
            )}
          </div>

          {/* Stats (only when sent) — mesmas cores do relatório da campanha
              (CampaignReport.tsx) por consistência entre as duas telas. */}
          {isSent && stats.total > 0 && (
            <div className="flex items-center gap-4">
              <StatChip label="Enviadas" value={stats.sent} color="var(--color-accent-blue)" />
              <StatChip label="Entregues" value={stats.delivered} color="var(--color-accent-cyan)" suffix={`${deliveredRate}%`} />
              <StatChip label="Lidas" value={stats.read} color="var(--color-accent-amber)" suffix={`${readRate}%`} />
              {stats.failed > 0 && (
                <StatChip label="Falhas" value={stats.failed} color="var(--color-danger)" />
              )}
              {/* Progress bar */}
              <div className="flex-1 max-w-xs">
                <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full"
                    style={{ width: `${readRate}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isSent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReport}
              leftIcon={<BarChart3 className="w-3.5 h-3.5" />}
            >
              Relatório
            </Button>
          )}
          {canSend && (
            <Button
              size="sm"
              onClick={onSend}
              loading={sending}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              {sending ? 'Enviando...' : campaign.status === 'scheduled' ? 'Enviar agora' : 'Enviar'}
            </Button>
          )}
          {canSend && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-surface-500 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatChip({ label, value, color, suffix }: {
  label: string
  value: number
  /** CSS color value (design-token `var(--color-*)`), not a Tailwind class. */
  color: string
  suffix?: string
}) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold" style={{ color }}>{suffix ?? value}</p>
      <p className="text-[10px] text-surface-600">{label}</p>
    </div>
  )
}
