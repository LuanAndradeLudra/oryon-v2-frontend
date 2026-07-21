import { useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { SettingsSidebarItem } from './SettingsSidebarItem'
import { SettingsSectionsProvider, SettingsOutline } from './SettingsSection'
import { isRouteVisible } from '@/config/featureFlags'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'

interface SettingsLayoutProps {
  children: ReactNode
  currentRole?: string
}

// Sinônimos por seção — a busca encontra "etiquetas" mesmo com a seção
// rotulada "Tags", "cobrança" para billing etc. (padrão Linear/Slack).
const SEARCH_KEYWORDS: Record<string, string[]> = {
  account:           ['perfil', 'senha', 'email', 'avatar'],
  notifications:     ['alertas', 'push', 'avisos'],
  company:           ['empresa', 'organização', 'logo'],
  'company-brain':   ['ia', 'contexto', 'cérebro', 'conhecimento', 'prompt', 'agentes'],
  agents:            ['usuários', 'atendentes', 'equipe', 'membros', 'convites'],
  departments:       ['setores', 'times', 'filas'],
  'quick-replies':   ['respostas rápidas', 'atalhos', 'mensagens prontas'],
  tags:              ['etiquetas', 'labels', 'marcadores'],
  numbers:           ['whatsapp', 'linhas', 'números', 'telefone', 'conexão'],
  'whatsapp-health': ['saúde', 'qualidade', 'limites', 'tier', 'whatsapp'],
  'ad-accounts':     ['anúncios', 'meta ads', 'facebook', 'marketing', 'pixels'],
  vertical:          ['vocabulário', 'nicho', 'segmento', 'crm', 'funil'],
  billing:           ['plano', 'fatura', 'cobrança', 'pagamento', 'assinatura'],
  security:          ['segurança', 'sessões', 'logs de acesso', '2fa'],
  audit:             ['auditoria', 'logs', 'histórico', 'atividade'],
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface NavItem {
  section: string
  label: string
  adminOnly?: boolean
  supervisorOnly?: boolean
}

interface NavCluster {
  /** Sub-label leve dentro do domínio (sentence case, mudo). Omitido = sem label. */
  label?: string
  items: NavItem[]
}

interface NavDomain {
  /** Domínio de topo do modelo mental: "Conta" (eu) vs "Workspace" (minha org). */
  domain: string
  clusters: NavCluster[]
}

// ── Arquitetura da informação ────────────────────────────────────────────────
// Dois domínios (padrão Linear): CONTA = o que é meu, segue o usuário entre
// workspaces; WORKSPACE = o que é da organização. Dentro do workspace, os
// clusters seguem as perguntas do admin ("meu negócio", "meu time", "meus
// canais"...) — não os módulos técnicos do código. Grupos de 1 item foram
// fundidos: "Marketing" e "CRM" como categorias-fantasma morreram.
export const SETTINGS_NAV: NavDomain[] = [
  {
    domain: 'Conta',
    clusters: [
      {
        items: [
          { section: 'account',       label: 'Minha conta' },
          { section: 'notifications', label: 'Notificações' },
        ],
      },
    ],
  },
  {
    domain: 'Workspace',
    clusters: [
      {
        label: 'Geral',
        items: [
          { section: 'company',  label: 'Perfil da empresa',      supervisorOnly: true },
          { section: 'vertical', label: 'Vertical & vocabulário', adminOnly: true },
        ],
      },
      {
        label: 'Equipe',
        items: [
          { section: 'agents',      label: 'Usuários', supervisorOnly: true },
          { section: 'departments', label: 'Setores',  supervisorOnly: true },
        ],
      },
      {
        label: 'Atendimento',
        items: [
          { section: 'quick-replies', label: 'Respostas rápidas', supervisorOnly: true },
          { section: 'tags',          label: 'Tags',              supervisorOnly: true },
        ],
      },
      {
        label: 'Canais',
        items: [
          { section: 'numbers',         label: 'Números WhatsApp',  adminOnly: true },
          { section: 'whatsapp-health', label: 'Saúde das linhas',  adminOnly: true },
          { section: 'ad-accounts',     label: 'Contas de anúncios', adminOnly: true },
        ],
      },
      {
        label: 'Inteligência',
        items: [
          { section: 'company-brain', label: 'Contexto da IA', supervisorOnly: true },
        ],
      },
      {
        label: 'Administração',
        items: [
          { section: 'billing',  label: 'Plano & faturamento', adminOnly: true },
          { section: 'security', label: 'Segurança',           adminOnly: true },
          { section: 'audit',    label: 'Auditoria',           adminOnly: true },
        ],
      },
    ],
  },
]

/** Aplica papel + feature flags à navegação. Exportado p/ testes/reuso. */
export function visibleSettingsNav(currentRole: string): NavDomain[] {
  const isAdmin = currentRole === 'admin'
    || currentRole === 'business_admin'
    || currentRole === 'super_admin'
  const allowed = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.supervisorOnly && currentRole === 'agent') return false
    return isRouteVisible(`/settings/${item.section}`)
  }
  return SETTINGS_NAV
    .map((d) => ({
      ...d,
      clusters: d.clusters
        .map((c) => ({ ...c, items: c.items.filter(allowed) }))
        .filter((c) => c.items.length > 0),
    }))
    .filter((d) => d.clusters.length > 0)
}

