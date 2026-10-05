// ─── ConnectorTogglesSection — "Conectores" panel inside SkillsTab ─────────
// Redesigned 2026-09-14: this section ONLY lists connectors already
// installed at the tenant level (Settings → Conectores) and lets an
// owner-tier user flip a per-agent switch — no credential form here at all.
// Mirrors McpProvidersSection's shape almost exactly (list + Switch), which
// is deliberate: Skills-via-connector and MCP are sibling capabilities, and
// this section sits right above McpProvidersSection in SkillsTab.
//
// Installing a NEW connector always happens at the hub — this section's
// empty state links there instead of opening a form, closing the "buried
// install flow inside one agent's page" complaint from the pre-redesign
// version (SCRUM-1078's original ConnectorCatalogModal).

import { useState, useEffect, useCallback } from 'react'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { Link } from 'react-router-dom'
import { Plug, Loader2, AlertCircle, Lock, ArrowRight } from 'lucide-react'
import { listInstalledConnectorsForAgent, setConnectorEnabledForAgent } from '@/services/connectorsApi'
import type { AgentConnectorToggle } from '@/types/connectors'
import { Switch } from '@/components/ui/Switch'
import { Tooltip } from '@/components/ui/Tooltip'
import { CategoryIcon } from '@/components/skills/CategoryIcon'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { usePlanGate } from '@/hooks/usePlanGate'
import { isOwnerTier } from '@/lib/roleHelpers'
import { PLANS } from '@/config/plans'
import { cn } from '@/lib/utils'

interface Props {
  agentId: string
}

/** D12 — escondido com a flag connectorsSelfService desligada (o agent-server responde 404). */
export function ConnectorTogglesSection(props: Props) {
  const { isFeatureVisible } = useFeatureVisibility()
  const { user } = useAuth()
  // Revisão 03/10: o agent-server só responde ao dono (DONO) — os demais papéis
  // veriam a seção quebrada (403). A seção é de quem instala e liga conectores.
  if (!isFeatureVisible('connectorsSelfService') || !isOwnerTier(user?.role)) return null
  return <ConnectorTogglesSectionVisivel {...props} />
}

function ConnectorTogglesSectionVisivel({ agentId }: Props) {
  const { user } = useAuth()
  const owner = isOwnerTier(user?.role)
  const { allowed: planAllowed, upgrade } = usePlanGate('integrations')

  const [rows, setRows] = useState<AgentConnectorToggle[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const { toast } = useToast()

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRows(await listInstalledConnectorsForAgent(agentId))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    if (planAllowed) void reload()
    else setLoading(false)
  }, [reload, planAllowed])

  async function toggle(row: AgentConnectorToggle) {
    const next = !row.enabled
    setTogglingId(row.id)
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: next } : r)))
    try {
      await setConnectorEnabledForAgent(agentId, row.id, next)
      toast(next ? `${row.name} ativado neste agente` : `${row.name} pausado neste agente`, 'success')
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: !next } : r)))
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setTogglingId(null)
    }
  }

  if (!planAllowed) {
    return (
      <section className="mt-6 pt-6 border-t border-surface-800">
        <SectionHeader />
        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-900/40 border border-surface-800 text-sm">
          <Lock className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
          <p className="text-surface-400">
            Disponível a partir do plano <strong className="text-surface-200">{upgrade ? PLANS[upgrade].name : 'Business'}</strong>.
            Fale com seu gerente de conta para fazer upgrade.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6 pt-6 border-t border-surface-800">
      <SectionHeader />

      {loading ? (
        <div className="flex items-center justify-center py-10 text-surface-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-surface-400 break-words">{loadError}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-4 rounded-lg bg-surface-900/40 border border-dashed border-surface-800 text-sm text-surface-400">
          {owner ? (
            <div className="flex items-center justify-between gap-3">
              <span>Nenhum conector instalado neste workspace ainda.</span>
              <Link
                to="/settings/connectors"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:text-brand-200 flex-shrink-0"
              >
                Ir para Conectores <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <span>Nenhum conector instalado. Só o dono da conta pode instalar um, em Configurações.</span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                'flex items-center justify-between gap-3 p-3 rounded-lg border',
                row.enabled ? 'bg-surface-900 border-surface-700' : 'bg-surface-900/40 border-surface-800 opacity-80',
              )}
            >
              <div className="min-w-0 flex items-center gap-2">
                <CategoryIcon category={row.category} tone={row.enabled ? 'active' : 'muted'} size={28} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-100 truncate">{row.name}</p>
                  <p className="text-[11px] text-surface-500 truncate">{row.description}</p>
                </div>
              </div>
              {owner ? (
                <Switch checked={row.enabled} onChange={() => toggle(row)} disabled={togglingId === row.id} />
              ) : (
                <span className="text-xs text-surface-500 flex-shrink-0">{row.enabled ? 'Ativo' : 'Pausado'}</span>
              )}
            </div>
          ))}
          {owner && (
            <Link
              to="/settings/connectors"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:text-brand-200 mt-1"
            >
              Instalar outro conector <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <h2 className="text-sm font-semibold text-surface-100">Conectores</h2>
      <Tooltip
        content="Sistemas externos (ERPs, calendários, CRMs) conectados ao seu workspace. Para instalar um novo, vá em Configurações → Conectores; aqui você só ativa ou pausa o que já está instalado neste agente."
        side="top"
      >
        <span className="text-surface-500 hover:text-surface-300 cursor-help inline-flex">
          <Plug className="w-3.5 h-3.5" />
        </span>
      </Tooltip>
    </div>
  )
}
