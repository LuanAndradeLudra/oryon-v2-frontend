// Visibility flags for UI navigation entries.
// `false` = oculto da sidebar/busca/atalhos. Rotas, código e backend permanecem
// intactos — a página continua acessível digitando a URL diretamente.
export const FEATURE_FLAGS = {
  home: true,
  dashboard: true,
  conversations: true,
  contacts: true,
  nexus: false,
  campaigns: true,
  marketing: false,
  automations: false,
  agents: true,
  copilot: false,
  settings: true,
  settingsAdAccounts: false,
  settingsVertical: false,
  settingsBilling: false,
  // Phase 18+ — surfaces the customer-facing "Skills" tab on AgentDetail.
  // Skills assigned by Oryon staff are always executed; this flag only
  // governs whether the customer sees them in the UI.
  agentSkills: true,
  // Resumo contextual gerado por IA no contato (aiSummary, painPoints,
  // nextBestAction). Card "Contexto da IA" no topo da Visão Geral do
  // contato, com botão para gerar/regenerar manualmente. Desligado para
  // economizar tokens enquanto a feature não está sendo usada
  // ativamente; combinar com FF_AUTO_AI_PROFILE_ON_RESOLVE=false no
  // backend para zerar a geração silenciosa.
  aiContextCard: false,
  // Botão "Perguntar à IA" / "Perguntar →" nos cards de Insights da IA.
  // Aparece em três lugares: Home (linha de insights), Dashboard
  // (AiInsightsSection) e CRM/Contatos (ContactsStatsBar). Quando false,
  // o insight continua sendo exibido mas o CTA que abre o Copilot some.
  aiInsightsAskButton: false,
  // Painel "Análise de Conversão IA" no sidebar de contato dentro de uma
  // conversa (botão "Analisar conversa com IA" + telas de resultado).
  // Quando false, o painel inteiro fica oculto — análises já feitas também
  // não aparecem para evitar UI inconsistente.
  conversionAnalysisPanel: false,
  // Seção "Oryon" do sidebar (Skills, Agentes cross-tenant, Auditoria,
  // AI Observability, AI Executions). Quando false, a seção inteira some
  // do menu lateral, mas as rotas continuam acessíveis via URL direta
  // (mesmo padrão das outras feature flags).
  oryonStaffSidebar: true,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export const isFeatureVisible = (flag: FeatureFlag): boolean => FEATURE_FLAGS[flag]

// Order matters: more specific prefixes (e.g. /settings/billing) must come
// before broader ones (/settings) — first match wins.
const ROUTE_FLAGS: Array<[string, FeatureFlag]> = [
  ['/home', 'home'],
  ['/dashboard', 'dashboard'],
  ['/conversations', 'conversations'],
  ['/contacts', 'contacts'],
  ['/team', 'nexus'],
  ['/campaigns', 'campaigns'],
  ['/marketing', 'marketing'],
  ['/automations', 'automations'],
  ['/agents', 'agents'],
  ['/copilot', 'copilot'],
  ['/settings/ad-accounts', 'settingsAdAccounts'],
  ['/settings/vertical', 'settingsVertical'],
  ['/settings/billing', 'settingsBilling'],
  ['/settings', 'settings'],
]

export const isRouteVisible = (href: string): boolean => {
  const match = ROUTE_FLAGS.find(
    ([prefix]) => href === prefix || href.startsWith(prefix + '/'),
  )
  return match ? isFeatureVisible(match[1]) : true
}
