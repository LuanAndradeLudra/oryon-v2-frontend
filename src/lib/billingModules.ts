// ─── Módulos do contrato (SCRUM-1210/1211) ────────────────────────────────────
// Regra do produto (B21): módulo AUSENTE = LIGADO; só `false` explícito desliga.
// Contratos antigos não têm a lista e continuam vendo tudo. O backend recusa
// módulo fora desta lista no PUT do catálogo.

export const PLAN_MODULES = [
  'copilot', 'agentBuilder', 'marketing', 'campaigns', 'automations', 'nexus', 'apiAccess', 'advancedAnalytics',
] as const

export type PlanModuleId = (typeof PLAN_MODULES)[number]

export const PLAN_MODULE_LABEL: Record<PlanModuleId, string> = {
  copilot: 'Copilot',
  agentBuilder: 'Construtor de agentes de IA',
  marketing: 'Marketing e atribuição',
  campaigns: 'Disparos',
  automations: 'Automações',
  nexus: 'Nexus (chat interno)',
  apiAccess: 'Acesso à API',
  advancedAnalytics: 'Relatórios avançados',
}

/** Módulo ligado? Ausente conta como ligado; só `false` explícito desliga. */
export function isModuleOn(modules: Record<string, unknown> | null | undefined, key: string): boolean {
  return modules?.[key] !== false
}

/** Os 8 módulos com valor EXPLÍCITO (ausente vira `true`) — é o que o catálogo salva. */
export function explicitModules(modules: Record<string, unknown> | null | undefined): Record<PlanModuleId, boolean> {
  return Object.fromEntries(PLAN_MODULES.map((m) => [m, isModuleOn(modules, m)])) as Record<PlanModuleId, boolean>
}

/** Rota do app → módulo do contrato (menu, "Mais", busca e guarda de rota). */
export const MODULE_BY_ROUTE: Record<string, PlanModuleId> = {
  '/campaigns': 'campaigns',
  '/marketing': 'marketing',
  '/automations': 'automations',
  '/agents': 'agentBuilder',
  '/copilot': 'copilot',
  '/team': 'nexus',
}

/** `pathname` é `prefix` ou está abaixo dele — segmento exato (`/team` não casa `/teams`). */
export function isPathUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Módulo que governa a rota, ou null se a rota não depende de módulo. */
export function moduleForPath(pathname: string): PlanModuleId | null {
  const path = pathname.split(/[?#]/)[0]
  for (const [route, key] of Object.entries(MODULE_BY_ROUTE)) {
    if (isPathUnder(path, route)) return key
  }
  return null
}
