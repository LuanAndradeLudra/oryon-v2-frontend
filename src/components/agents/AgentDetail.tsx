// SCRUM-995 (W0.2): AgentDetail foi extraído para detail/AgentDetail.tsx
// (shell) + detail/shared.tsx + detail/tabs/*. Este arquivo fica como
// re-export puro por uma onda para não obrigar AgentsPage.tsx a mudar o
// caminho de import agora — remover quando a A2 (Workspace) substituir o
// consumo direto.
export { AgentDetail } from './detail/AgentDetail'
