// Visibility flags for UI navigation entries.
// `false` = oculto da sidebar/busca/atalhos. Rotas, código e backend permanecem
// intactos — a página continua acessível digitando a URL diretamente.
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
