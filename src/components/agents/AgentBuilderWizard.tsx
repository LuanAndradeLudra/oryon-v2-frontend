// NOTA (extração W0.3): a implementação inteira (2.246 linhas) foi extraída
// para `studio/{AgentBuilderWizard.tsx, useStudioDraft.ts, steps/*}` — ver
// W0.3-mapa.md. Este arquivo fica como re-export transitório só porque
// `src/pages/AgentsPage.tsx` ainda importa deste caminho antigo; ela está
// sendo movida para `src/pages/agents/AgentsPage.tsx` pelo W0.1 (Buril), que
// merge primeiro (ordem obrigatória da Onda 0). Depois desse merge, Compasso
// rebaseia W0.3 e troca o import de `AgentsPage.tsx` direto para
// `@/components/agents/studio/AgentBuilderWizard`, e este shim é removido.
export { AgentBuilderWizard } from './studio/AgentBuilderWizard'
