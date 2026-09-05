import { Shield, MessageCircleQuestion, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import type { RulesSubTab } from '../types'
import { HandoffTab } from './HandoffTab'
import { FaqRulesTab } from './FaqRulesTab'

// ─── Rules Tab (unified wrapper) ─────────────────────────────────────────────
// Single operator-facing tab that groups "Respostas rápidas" (FAQ keyword
// bypass) and "Roteamento" (Handoff rules). Backend schemas, APIs and
// runtime behaviour remain 100% independent — this is purely a UI grouping
// so the operator sees one place for "when a message arrives, what happens
// BEFORE the LLM gets called".
//
// subTab state is lifted to the parent (AgentDetail) because the outer
// layout toggles between scroll and flex-contained depending on which
// panel is active (Handoff needs flex-col for its sticky save bar; FAQ
// needs overflow-y-auto for a long list of rules).

export function RulesTab({
  agent,
  onUpdate,
  subTab,
  onSubTabChange,
}: {
  agent: AgentConfigWithTools
  onUpdate: (a: AgentConfig) => void
  subTab: RulesSubTab
  onSubTabChange: (s: RulesSubTab) => void
}) {
  // Roteamento first — it's the more impactful rule type for most agents
  // (where to send the conversation when AI shouldn't keep answering),
  // so we surface it as the default sub-tab.
  const subTabs: Array<{ id: RulesSubTab; label: string; icon: React.ReactNode; hint: string }> = [
    {
      id: 'handoff',
      label: 'Roteamento',
      icon: <Shield className="w-3.5 h-3.5" />,
      hint: 'Transfere a conversa para um atendente humano, redireciona para outro canal ou envia uma resposta final quando o agente NÃO deve continuar atendendo.',
    },
    {
      id: 'faqs',
      label: 'Respostas rápidas',
      icon: <MessageCircleQuestion className="w-3.5 h-3.5" />,
      hint: 'Responde automaticamente a saudações e perguntas frequentes por palavra-chave, sem consumir créditos de IA. O agente continua disponível para o resto da conversa.',
    },
  ]

  const activeHint = subTabs.find(t => t.id === subTab)?.hint ?? ''

  return (
    <div className={cn('flex flex-col gap-4', subTab === 'handoff' && 'h-full min-h-0')}>
      {/* Sub-tab selector (pill style, nested inside the main tab area) */}
      <div className="flex items-center gap-1 p-1 bg-surface-900/60 border border-surface-800/60 rounded-xl w-fit flex-shrink-0">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => onSubTabChange(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              subTab === t.id
                ? 'bg-surface-800 text-surface-100 ring-1 ring-surface-700'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-900',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Contextual banner — explains the difference so operators don't confuse
          the two panels. Same layout for both sub-tabs, content swaps. */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-brand-600/5 border border-brand-500/15 rounded-xl flex-shrink-0">
        <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-surface-400 leading-relaxed">{activeHint}</p>
      </div>

      {/* Active sub-tab content */}
      <div className={cn(
        subTab === 'handoff' ? 'flex flex-col flex-1 min-h-0' : 'min-h-0',
      )}>
        {subTab === 'faqs'    && <FaqRulesTab agent={agent} />}
        {subTab === 'handoff' && <HandoffTab agent={agent} onUpdate={onUpdate} />}
      </div>
    </div>
  )
}
