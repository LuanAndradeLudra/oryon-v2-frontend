import { useCallback, useState, useEffect } from 'react'
import {
  Plus, Loader2, Send, Clock, FileText, CheckCircle2,
  XCircle, AlertCircle, Trash2, BarChart3, Users, Copy, MoreHorizontal,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { campaignsApi } from '@/services/api'
import { CampaignWizard } from './CampaignWizard'
import { CampaignReport } from './CampaignReport'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { WhatsappLineChip } from '@/components/common/WhatsappLineChip'
import { WabaAssignmentBadge } from '@/components/common/WabaAssignmentBadge'
import { AssignWabaModal } from '@/components/common/AssignWabaModal'
import { LineFilterChip, lineMatches, type LineFilterValue } from '@/components/common/LineFilterChip'
import { WhatsappLineRequiredBanner } from '@/components/shared/WhatsappLineRequiredBanner'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { Campaign, CampaignStatus } from '@/types'

const STATUS_CONFIG: Record<CampaignStatus, {
  label: string
  chip: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  draft:     { label: 'Rascunho',   chip: 'var(--color-status-muted)', icon: FileText },
  scheduled: { label: 'Agendada',   chip: 'var(--color-status-open)',       icon: Clock },
  sending:   { label: 'Enviando',   chip: 'var(--color-status-pending)',       icon: Send },
  sent:      { label: 'Enviada',    chip: 'var(--color-status-active)', icon: CheckCircle2 },
  failed:    { label: 'Falhou',     chip: 'var(--color-danger)',                icon: XCircle },
  cancelled: { label: 'Cancelada',  chip: 'var(--color-status-muted)', icon: AlertCircle },
}

const FILTER_OPTIONS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'Todas' },
  { value: 'draft',     label: 'Rascunhos' },
  { value: 'scheduled', label: 'Agendadas' },
  { value: 'sent',      label: 'Enviadas' },
]

