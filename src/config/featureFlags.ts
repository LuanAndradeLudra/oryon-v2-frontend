// Visibility flags for UI navigation entries.
// `false` = oculto da sidebar/busca/atalhos. Rotas, código e backend permanecem
// intactos — a página continua acessível digitando a URL diretamente, salvo
// guardas explícitas na página (ex.: campaigns).
export const FEATURE_FLAGS = {
  home: true,
  dashboard: true,
  conversations: true,
  contacts: true,
  nexus: false,
  campaigns: false,
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
  // Card "Insights da IA" no topo da página de CRM/Contatos
  // (ContactsStatsBar) — chama generateCRMInsights() na montagem e gasta
  // tokens. Quando false: o card some, a chamada de API é evitada por
  // completo, e o espaço liberado (col-span-2) passa a hospedar a busca +
  // filtros. Reativar = trocar para true (o card volta e a faixa de
  // filtros separada reaparece). Mesmo padrão reativável do aiContextCard.
  crmAiInsights: false,
  // Seção "Insights da IA" no Dashboard (AiInsightsSection, entre o KpiGrid e
  // os gráficos) — chama generateDashboardInsights() na montagem e gasta
  // tokens. Quando false: a seção não é montada, então nenhuma chamada de API
  // acontece e o layout colapsa naturalmente. Reativar = trocar para true.
  // Mesmo padrão reativável do crmAiInsights / aiContextCard.
  dashboardAiInsights: false,
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

/**
 * E-mails com acesso antecipado a features com `FEATURE_FLAGS[flag] === false`.
 * Comparação case-insensitive após trim.
 */
export const BETA_TESTER_EMAILS: readonly string[] = [
  'luanandradeti100@gmail.com',
  'luanandradeti10@gmail.com',
  'joaolucasrdugin@gmail.com'
]

/** Flags desligadas globalmente que beta testers podem ver. */
const BETA_GATED_FLAGS = new Set<FeatureFlag>(['campaigns'])

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isBetaTester(userEmail?: string | null): boolean {
  if (!userEmail?.trim()) return false
  const normalized = normalizeEmail(userEmail)
  return BETA_TESTER_EMAILS.some((e) => normalizeEmail(e) === normalized)
}

export const isFeatureVisible = (flag: FeatureFlag, userEmail?: string | null): boolean => {
  const base = FEATURE_FLAGS[flag]
  if (!base && BETA_GATED_FLAGS.has(flag) && isBetaTester(userEmail)) return true
  return base
}

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

export const isRouteVisible = (href: string, userEmail?: string | null): boolean => {
  const match = ROUTE_FLAGS.find(
    ([prefix]) => href === prefix || href.startsWith(prefix + '/'),
  )
  return match ? isFeatureVisible(match[1], userEmail) : true
}
