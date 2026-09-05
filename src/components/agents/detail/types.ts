// Extraído de AgentDetail.tsx (SCRUM-995 / W0.2) — tipos compartilhados entre
// o shell (`detail/AgentDetail.tsx`) e as abas (`detail/tabs/*`).

export type Tab = 'overview' | 'prompt' | 'tools' | 'skills' | 'capabilities' | 'criteria' | 'rules' | 'knowledge' | 'catalog' | 'metrics'

// O shell precisa deste tipo diretamente (estado `rulesSubTab` + a decisão de
// layout flex/scroll dependem de saber se a sub-aba ativa é "handoff") — não
// é exclusivo de RulesTab, por isso mora aqui em vez de em detail/tabs/RulesTab.tsx.
export type RulesSubTab = 'faqs' | 'handoff'
