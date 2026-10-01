import { useEstadoNaUrl, lerUmDe } from '@/hooks/useEstadoNaUrl'
import { useCallback, useState, useEffect } from 'react'
import {
  Plus, Loader2, Send,
  Trash2, BarChart3, Users, Copy, MoreHorizontal,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
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
import { EmptyState } from '@/components/ui/EmptyState'
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
  stopped:   { label: 'Interrompida' },
  paused:    { label: 'Pausada' },
}

const FILTER_OPTIONS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'Todas' },
  { value: 'draft',     label: 'Rascunhos' },
  { value: 'scheduled', label: 'Agendadas' },
  { value: 'sent',      label: 'Enviadas' },
  // Plano MA: parada pela Meta (template pausado/reprovado) ou pelo disjuntor.
  { value: 'stopped',   label: 'Interrompidas' },
]

const lerStatusCampanha = lerUmDe(['all', 'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled', 'stopped'] as const, 'all')

export function CampaignsTab({ onCountChange }: { onCountChange?: (n: number) => void } = {}) {
  // Gate on WhatsApp line availability — the backend rejects
  // create_campaign with 400 when no line is connected.
  const { numbers: whatsappLines, loading: waLoading } = useWorkspaceNumber()
  const hasWhatsappLine = whatsappLines.length > 0

  const isMobile = useIsMobile()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  // Filtros na URL (regra do PO). Trocar de aba em Disparos limpa a query,
  // então as chaves não colidem com as da aba Modelos.
  const [statusFilter, setStatusFilter] = useEstadoNaUrl<CampaignStatus | 'all'>('status', { padrao: 'all', ler: lerStatusCampanha })
  const [wizardOpen, setWizardOpen] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Relatório aberto vem da URL (?report=<campaignId>): é o destino do
  // deep-link de campaign_complete/failed (a rota /campaigns/:id não existe)
  // e sobrevive a reload. Abrir escreve o param (push: o Voltar do navegador
  // fecha), fechar remove; o updater funcional preserva ?tab= e o resto.
  const [searchParams, setSearchParams] = useSearchParams()
  const reportId = searchParams.get('report')
  const reportCampaign = reportId ? campaigns.find((c) => c.id === reportId) ?? null : null
  const openReport = (id: string) =>
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('report', id); return p })
  const closeReport = useCallback(() =>
    // Fechar o relatório leva junto o estado dele (aba e filtros internos).
    setSearchParams((prev) => { const p = new URLSearchParams(prev); ['report', 'relatorioAba', 'resultado', 'sentimento'].forEach((k) => p.delete(k)); return p }, { replace: true }),
  [setSearchParams])

  useEffect(() => {
    campaignsApi.list().then((r) => setCampaigns(r.data)).finally(() => setLoading(false))
  }, [])

  // ?report= apontando pra campanha que não existe (excluída, id errado):
  // com a lista já carregada, limpa o param em vez de deixar a URL mentindo.
  useEffect(() => {
    if (!loading && reportId && !campaigns.some((c) => c.id === reportId)) closeReport()
  }, [loading, reportId, campaigns, closeReport])

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
  const [lineFilter, setLineFilter] = useEstadoNaUrl<LineFilterValue>('linha', { padrao: 'all' })

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

      {/* Conteúdo — cards com o resultado embutido (SCRUM-1097, 22/09).
          Saiu a tabela: o PO não gosta dela e, mais grave, o RELATÓRIO — a
          ação mais importante de uma campanha enviada — estava escondido
          dentro do menu `···`. Aqui ele é um botão visível no próprio card,
          junto das métricas, no padrão de Mailchimp/Customer.io. */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-[108px] rounded-lg bg-surface-800 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Send}
              title={campaigns.length === 0 ? 'Nenhum disparo ainda' : 'Nenhum disparo com esses filtros'}
              hint={campaigns.length === 0
                ? 'Um disparo envia um modelo aprovado para muitos contatos de uma vez. Os modelos ficam na aba Templates.'
                : 'Ajuste o status ou a linha para ver mais.'}
              action={campaigns.length > 0
                ? { label: 'Limpar filtros', onClick: () => { setStatusFilter('all'); setLineFilter('all') } }
                : undefined}
            />
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-2">
            {filtered.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onSend={() => handleSend(c.id)}
                onReport={() => openReport(c.id)}
                onDelete={() => setDeleteTarget(c.id)}
                onAssignWaba={() => setAssignWabaTarget(c)}
                sending={sending === c.id}
                deleting={deleting === c.id}
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
            onClose={closeReport}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir campanha"
        description="Esta ação é irreversível. A campanha e todo o histórico de envios serão excluídos permanentemente."
        impact={(() => {
          const camp = campaigns.find((c) => c.id === deleteTarget)
          return camp ? { label: `Campanha "${camp.name}"`, tone: 'danger' as const } : undefined
        })()}
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
  // 1142 — pausa automática (circuit breaker) e interrupção por falhas.
  stopped:   'color-chip-soft border [--chip:var(--color-danger)]',
  paused:    'color-chip-soft border [--chip:var(--color-status-pending)]',
}

/** Número com separador de milhar — usado em todas as métricas do card. */
const num = (n: number) => n.toLocaleString('pt-BR')

function Metrica({ rotulo, valor, tom }: { rotulo: string; valor: number; tom?: 'perigo' }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn('text-[13px] font-semibold tabular-nums', tom === 'perigo' ? 'text-danger' : 'text-surface-100')}>
        {num(valor)}
      </span>
      <span className="text-[11px] text-surface-500">{rotulo}</span>
    </div>
  )
}

