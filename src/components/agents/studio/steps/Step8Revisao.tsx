import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/Switch'
import { Banner } from '@/components/ui/Banner'
import { PromptArtifact } from '@/components/agents/PromptArtifact'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'
import type { AgentCrmCapabilities, AgentCrmCapabilityConfig, CrmCapabilityId } from '@/services/agentsApi'
import type { WizardData } from '../types'
import { SECTORS, TONES } from './constants'
import { PromptReviewModal } from './PromptReviewModal'

// ─── CRM Capabilities Review (inline in Step 8) ──────────────────────────────
// Lightweight on/off toggles for the CRM capability groups. Constraints
// (allowlists) are deliberately NOT exposed here — those need real tag/user/
// stage data the user typically only finalises after the agent is created.
// The post-creation "Capacidades" tab is where fine-tuning happens.

function CapabilitiesReview({
  data, setData,
}: {
  data: WizardData
  setData: React.Dispatch<React.SetStateAction<WizardData>>
}) {
  const map = new Map<CrmCapabilityId, AgentCrmCapabilityConfig>(
    data.crm_capabilities.capabilities.map((c) => [c.id, c]),
  )

  const toggle = (id: CrmCapabilityId, enable: boolean) => {
    const entry = CRM_CAPABILITIES_CATALOG.find((c) => c.id === id)
    setData((d) => {
      const without = d.crm_capabilities.capabilities.filter((c) => c.id !== id)
      const nextCaps: AgentCrmCapabilityConfig[] = enable
        ? [
            ...without,
            {
              id,
              enabled: true,
              // Apply the catalog's conservative defaults (e.g. block 'resolved'
              // status). User can refine later in the "Capacidades" tab.
              ...(entry?.defaultConstraints ? { constraints: entry.defaultConstraints } : {}),
            },
          ]
        : without
      const updated: AgentCrmCapabilities = { capabilities: nextCaps }
      return { ...d, crm_capabilities: updated }
    })
  }

  const enabledCount = data.crm_capabilities.capabilities.filter((c) => c.enabled).length

  return (
    <div className="bg-surface-900/60 border border-surface-800 rounded-xl px-4 py-3 flex-shrink-0">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[11px] text-surface-300 font-semibold uppercase tracking-wide">
          Capacidades de CRM <span className="text-surface-600 font-normal normal-case">(opcional)</span>
        </p>
        {enabledCount > 0 && (
          <span className="text-[10px] text-brand-400">{enabledCount} habilitada(s)</span>
        )}
      </div>
      <p className="text-[11px] text-surface-500 mb-3">
        Quais ações o agente pode executar dentro do CRM ao atender no WhatsApp. Você pode ajustar limites depois na aba <strong>Capacidades</strong>.
      </p>
      <div className="space-y-1">
        {CRM_CAPABILITIES_CATALOG.map((entry) => {
          const enabled = !!map.get(entry.id)?.enabled
          return (
            <label
              key={entry.id}
              className={cn(
                'flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                enabled ? 'bg-brand-950/30' : 'hover:bg-surface-800/40',
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                  enabled ? 'bg-brand-700/30 text-brand-300' : 'bg-surface-900 text-surface-500',
                )}
              >
                {entry.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-200">{entry.label}</p>
                <p className="text-[11px] text-surface-500 truncate">{entry.description}</p>
              </div>
              <Switch checked={enabled} onChange={(v) => toggle(entry.id, v)} />
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 8: Revisão & Publicar ───────────────────────────────────────────────
// NOTA (extração W0.3): esta função se chamava `Step7` no arquivo original
// (AgentBuilderWizard.tsx) — mesmo off-by-one de nome citado em
// Step7GerarPrompt.tsx. Renomeada aqui pelo rótulo real ("Revisão", passo 8 de 8).

export function Step8Revisao({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  const [reviewOpen, setReviewOpen] = useState(false)

  const activeChannels = [
    data.channels_whatsapp && 'WhatsApp',
    data.channels_messenger && 'Messenger',
    data.channels_instagram && 'Instagram',
  ].filter(Boolean) as string[]

  const sectorLabel = SECTORS.find(s => s.value === data.sector)?.label ?? data.sector
  const toneLabel   = TONES.find(t => t.value === data.tone)?.label ?? data.tone

  return (
    <div className="flex flex-col min-h-0 h-full gap-4">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Tudo pronto para publicar</h2>
        <p className="text-sm text-surface-500 mt-0.5">Revise as configurações antes de ativar o agente.</p>
      </div>

      <div className="bg-surface-900/60 border border-surface-800 rounded-xl p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <AgentIcon iconId={data.icon} className="w-10 h-10" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-100">{data.name}</p>
            <p className="text-xs text-surface-500">{sectorLabel} · Tom: {toneLabel}</p>
          </div>
          {data.persona_name && data.persona_name !== data.name && (
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-surface-600">Persona</p>
              <p className="text-xs text-surface-300">{data.persona_name}</p>
            </div>
          )}
        </div>
        {data.objective && (
          <p className="text-xs text-surface-500 mt-2 p-2 border-t border-surface-800 rounded-lg">{data.objective}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        {[
          { label: 'Empresa',        value: data.company_name || '—' },
          { label: 'Canais',         value: activeChannels.length > 0 ? activeChannels.join(', ') : 'Nenhum' },
          { label: 'Capacidades',    value: `${data.can_do.length} itens` },
          { label: 'Restrições',     value: `${data.cannot_do.length} itens` },
          { label: 'FAQs',           value: `${data.faqs.filter(f => f.question).length} perguntas` },
          { label: 'Encaminhamentos', value: data.handoff_rules.length > 0 ? `${data.handoff_rules.length} regra(s)` : 'Nenhuma' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-900/60 border border-surface-800 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-surface-600 uppercase tracking-wide">{label}</p>
            <p className="text-xs font-medium text-surface-200 truncate">{value}</p>
          </div>
        ))}
      </div>

      <CapabilitiesReview data={data} setData={setData} />


      {/* Prompt artifact — fills remaining vertical space */}
      <div className="flex flex-col flex-1 min-h-0">
        {data.generated_prompt ? (
          <PromptArtifact
            content={data.generated_prompt}
            readOnly
            fillHeight
            onExpand={() => setReviewOpen(true)}
          />
        ) : (
          <Banner variant="warning">Volte ao passo anterior e gere o system prompt antes de publicar.</Banner>
        )}
      </div>

      {/* Full-screen review modal — same component used in Step 7 (Gerar Prompt) */}
      <PromptReviewModal
        open={reviewOpen}
        initialPrompt={data.generated_prompt}
        onClose={() => setReviewOpen(false)}
        onConfirm={(prompt) => {
          setData(d => ({ ...d, generated_prompt: prompt }))
          setReviewOpen(false)
        }}
      />
    </div>
  )
}
