import { motion } from 'framer-motion'
import { X, BarChart3, Send, XCircle, Users, Info } from 'lucide-react'
import type { Campaign } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  if (!den) return '0%'
  return Math.round((num / den) * 100) + '%'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-surface-500">
        <span style={{ color }} className="opacity-70">{icon}</span>
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-surface-600">{sub}</p>}
    </div>
  )
}

// ── Main report drawer ────────────────────────────────────────────────────────

interface CampaignReportProps {
  campaign: Campaign
  onClose: () => void
}

/**
 * Relatório de campanha reduzido às métricas que o backend efetivamente
 * mede (total/enviadas/falhas em campaigns.processor.ts). As abas de
 * conversões, churn, atribuição, timeline de engajamento e conversas que
 * existiam aqui liam campos que a API nunca preenche (analytics.*
 * sempre undefined, stats.delivered/read/replied/conversions sempre 0,
 * GET /campaigns/:id/conversations nem existe) e a "Análise da IA"
 * chamava um stub que sempre retorna [] — todos números inventados
 * apresentados como reais. R8 (SCRUM-409): esconder o que não é medido.
 */
export function CampaignReport({ campaign, onClose }: CampaignReportProps) {
  const { stats } = campaign

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[600px] bg-surface-950 border-l border-surface-800 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-surface-100 truncate">{campaign.name}</h2>
            <p className="text-[11px] text-surface-500 mt-0.5">
              Relatório de desempenho · {stats.total} contatos · {campaign.sentAt ? fmtDate(campaign.sentAt) : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-surface-300 mb-3">Envio</p>
            <div className="grid grid-cols-3 gap-2">
              <KpiCard
                label="Enviadas"
                value={stats.sent}
                sub={`${pct(stats.sent, stats.total)} do total`}
                color="#3b82f6"
                icon={<Send className="w-3.5 h-3.5" />}
              />
              <KpiCard
                label="Falhas"
                value={stats.failed}
                sub={`${pct(stats.failed, stats.total)} do total`}
                color="#f43f5e"
                icon={<XCircle className="w-3.5 h-3.5" />}
              />
              <KpiCard
                label="Total de contatos"
                value={stats.total}
                color="#64748b"
                icon={<Users className="w-3.5 h-3.5" />}
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 px-4 py-3 bg-surface-900 border border-surface-800 rounded-xl">
            <Info className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-surface-500 leading-relaxed">
              Confirmação de entrega e leitura, respostas, conversões, motivos de churn e
              atribuição por origem ainda não são rastreados para disparos em massa —
              por isso não aparecem aqui.
            </p>
          </div>
        </div>
      </motion.div>
    </>
  )
}
