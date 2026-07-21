import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Users, ExternalLink, Search, ChevronRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { attributionApi } from '@/services/api'
import type { CampaignLeadSummary } from '@/types'
import { cn } from '@/lib/utils'

// ── Outcome config ────────────────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<CampaignLeadSummary['outcome'], { label: string; color: string }> = {
  converted: { label: 'Cliente',     color: 'var(--color-accent-green)' },
  qualified:  { label: 'Qualificado', color: 'var(--color-accent-amber)' },
  lead:       { label: 'Lead',        color: 'var(--color-accent-blue)' },
  lost:       { label: 'Perdido',     color: 'var(--color-accent-rose)' },
}

// ── Main drawer ───────────────────────────────────────────────────────────────

interface CampaignLeadsDrawerProps {
  campaignId: string
  campaignName: string
  onClose: () => void
}

export function CampaignLeadsDrawer({ campaignId, campaignName, onClose }: CampaignLeadsDrawerProps) {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<CampaignLeadSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<CampaignLeadSummary['outcome'] | 'all'>('all')

  useEffect(() => {
    attributionApi.getCampaignLeads(campaignId)
      .then((r) => setLeads(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [campaignId])

  const filtered = leads.filter((l) => {
    if (outcomeFilter !== 'all' && l.outcome !== outcomeFilter) return false
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.phone.includes(search)) return false
    return true
  })

  const handleOpenCRM = (contactId: string) => {
    onClose()
    navigate(`/contacts?contact=${contactId}`)
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] bg-surface-950 border-l overlay-frame flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#1877f2]/15 border border-[#1877f2]/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-[#1877f2]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-surface-100 truncate">{campaignName}</h2>
            <p className="text-[11px] text-surface-500 mt-0.5">
              {loading ? 'Carregando...' : `${leads.length} lead${leads.length !== 1 ? 's' : ''} · Meta Ads`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Outcome summary pills */}
        {!loading && leads.length > 0 && (
          <div className="px-5 py-3 border-b border-surface-800 flex-shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setOutcomeFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                  outcomeFilter === 'all'
                    ? 'bg-surface-700 border-surface-500 text-surface-100'
                    : 'border-surface-800 text-surface-400 hover:text-surface-200',
                )}
              >
                Todos ({leads.length})
              </button>
              {(Object.entries(OUTCOME_CONFIG) as [CampaignLeadSummary['outcome'], typeof OUTCOME_CONFIG[keyof typeof OUTCOME_CONFIG]][]).map(([key, cfg]) => {
                const count = leads.filter((l) => l.outcome === key).length
                if (count === 0) return null
                return (
                  <button
                    key={key}
                    onClick={() => setOutcomeFilter(outcomeFilter === key ? 'all' : key)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                      outcomeFilter === key
                        ? 'color-chip'
                        : 'border-surface-800 text-surface-400 hover:text-surface-200',
                    )}
                    style={outcomeFilter === key ? ({ ['--chip']: cfg.color } as React.CSSProperties) : {}}
                  >
                    {cfg.label} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Search */}
        {!loading && leads.length > 0 && (
          <div className="px-5 py-3 border-b border-surface-800 flex-shrink-0">
            <div className="flex items-center gap-2 bg-surface-900 border border-surface-800 rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="flex-1 bg-transparent text-xs text-surface-200 placeholder:text-surface-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center flex-1 h-full gap-2 text-xs text-surface-500">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              Carregando leads...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-surface-500">
              <Users className="w-8 h-8" />
              <p className="text-xs">Nenhum lead encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-800/60">
              {filtered.map((lead) => {
                const outcome = OUTCOME_CONFIG[lead.outcome]
                return (
                  <div
                    key={lead.id + lead.adName}
                    className="group flex items-center gap-3 px-5 py-3 hover:bg-surface-900/60 transition-colors cursor-pointer"
                    onClick={() => handleOpenCRM(lead.id)}
                  >
                    {/* Stage color dot */}
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: lead.stageColor }} />

                    {/* Contact info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-surface-200">{lead.name}</span>
                        <span
                          className="color-chip px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ ['--chip']: outcome.color } as React.CSSProperties}
                        >
                          {outcome.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-surface-500 mt-0.5 truncate">
                        {lead.adName} · {lead.adSetName}
                      </p>
                      <p className="text-[10px] text-surface-600 font-mono mt-0.5">{lead.phone}</p>
                    </div>

                    {/* Date + CRM arrow */}
                    <div className="flex-shrink-0 text-right flex items-center gap-2">
                      <div>
                        <p className="text-[10px] text-surface-500">{fmt(lead.clickedAt)}</p>
                        <p className="text-[9px] text-surface-600 mt-0.5">{lead.stage}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-surface-600 group-hover:text-surface-300 transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {!loading && leads.length > 0 && (
          <div className="px-5 py-3 border-t border-surface-800 flex-shrink-0">
            <button
              onClick={() => navigate('/contacts')}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-surface-700 text-xs text-surface-400 hover:text-surface-200 hover:border-surface-600 transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir todos os contatos no CRM
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
