// Visibility flags for UI navigation entries.
// `false` = oculto da sidebar/busca/atalhos. Rotas, código e backend permanecem
// intactos — a página continua acessível digitando a URL diretamente, salvo
// guardas explícitas na página (ex.: campaigns).
const FLAGS_BASE = {
  home: true,
  dashboard: true,
  conversations: true,
  contacts: true,
  nexus: false,
  campaigns: true,
  // Ocultos por enquanto, a pedido do PO (02/09) — some do menu, rota e
  // backend seguem intactos.
  marketing: false,
  automations: false,
  agents: true,
  copilot: false,
  settings: true,
  settingsAdAccounts: false,
  settingsVertical: false,
  // Billing (SCRUM-172/154) fica OCULTO até o módulo de cobrança estar pronto.
  //
  // Era `import.meta.env.VITE_SETTINGS_BILLING === 'true'`, mas a tela apareceu
  // em produção mesmo assim: o submenu de configurações (SettingsLayout) nunca
  // consultava este flag — só a navegação principal usava isRouteVisible. Com o
  // submenu corrigido, o flag passou a valer; fixado em false aqui para não
  // depender de env de ambiente nenhum.
  //
  // Para validar billing em staging: trocar para `true`. Uma linha.
  settingsBilling: import.meta.env.VITE_SETTINGS_BILLING === 'true',
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
  // Card "Insights da Oryon AI" na Home — chamava generateInsights() (Haiku no
  // agent-server) a cada abertura da Home e a cada "Atualizar". Desligado a
  // pedido do PO (29/09): o texto saía em tom de ordem e o custo não se pagava.
  // Quando false: o card não é montado, então NENHUMA chamada de API acontece.
  // Reativar = trocar para true (rever antes a instrução em insights.ts, SCRUM-1161 H6).
  homeAiInsights: false,
  // Painel "Análise de Conversão IA" no sidebar de contato dentro de uma
  // conversa (botão "Analisar conversa com IA" + telas de resultado).
  // Quando false, o painel inteiro fica oculto — análises já feitas também
  // não aparecem para evitar UI inconsistente.
  conversionAnalysisPanel: false,
  // Seção "Funis" no painel do contato dentro de Conversas
  // (ContactPanelDeals). Ficou `false` enquanto múltiplos pipelines
  // (SCRUM-285 / épico SCRUM-809) não rodavam em produção — condição que
  // o épico SCRUM-922 encerra: é ele que entrega o módulo. Ligada.
  // A seção continua se escondendo sozinha quando o contato não tem
  // registro nenhum; esta flag é o interruptor de rollback, não a regra
  // de exibição.
  contactPanelDeals: true,
  // Página dedicada de perfil do contato (/contacts/:id) — Customer 360.
  // Quando false: a rota redireciona para o drawer (/contacts?contact=<id>)
  // e o botão "Expandir" do drawer some. O drawer continua funcionando
  // normalmente em ambos os estados (quick-view e página coexistem).
  contactProfilePage: true,
  // Seção "Oryon" do sidebar (Skills, Agentes cross-tenant, Auditoria,
  // AI Observability, AI Executions). Quando false, a seção inteira some
  // do menu lateral, mas as rotas continuam acessíveis via URL direta
  // (mesmo padrão das outras feature flags).
  oryonStaffSidebar: true,
  // Funis de PROCESSO (Modelo B §4.2) como opção na CRIAÇÃO de funil.
  //
  // `false` esconde só a escolha: o cartão "Processo" some do campo "Tipo" em
  // CreatePipelineModal e todo funil novo nasce `sales`. NÃO esconde o que já
  // existe — os funis de processo do tenant continuam abrindo, operáveis, com
  // o vocabulário deles ("registro", Concluído/Cancelado), porque os ramos que
  // leem `pipelineKindOf()` seguem intactos. Esconder os existentes órfãos os
  // registros abertos e é uma decisão separada, com migração antes.
  //
  // Reativar = trocar para `true`. Uma linha.
  processPipelines: false,
  // Conectores self-service (SCRUM-1071). D12 (release 2026-09-29): o código
  // entra na release escondido — some o item de Configurações, a URL direta
  // volta, a seção "Conectores"/"Servidores MCP" some da aba Skills e o link
  // de staff sai do menu. O agent-server responde 404 nas mesmas rotas com
  // FF_CONNECTORS_SELF_SERVICE desligada. Ligar só depois dos itens de
  // segurança da T6 (segredos cifrados, teto do motor de rascunho, SSRF,
  // tenantPlan, piloto do Feegow).
  connectorsSelfService: false,
  // D8 (release 2026-09-29) — abas do relatório de campanha sem fonte de
  // dados (Conversões, Churn, Atribuição, Conversas por campanha, linha do
  // tempo de engajamento e a análise da IA sobre esses números). O backend
  // não calcula nada disso: com a flag desligada as abas somem em vez de
  // mostrar zero. Religar só quando existir fonte.
  campaignReportLegacyTabs: false,
} as const

/**
 * Teste local de ponta a ponta (PO 01/10): `VITE_FLAGS_TODAS=true` no
 * `.env.local` liga TODAS as flags de tela acima — mas só no servidor de
 * desenvolvimento (`import.meta.env.DEV`). Em build (homologação/produção) a
 * variável é ignorada e valem os valores de `FLAGS_BASE`.
 */
const FLAGS_TODAS = import.meta.env.DEV && import.meta.env.VITE_FLAGS_TODAS === 'true'

export const FEATURE_FLAGS: Record<keyof typeof FLAGS_BASE, boolean> = FLAGS_TODAS
  ? (Object.fromEntries(Object.keys(FLAGS_BASE).map((k) => [k, true])) as Record<keyof typeof FLAGS_BASE, boolean>)
  : FLAGS_BASE

export type FeatureFlag = keyof typeof FLAGS_BASE

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
const BETA_GATED_FLAGS = new Set<FeatureFlag>()

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
  ['/settings/connectors', 'connectorsSelfService'],
  ['/admin/connectors', 'connectorsSelfService'],
  ['/admin/connector-requests', 'connectorsSelfService'],
  ['/settings', 'settings'],
]

export const isRouteVisible = (href: string, userEmail?: string | null): boolean => {
  const match = ROUTE_FLAGS.find(
    ([prefix]) => href === prefix || href.startsWith(prefix + '/'),
  )
  return match ? isFeatureVisible(match[1], userEmail) : true
}

// ── Feature flags por TENANT (backend) ───────────────────────────────────────
// Diferente das `FEATURE_FLAGS` acima (constantes de build), estas vêm do
// backend por tenant: `GET /auth/me` devolve `featureFlags: string[]` com as
// chaves ligadas em `tenant_feature_flags` (SCRUM-498). Ausência do campo
// (backend sem o módulo) ou da chave = DESLIGADO — o padrão é sempre
// esconder, nunca expor uma superfície que o backend vai responder 403/404.

/** Múltiplos funis de negócio (SCRUM-285 / épico SCRUM-809). */
export const TENANT_FLAG_MULTI_PIPELINE = 'FF_MULTI_PIPELINE'

/** `true` só quando o backend listou `FF_MULTI_PIPELINE` para o tenant. */
export function multiPipelineEnabled(featureFlags?: readonly string[] | null): boolean {
  return featureFlags?.includes(TENANT_FLAG_MULTI_PIPELINE) ?? false
}
