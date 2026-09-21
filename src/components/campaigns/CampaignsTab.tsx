import { useCallback, useState, useEffect } from 'react'
import {
  Plus, Loader2, Send,
  Trash2, BarChart3, Users, Copy, MoreHorizontal,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { campaignsApi } from '@/services/api'
import { CampaignWizard } from './CampaignWizard'
import { CampaignReport } from './CampaignReport'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { cn } from '@/lib/utils'
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

// CAMP-TABLE-08: label do chip "Concluída" (não "Enviada") pro status `sent`
// — texto do mock. `chip`/`icon` de cores/ícone por status saíram: o chip
// virou STATUS_CHIP_CLASS (fundo tinta + texto colorido, sem ícone).
const STATUS_CONFIG: Record<CampaignStatus, { label: string }> = {
  draft:     { label: 'Rascunho' },
  scheduled: { label: 'Agendada' },
  sending:   { label: 'Enviando' },
  sent:      { label: 'Concluída' },
  failed:    { label: 'Falhou' },
  cancelled: { label: 'Cancelada' },
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

  // CAMP-HDR-04/05 (spec 2c): "Nova campanha" vive no TopBar, não numa
  // toolbar própria — mesmo slot que AgentsPage já usa pra "Novo agente".
  // sm (32px) + ícone 14px, mesma lógica de gate de linha WhatsApp de sempre.
  useRegisterTopBarActions(
    <Button
      size="sm"
      variant="neutral"
      onClick={() => hasWhatsappLine && setWizardOpen(true)}
      disabled={!hasWhatsappLine}
      title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar campanhas' : undefined}
      leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2} />}
    >
      Nova campanha
    </Button>,
    [hasWhatsappLine],
  )

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

      {/* Toolbar — CTA principal saiu daqui pro TopBar (CAMP-HDR-04),
          fica só o filtro de status/linha. flex-wrap (SCRUM-1070): em telas
          estreitas o SegmentedControl + LineFilterChip quebram linha em vez
          de sair cortados da barra. */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-700 flex-shrink-0 flex-wrap">
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          label="Filtrar campanhas por status"
        />

        <LineFilterChip value={lineFilter} onChange={setLineFilter} />
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

// CAMP-TABLE-08 (spec 2c): chip suave (fundo tinta + texto colorido), não o
// pill sólido escurecido do `.color-chip` — esse mixin é certo pra OUTRA
// categoria de elemento (tag/etapa), não pro status de campanha. Sem ícone;
// "Enviando" ganha um pontinho (dot) em vez de ícone.
const STATUS_CHIP_CLASS: Record<CampaignStatus, string> = {
  draft:     'bg-surface-900 border border-surface-700 text-surface-400',
  scheduled: 'color-chip-soft border [--chip:var(--color-status-pending)]',
  sending:   'color-chip-soft border [--chip:var(--color-accent-dark)]',
  sent:      'color-chip-soft border [--chip:var(--color-status-active)]',
  failed:    'color-chip-soft border [--chip:var(--color-danger)]',
  cancelled: 'bg-surface-900 border border-surface-700 text-surface-400',
}

function statusChip(campaign: Campaign) {
  const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft
  const failRate = campaign.stats.sent > 0 ? Math.round((campaign.stats.failed / campaign.stats.sent) * 100) : 0
  const label = campaign.status === 'failed' && failRate > 0 ? `Falhou · ${failRate}%` : cfg.label
  return (
    <span className={cn('inline-flex items-center h-5 px-[7px] rounded-xs text-[11px] font-semibold gap-[5px]', STATUS_CHIP_CLASS[campaign.status] ?? STATUS_CHIP_CLASS.draft)}>
      {campaign.status === 'sending' && <i className="w-1.5 h-1.5 rounded-full bg-current not-italic" />}
      {label}
    </span>
  )
}

function rate(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : '—'
}

// CAMP-TABLE-11: "hoje HH:mm" quando a data cai no dia de hoje, senão
// "DD mmm" (curto, sem hora) — mais perto do formato do mock ("hoje 09:00",
// "17 set 10:00") do que o DD/MM cru de antes.
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function sendDate(campaign: Campaign): string {
  const iso = campaign.sentAt ?? campaign.scheduledAt
  if (!iso) return '—'
  const d = new Date(iso)
  const hhmm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isToday(d)) return `hoje ${hhmm}`
  const dia = `${d.getDate()} ${MESES_ABREV[d.getMonth()]}`
  return campaign.scheduledAt && !campaign.sentAt ? `${dia} ${hhmm}` : dia
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
          {/* CAMP-TABLE-07: rascunho rebaixa pra --tx2, não compete com os
              nomes de campanha ativa/enviada. */}
          <span className={cn('text-[13px] font-semibold truncate', c.status === 'draft' ? 'text-surface-400' : 'text-surface-100')}>{c.name}</span>
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
      render: (c) => c.templateName
        ? <span className="font-mono text-[11.5px] text-surface-400 truncate">{c.templateName}</span>
        : <span className="text-xs text-surface-500">sem template</span>,
    },
    {
      key: 'total',
      header: 'Público',
      widthClass: 'w-[90px]',
      align: 'right',
      // CAMP-TABLE-05 (achado ao vivo): sem nowrap, "600 · 95%" quebrava em
      // 2 linhas na coluna de 90px e dobrava a altura da linha (36px). A
      // tabela é `table-layout: auto` (sem `table-fixed`), então a coluna
      // cresce pra caber o conteúdo em vez de cortar — mantém o "· %".
      render: (c) => c.stats.total > 0
        ? <span className="tabular-nums text-surface-100 whitespace-nowrap">{c.stats.total.toLocaleString('pt-BR')}</span>
        : <span className="tabular-nums text-surface-500">—</span>,
    },
    {
      key: 'delivered',
      header: 'Entregues',
      widthClass: 'w-[90px]',
      align: 'right',
      render: (c) => c.stats.sent > 0
        ? <span className="tabular-nums text-surface-100 whitespace-nowrap">{c.stats.delivered.toLocaleString('pt-BR')} · {rate(c.stats.delivered, c.stats.sent)}</span>
        : <span className="tabular-nums text-surface-500">—</span>,
    },
    {
      key: 'read',
      header: 'Lidas',
      widthClass: 'w-[90px]',
      align: 'right',
      render: (c) => c.stats.sent > 0
        ? <span className="tabular-nums text-surface-100 whitespace-nowrap">{c.stats.read.toLocaleString('pt-BR')} · {rate(c.stats.read, c.stats.sent)}</span>
        : <span className="tabular-nums text-surface-500">—</span>,
    },
    {
      key: 'replied',
      header: 'Respostas',
      widthClass: 'w-[90px]',
      align: 'right',
      render: (c) => typeof c.stats.replied === 'number'
        ? <span className="tabular-nums text-surface-100 whitespace-nowrap">{c.stats.replied.toLocaleString('pt-BR')}</span>
        : <span className="tabular-nums text-surface-500">—</span>,
    },
    {
      key: 'sendDate',
      header: 'Envio',
      widthClass: 'w-[120px]',
      align: 'right',
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