function CampaignCard({ campaign, onSend, onReport, onDelete, onAssignWaba, sending, deleting }: {
  campaign: Campaign
  onSend: () => void
  onReport: () => void
  onDelete: () => void
  onAssignWaba: () => void
  sending: boolean
  deleting: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const s = campaign.stats
  // "Já saiu da fila" — define se o card mostra progresso e relatório ou as
  // ações de rascunho. `failed` entra aqui de propósito: quem falhou precisa
  // do relatório MAIS que quem deu certo. Plano MA (MA-6.3): `stopped` também —
  // a interrompida tem relatório e NÃO tem "Enviar" (o backend recusava com
  // 400: não se retoma campanha parada; para reenviar, cria-se outra).
  const jaDisparou = ['sending', 'sent', 'failed', 'stopped'].includes(campaign.status)
  const interrompida = campaign.status === 'stopped'
  const total = s.total || 0
  const pct = total > 0 ? Math.min(100, Math.round((s.sent / total) * 100)) : 0
  const quando = campaign.sentAt ?? campaign.scheduledAt ?? campaign.createdAt

  return (
    <div className="border border-surface-700 rounded-lg bg-surface-800 px-4 py-3 flex flex-col gap-2.5">
      {/* Identidade */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('inline-flex items-center h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold flex-none', STATUS_CHIP_CLASS[campaign.status])}>
          {STATUS_CONFIG[campaign.status]?.label ?? campaign.status}
        </span>
        {/* Responsivo: flex-1 min-w-0 — sem isto um nome de campanha um
            pouco mais longo não truncava de verdade (flex item sem min-w-0
            não encolhe abaixo do seu conteúdo, mesmo com `truncate`) e
            estourava a largura do card em 390px, com chip/badges/data
            fixos ao redor. */}
        <span className="flex-1 min-w-0 text-[13px] font-semibold text-surface-50 truncate">{campaign.name}</span>
        {campaign.needsWabaAssignment && <WabaAssignmentBadge onClick={onAssignWaba} />}
        <WhatsappLineChip whatsappNumberId={campaign.whatsappNumberId ?? undefined} />
        {/* Medido ao vivo em 390px: card estourava 3px, culpa da data +
            kebab juntos. A data é o item menos essencial da linha — some
            abaixo de sm. ml-auto migrou pro wrapper (não fica mais só na
            data) pra continuar empurrando data+kebab juntos pra direita
            mesmo quando a data está escondida. */}
        <div className="ml-auto flex items-center gap-2 flex-none">
          <span className="hidden sm:inline-flex text-[11px] text-surface-500 tabular-nums flex-none">
            {new Date(quando).toLocaleDateString('pt-BR')}
          </span>
          <Dropdown
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            align="right"
            className="w-48"
            anchor={
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={`Mais ações — ${campaign.name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="w-7 h-7 rounded-xs flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors flex-none"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="px-1 py-1 flex flex-col gap-0.5">
              <DropdownItem onClick={() => { navigator.clipboard.writeText(campaign.name).catch(() => {}); setMenuOpen(false) }}>
                <Copy className="w-3.5 h-3.5" /> Copiar nome
              </DropdownItem>
              {campaign.needsWabaAssignment && (
                <DropdownItem onClick={() => { onAssignWaba(); setMenuOpen(false) }}>
                  <Users className="w-3.5 h-3.5" /> Atribuir linha WhatsApp
                </DropdownItem>
              )}
              <DropdownItem danger disabled={deleting} onClick={() => { onDelete(); setMenuOpen(false) }}>
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Excluir
              </DropdownItem>
            </div>
          </Dropdown>
        </div>
      </div>

      <p className="text-[11px] text-surface-500 truncate">
        modelo <span className="text-surface-400">{campaign.templateName}</span>
        {total > 0 && <> · {num(total)} destinatário{total === 1 ? '' : 's'}</>}
      </p>

      {interrompida && campaign.stopReason && (
        <p className="text-[11.5px] text-danger line-clamp-2" title={campaign.stopReason}>{campaign.stopReason}</p>
      )}

      {/* Progresso + métricas, só quando já existe resultado */}
      {jaDisparou && total > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-surface-900 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500',
                  campaign.status === 'failed' || interrompida ? 'bg-danger' : 'bg-brand-500')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-surface-400 tabular-nums flex-none">
              {num(s.sent)} / {num(total)}
            </span>
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <Metrica rotulo="entregues" valor={s.delivered} />
            <Metrica rotulo="lidas" valor={s.read} />
            {s.replied !== undefined && <Metrica rotulo="respostas" valor={s.replied} />}
            {s.failed > 0 && <Metrica rotulo="falhas" valor={s.failed} tom="perigo" />}
          </div>
        </>
      )}

      {/* Ações — o relatório é botão, não item de menu escondido. */}
      <div className="flex items-center gap-2 pt-0.5">
        {jaDisparou ? (
          <Button size="sm" variant="neutral" onClick={onReport} leftIcon={<BarChart3 className="w-3.5 h-3.5" />}>
            Ver relatório
          </Button>
        ) : (
          <Button
            size="sm"
            variant="neutral"
            onClick={onSend}
            disabled={sending || campaign.needsWabaAssignment}
            title={campaign.needsWabaAssignment ? 'Atribua uma linha WhatsApp antes de enviar' : undefined}
            leftIcon={sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          >
            {campaign.status === 'scheduled' ? 'Enviar agora' : 'Enviar'}
          </Button>
        )}
      </div>
    </div>
  )
}