export function CampaignsTab({ onCountChange }: { onCountChange?: (n: number) => void } = {}) {
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

  // SCRUM-1106 (tela 2c): contagem no rótulo da aba, no CampaignsPage —
  // reporta em vez de duplicar o fetch lá em cima.
  useEffect(() => { onCountChange?.(campaigns.length) }, [campaigns.length, onCountChange])

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

      {/* Toolbar. flex-wrap (SCRUM-1070): sem isto, em ~375px o SegmentedControl
          + LineFilterChip já consumiam a largura útil e "Nova campanha" — o
          CTA primário da tela — ficava cortado fora da barra em vez de
          quebrar linha. */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-800 flex-shrink-0 flex-wrap">
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          label="Filtrar campanhas por status"
        />

        <LineFilterChip value={lineFilter} onChange={setLineFilter} />

        <div className="flex-1 min-w-0" />

        {/* `neutral` no lugar do teal (10/09): mesma conversão dos botões de
            criação do funil. O teal aqui não dizia "importante", dizia "botão" —
            e ele já é o único elemento cheio da barra. */}
        <Button
          variant="neutral"
          onClick={() => hasWhatsappLine && setWizardOpen(true)}
          disabled={!hasWhatsappLine}
          title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar campanhas' : undefined}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nova campanha
        </Button>
      </div>

      {/* Content — tabela compartilhada (SCRUM-1106, tela 2c): mesma migração
          pro DataTable já feita em Contatos (leva 3). Colunas por spec:
          Campanha | Status | Template | Público | Entregues | Lidas |
          Respostas | Envio | menu. */}
      <div className="flex-1 overflow-auto">
        <DataTable
          columns={campaignColumns({
            onSend: (id) => handleSend(id),
            onDelete: (id) => setDeleteTarget(id),
            onReport: setReportCampaign,
            onAssignWaba: setAssignWabaTarget,
            sendingId: sending,
            deletingId: deleting,
          })}
          rows={filtered}
          rowKey={(c) => c.id}
          loading={loading}
          emptyIcon={Send}
          emptyTitle="Nenhuma campanha de disparo encontrada"
          emptyHint="Os modelos ativos no Gerenciador do WhatsApp ficam na aba Templates. Aqui você cria disparos em massa que usam esses templates."
        />
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

// ─── Colunas da tabela ────────────────────────────────────────────────────────
// SCRUM-1106 (tela 2c): grid `1.6fr 120px 1fr 90px 90px 90px 90px 120px 36px`
// (Campanha, Status, Template, Público, Entregues, Lidas, Respostas, Envio,
// menu). Numéricos à direita/tabulares; `Falhou · N%` quando há falhas.

function statusChip(campaign: Campaign) {
  const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft
  const Icon = cfg.icon
  const failRate = campaign.stats.sent > 0 ? Math.round((campaign.stats.failed / campaign.stats.sent) * 100) : 0
  const label = campaign.status === 'failed' && failRate > 0 ? `Falhou · ${failRate}%` : cfg.label
  return (
    <span
      className="color-chip border inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ ['--chip']: cfg.chip } as React.CSSProperties}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function rate(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : '—'
}

function sendDate(campaign: Campaign): string {
  if (campaign.sentAt) {
    return new Date(campaign.sentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
  if (campaign.scheduledAt) {
    return new Date(campaign.scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
  return '—'
}

function MenuCell({ campaign, onSend, onDelete, onReport, onAssignWaba, sending, deleting }: {
  campaign: Campaign
  onSend: () => void
  onDelete: () => void
  onReport: () => void
  onAssignWaba: () => void
  sending: boolean
  deleting: boolean
}) {
  const [open, setOpen] = useState(false)
  const isSent = campaign.status === 'sent'
  const canSend = campaign.status === 'draft' || campaign.status === 'scheduled'

  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <Dropdown
        open={open}
        onClose={() => setOpen(false)}
        align="right"
        className="w-48"
        anchor={
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-all"
            aria-label="Mais ações"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        }
      >
        <div className="px-1 py-1 flex flex-col gap-0.5">
          <DropdownItem onClick={() => { navigator.clipboard.writeText(campaign.name).catch(() => {}); setOpen(false) }}>
            <Copy className="w-3.5 h-3.5" /> Copiar nome
          </DropdownItem>
          {campaign.needsWabaAssignment && (
            <DropdownItem onClick={() => { onAssignWaba(); setOpen(false) }}>
              <Users className="w-3.5 h-3.5" /> Atribuir linha WhatsApp
            </DropdownItem>
          )}
          {isSent && (
            <DropdownItem onClick={() => { onReport(); setOpen(false) }}>
              <BarChart3 className="w-3.5 h-3.5" /> Ver relatório
            </DropdownItem>
          )}
          {canSend && (
            <DropdownItem disabled={sending} onClick={() => { onSend(); setOpen(false) }}>
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Enviando…' : 'Enviar agora'}
            </DropdownItem>
          )}
          {canSend && (
            <DropdownItem danger disabled={deleting} onClick={() => { onDelete(); setOpen(false) }}>
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </DropdownItem>
          )}
        </div>
      </Dropdown>
    </span>
  )
}

function campaignColumns({ onSend, onDelete, onReport, onAssignWaba, sendingId, deletingId }: {
  onSend: (id: string) => void
  onDelete: (id: string) => void
  onReport: (c: Campaign) => void
  onAssignWaba: (c: Campaign) => void
  sendingId: string | null
  deletingId: string | null
}): DataTableColumn<Campaign>[] {
  return [
    {
      key: 'name',
      header: 'Campanha',
      render: (c) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-surface-100 truncate">{c.name}</span>
          <WhatsappLineChip whatsappNumberId={c.whatsappNumberId} />
          {c.needsWabaAssignment && <WabaAssignmentBadge onClick={() => onAssignWaba(c)} />}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      widthClass: 'w-[120px]',
      render: statusChip,
    },
    {
      key: 'template',
      header: 'Template',
      render: (c) => <span className="font-mono text-[11.5px] text-surface-400 truncate">{c.templateName}</span>,
    },
    {
      key: 'total',
      header: 'Público',
      widthClass: 'w-[90px]',
      align: 'right',
      render: (c) => <span className="tabular-nums text-surface-300">{c.stats.total > 0 ? c.stats.total : '—'}</span>,
    },
    {
      key: 'delivered',
      header: 'Entregues',
      widthClass: 'w-[90px]',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums text-surface-300">
          {c.stats.sent > 0 ? `${c.stats.delivered} · ${rate(c.stats.delivered, c.stats.sent)}` : '—'}
        </span>
      ),
    },
    {
      key: 'read',
      header: 'Lidas',
      widthClass: 'w-[90px]',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums text-surface-300">
          {c.stats.sent > 0 ? `${c.stats.read} · ${rate(c.stats.read, c.stats.sent)}` : '—'}
        </span>
      ),
    },
    {
      key: 'replied',
      header: 'Respostas',
      widthClass: 'w-[90px]',
      align: 'right',
      render: (c) => <span className="tabular-nums text-surface-300">{c.stats.replied ?? '—'}</span>,
    },
    {
      key: 'sendDate',
      header: 'Envio',
      widthClass: 'w-[120px]',
      render: (c) => <span className="text-surface-400">{sendDate(c)}</span>,
    },
    {
      key: 'menu',
      header: '',
      widthClass: 'w-9',
      render: (c) => (
        <MenuCell
          campaign={c}
          onSend={() => onSend(c.id)}
          onDelete={() => onDelete(c.id)}
          onReport={() => onReport(c)}
          onAssignWaba={() => onAssignWaba(c)}
          sending={sendingId === c.id}
          deleting={deletingId === c.id}
        />
      ),
    },
  ]
}
