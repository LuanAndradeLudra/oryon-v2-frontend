// ─── Despacho :section → componente (A2 / SCRUM-1013) ────────────────────────
// Um único ponto de decisão para as 10 seções. O `switch` é exaustivo sobre
// `SectionId`, então acrescentar uma seção nova em `sectionNavCore.ts` sem
// tratá-la aqui vira erro de compilação em vez de tela em branco.

import type { AgentConfig, AgentConfigWithTools, AgentTool } from '@/services/agentsApi'
import type { SectionId } from './sectionNavCore'
import { CapabilitiesSection } from './sections/CapabilitiesSection'
import { CatalogSection } from './sections/CatalogSection'
import { CriteriaSection } from './sections/CriteriaSection'
import { KnowledgeSection } from './sections/KnowledgeSection'
import { MetricsSection } from './sections/MetricsSection'
import { OverviewSection } from './sections/OverviewSection'
import { PromptSection } from './sections/PromptSection'
import { RulesSection } from './sections/RulesSection'
import { SkillsSection } from './sections/SkillsSection'
import { ToolsSection } from './sections/ToolsSection'

interface SectionContentProps {
  section: SectionId
  agent: AgentConfigWithTools
  onUpdate: (a: AgentConfig) => void
  onToolsChange: (tools: AgentTool[]) => void
}

export function SectionContent({ section, agent, onUpdate, onToolsChange }: SectionContentProps) {
  switch (section) {
    case 'overview':     return <OverviewSection     agent={agent} onUpdate={onUpdate} />
    case 'prompt':       return <PromptSection       agent={agent} onUpdate={onUpdate} />
    case 'knowledge':    return <KnowledgeSection    agent={agent} />
    case 'catalog':      return <CatalogSection      agent={agent} />
    case 'capabilities': return <CapabilitiesSection agent={agent} onUpdate={onUpdate} />
    case 'skills':       return <SkillsSection       agent={agent} />
    case 'tools':        return <ToolsSection        agent={agent} onToolsChange={onToolsChange} />
    case 'criteria':     return <CriteriaSection     agent={agent} onUpdate={onUpdate} />
    case 'rules':        return <RulesSection        agent={agent} onUpdate={onUpdate} />
    case 'metrics':      return <MetricsSection      agent={agent} />
  }
}