/** Primeira seção visível para o papel — destino do redirect de /settings. */
export function firstVisibleSection(currentRole: string): string {
  return visibleSettingsNav(currentRole)[0]?.clusters[0]?.items[0]?.section ?? 'account'
}

export function SettingsLayout({ children, currentRole = 'admin' }: SettingsLayoutProps) {
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('')
  const query = normalize(search.trim())
  const matches = (item: NavItem) => {
    if (!query) return true
    if (normalize(item.label).includes(query)) return true
    return (SEARCH_KEYWORDS[item.section] ?? []).some((kw) => normalize(kw).includes(query))
  }
  const nav = visibleSettingsNav(currentRole)
    .map((d) => ({
      ...d,
      clusters: d.clusters
        .map((c) => ({ ...c, items: c.items.filter(matches) }))
        .filter((c) => c.items.length > 0),
    }))
    .filter((d) => d.clusters.length > 0)

  return (
    <div className="settings-scope flex flex-1 overflow-hidden flex-col">
      {isMobile && <MobilePageHeader title="Configurações" />}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
      {/* Navegação única — text-first, sem ícones, sem pills. A hierarquia é
          100% tipográfica: DOMÍNIO (caps) > cluster (sentence, mudo) > item. */}
      <aside className="w-full md:w-56 lg:w-60 flex-shrink-0 md:border-r border-b md:border-b-0 border-surface-800/60 py-3 md:py-5 px-3 overflow-y-auto max-h-60 md:max-h-none">
        {/* Busca — encontra por rótulo OU sinônimo natural */}
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar configuração..."
            aria-label="Buscar configuração"
            className="w-full bg-transparent border border-surface-700/60 rounded-lg pl-8 pr-2 py-1.5 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>

        {nav.length === 0 && (
          <p className="px-2 py-4 text-xs text-surface-500">Nenhuma configuração encontrada.</p>
        )}

        {nav.map((d) => (
          <div key={d.domain} className="mb-6">
            <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-surface-500">
              {d.domain}
            </p>
            {d.clusters.map((cluster, i) => (
              <div key={cluster.label ?? i} className={cluster.label ? 'mt-3 first:mt-0' : ''}>
                {cluster.label && (
                  <p className="px-2 mb-0.5 text-[11px] font-medium text-surface-600">
                    {cluster.label}
                  </p>
                )}
                <nav className="flex flex-col">
                  {cluster.items.map((item) => (
                    <SettingsSidebarItem
                      key={item.section}
                      section={item.section}
                      label={item.label}
                      currentRole={currentRole}
                    />
                  ))}
                </nav>
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* Conteúdo — três zonas: nav (esq.) | coluna de leitura centralizada |
          outline "Nesta página" (dir., 2xl+). O outline é gerado sozinho
          pelas SettingsSection registradas — em telas largas o espaço que
          sobrava vira navegação intra-página (padrão Stripe/docs). */}
      <main className="flex-1 overflow-y-auto py-6 px-4 md:py-8 md:px-10">
        <SettingsSectionsProvider>
          <div className="flex justify-center gap-10">
            <div className="max-w-4xl w-full min-w-0">
              {children}
            </div>
            <SettingsOutline />
          </div>
        </SettingsSectionsProvider>
      </main>
      </div>
    </div>
  )
}
