import { useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsSidebarItem } from './SettingsSidebarItem'
import { SettingsSectionsProvider, SettingsOutline } from './SettingsSection'
import { SettingsBreadcrumbCtx } from './settingsBreadcrumb'
import { useParams } from 'react-router-dom'
import { isRouteVisible } from '@/config/featureFlags'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { isOwnerTier } from '@/lib/roleHelpers'

interface SettingsLayoutProps {
  children: ReactNode
  currentRole?: string
  /** Gate de múltiplos funis por tenant (SCRUM-498) — `useMultiPipeline()`.
   *  Default `false`: seções de funil ficam escondidas a menos que o caller
   *  afirme o contrário. */
  multiPipeline?: boolean
}

/** Opções de visibilidade além do papel — flags por tenant vindas do backend. */
export interface SettingsNavOptions {
  multiPipeline?: boolean
}

// Sinônimos por seção — a busca encontra "etiquetas" mesmo com a seção
// rotulada "Tags", "cobrança" para billing etc. (padrão Linear/Slack).
const SEARCH_KEYWORDS: Record<string, string[]> = {
  account:             ['perfil', 'senha', 'email', 'avatar'],
  notifications:       ['alertas', 'push', 'avisos'],
  company:             ['empresa', 'organização', 'logo'],
  'company-brain':     ['ia', 'contexto', 'cérebro', 'conhecimento', 'prompt', 'agentes'],
  agents:              ['usuários', 'atendentes', 'equipe', 'membros', 'convites'],
  departments:         ['setores', 'times', 'filas'],
  'quick-replies':     ['respostas rápidas', 'atalhos', 'mensagens prontas'],
  tags:                ['etiquetas', 'labels', 'marcadores'],
  numbers:             ['whatsapp', 'linhas', 'números', 'telefone', 'conexão'],
  'whatsapp-health':   ['saúde', 'qualidade', 'limites', 'tier', 'whatsapp'],
  'whatsapp-profile':  ['whatsapp', 'perfil', 'foto', 'business'],
  'ad-accounts':       ['anúncios', 'meta ads', 'facebook', 'marketing', 'pixels'],
  vertical:            ['vocabulário', 'nicho', 'segmento', 'crm', 'funil'],
  'crm-products':      ['produtos', 'catálogo', 'preço', 'itens'],
  'crm-practitioners':  ['profissionais', 'médicos', 'equipe técnica'],
  stages:              ['situação do contato', 'estágios do contato', 'lead', 'cliente', 'ciclo de vida'],
  'custom-fields':     ['campos personalizados', 'campos', 'atributos', 'propriedades', 'custom fields'],
  'pipeline-stages':   ['funil', 'estágios', 'pipeline', 'negócios', 'deals'],
  'pipeline-routing':  ['roteamento', 'funil', 'linha', 'canal'],
  billing:             ['plano', 'fatura', 'cobrança', 'pagamento', 'assinatura'],
  connectors:          ['integrações', 'integração', 'api', 'feegow', 'doctoralia', 'webhook'],
  security:            ['segurança', 'sessões', 'logs de acesso', '2fa'],
  audit:               ['auditoria', 'logs', 'histórico', 'atividade'],
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface NavItem {
  section: string
  label: string
  adminOnly?: boolean
  ownerOnly?: boolean
  supervisorOnly?: boolean
  /** Só aparece com `FF_MULTI_PIPELINE` ligado para o tenant (SCRUM-498). */
  multiPipelineOnly?: boolean
  /** F11-888: fora do menu, mas a rota direta continua existindo (remoção física fica para depois). */
  hidden?: boolean
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
// 3 domínios de eyebrow (Workspace / Automação / Conta) — mock 2e, medido no
// PNG: "CRM" NÃO é eyebrow, é um sub-grupo de Workspace (rótulo sentence-case
// + itens recuados). Reagrupamento dos itens EXISTENTES, sem mudar
// rota/label/gate de nenhum — só a hierarquia visual (SCRUM-1097, R2-2E-01). "Etapas e funis" e "Horário de
// atendimento" do mock não têm rota própria hoje — decisão de produto,
// documentada em GAPS-PENDENTES.md, não inventada aqui.
export const SETTINGS_NAV: NavDomain[] = [
  {
    domain: 'Workspace',
    clusters: [
      {
        items: [
          { section: 'company',          label: 'Perfil da empresa',    supervisorOnly: true },
          { section: 'numbers',          label: 'Números WhatsApp',     adminOnly: true },
          { section: 'whatsapp-health',  label: 'Saúde das linhas',     adminOnly: true },
          { section: 'whatsapp-profile', label: 'Perfil do WhatsApp',   adminOnly: true },
          { section: 'ad-accounts',      label: 'Contas de anúncios',   adminOnly: true },
          { section: 'agents',           label: 'Usuários',             supervisorOnly: true },
          { section: 'departments',      label: 'Setores',              supervisorOnly: true },
        ],
      },
      {
        // Mock 2e: "CRM" é sub-grupo DENTRO de Workspace (rótulo sentence-case
        // + itens recuados), não um 5º domínio com eyebrow.
        label: 'CRM',
        items: [
          // Ordem e rótulos do mock 2e: Etapas e funis · Etiquetas e cores ·
          // Campos personalizados · Vocabulário (+ itens existentes do app).
          // Situação do contato fica ao lado de Etapas e funis (teste F13-903:
          // os dois eixos lado a lado) — único desvio da ordem do mock.
          // F13-903: a situação do contato ganha seção própria — o wizard apontava
          // para uma tela que não existia. Vale para todo tenant (não é do funil).
          { section: 'stages',            label: 'Situação do contato',   adminOnly: true },
          { section: 'pipeline-stages',   label: 'Etapas e funis',        adminOnly: true, multiPipelineOnly: true },
          { section: 'tags',              label: 'Etiquetas e cores',     supervisorOnly: true },
          { section: 'custom-fields',     label: 'Campos personalizados', adminOnly: true },
          { section: 'vertical',          label: 'Vocabulário',           adminOnly: true },
          { section: 'crm-products',      label: 'Produtos',              adminOnly: true },
          { section: 'crm-practitioners', label: 'Profissionais', adminOnly: true, hidden: true },
          // F11-888: roteamento congelado (Modelo B) — sai do menu; rota mantida oculta até a remoção física.
          { section: 'pipeline-routing',  label: 'Roteamento por canal',  adminOnly: true, multiPipelineOnly: true, hidden: true },
        ],
      },
    ],
  },
  {
    domain: 'Automação',
    clusters: [
      {
        items: [
          { section: 'company-brain', label: 'Contexto da IA',    supervisorOnly: true },
          { section: 'quick-replies', label: 'Respostas rápidas', supervisorOnly: true },
        ],
      },
      {
        // Mock 5b: "Integrações" é sub-grupo de Automação (Conectores dentro;
        // Webhooks e Chaves de API do mock não têm rota hoje). Breadcrumb do
        // mock: "Automação / Integrações / Conectores".
        label: 'Integrações',
        items: [
          // Leva 12 (SCRUM-1110) — Conectores, tela nova (README §3.10).
          { section: 'connectors',    label: 'Conectores',          adminOnly: true },
        ],
      },
    ],
  },
  {
    domain: 'Conta',
    clusters: [
      {
        items: [
          { section: 'account',       label: 'Minha conta' },
          { section: 'notifications', label: 'Notificações' },
          { section: 'billing',       label: 'Plano & faturamento', ownerOnly: true },
          { section: 'security',      label: 'Segurança e acesso',  adminOnly: true },
          { section: 'audit',         label: 'Auditoria',           adminOnly: true },
        ],
      },
    ],
  },
]

/** Seções que só existem com o gate de múltiplos funis — o `SettingsPage`
 *  usa para redirecionar acesso por URL direta quando o flag está desligado
 *  (o backend responderia 404/403 e a tela ficaria em erro). */
export const MULTI_PIPELINE_SECTIONS: ReadonlySet<string> = new Set(
  SETTINGS_NAV.flatMap((d) => d.clusters.flatMap((c) => c.items))
    .filter((i) => i.multiPipelineOnly)
    .map((i) => i.section),
)

/** Aplica papel + feature flags à navegação. Exportado p/ testes/reuso. */
export function visibleSettingsNav(currentRole: string, opts: SettingsNavOptions = {}): NavDomain[] {
  const isAdmin = currentRole === 'admin'
    || currentRole === 'business_admin'
    || currentRole === 'super_admin'
  const allowed = (item: NavItem) => {
    if (item.hidden) return false
    if (item.adminOnly && !isAdmin) return false
    if (item.ownerOnly && !isOwnerTier(currentRole)) return false
    if (item.supervisorOnly && currentRole === 'agent') return false
    if (item.multiPipelineOnly && !opts.multiPipeline) return false
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
export function firstVisibleSection(currentRole: string, opts: SettingsNavOptions = {}): string {
  return visibleSettingsNav(currentRole, opts)[0]?.clusters[0]?.items[0]?.section ?? 'account'
}

function NavClusterGroup({ cluster, activeSection, searching, currentRole }: {
  cluster: NavCluster
  activeSection?: string
  searching: boolean
  currentRole: string
}) {
  const containsActive = cluster.items.some((i) => i.section === activeSection)
  const [override, setOverride] = useState<boolean | null>(null)
  // Sub-grupo rotulado = acordeão (mock 5b: "CRM" recolhido, "Integrações"
  // aberto): abre sozinho quando contém a seção ativa; o rótulo alterna.
  const open = !cluster.label || searching || (override ?? containsActive)
  return (
    <div className="flex flex-col gap-[2px]">
      {cluster.label && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOverride(!open)}
          className={cn(
            'w-full h-7 px-[10px] flex items-center text-left text-[12.5px] transition-colors',
            containsActive ? 'font-semibold text-surface-100' : 'text-surface-400 hover:text-surface-100',
          )}
        >
          {cluster.label}
        </button>
      )}
      {open && (
        <nav className="flex flex-col gap-[2px]">
          {cluster.items.map((item) => (
            <SettingsSidebarItem
              key={item.section}
              section={item.section}
              label={item.label}
              nested={!!cluster.label}
              currentRole={currentRole}
            />
          ))}
        </nav>
      )}
    </div>
  )
}

export function SettingsLayout({ children, currentRole = 'admin', multiPipeline = false }: SettingsLayoutProps) {
  const isMobile = useIsMobile()
  const { section: activeSection } = useParams()
  // Canvas 5b: Conectores usa a coluna inteira (padding 26/32/24, sem max-width).
  const wide = activeSection === 'connectors'
  const breadcrumb = (() => {
    for (const d of SETTINGS_NAV) for (const c of d.clusters) for (const i of c.items) {
      if (i.section === activeSection) return [d.domain, ...(c.label ? [c.label] : []), i.label]
    }
    return undefined
  })()
  const [search, setSearch] = useState('')
  const query = normalize(search.trim())
  const matches = (item: NavItem) => {
    if (!query) return true
    if (normalize(item.label).includes(query)) return true
    return (SEARCH_KEYWORDS[item.section] ?? []).some((kw) => normalize(kw).includes(query))
  }
  const nav = visibleSettingsNav(currentRole, { multiPipeline })
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
      <aside className="w-full md:w-[248px] flex-shrink-0 bg-surface-800 border-b md:border-b-0 md:border-r border-surface-700 py-[14px] px-3 flex flex-col gap-[2px] overflow-y-auto max-h-60 md:max-h-none">
        {/* Busca — encontra por rótulo OU sinônimo natural */}
        <div className="relative mb-[10px] flex-shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar configuração..."
            aria-label="Buscar configuração"
            className="w-full h-7 bg-surface-800 border border-[var(--bd2)] rounded-sm pl-8 pr-7 text-xs text-surface-200 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
          {/* PL-C2-BUS-1: sem isso, quem digita e erra a palavra fica preso
              numa busca sem resultado — só dava pra limpar apagando letra a
              letra (P6). */}
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-surface-500 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {nav.length === 0 && (
          <div className="px-2 py-4">
            <p className="text-xs text-surface-500">
              Nenhuma configuração encontrada para "{search}".
            </p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-1.5 text-xs font-semibold text-accent-dark hover:opacity-80"
            >
              Limpar busca
            </button>
          </div>
        )}

        {nav.map((d, di) => (
          <div key={d.domain} className="flex flex-col gap-[2px]">
            <p className={di === 0 ? 'px-[10px] pt-[6px] pb-1 text-[10px] font-bold uppercase text-surface-500' : 'px-[10px] pt-[14px] pb-1 text-[10px] font-bold uppercase text-surface-500'} style={{ letterSpacing: '.14em' }}>
              {d.domain}
            </p>
            {d.clusters.map((cluster, i) => (
              <NavClusterGroup
                key={cluster.label ?? i}
                cluster={cluster}
                activeSection={activeSection}
                searching={!!query}
                currentRole={currentRole}
              />
            ))}
          </div>
        ))}
      </aside>

      {/* Conteúdo — três zonas: nav (esq.) | coluna de leitura centralizada |
          outline "Nesta página" (dir., 2xl+). O outline é gerado sozinho
          pelas SettingsSection registradas — em telas largas o espaço que
          sobrava vira navegação intra-página (padrão Stripe/docs). */}
      <main className={cn('flex-1 overflow-y-auto py-6 px-4 md:pt-[26px]', wide ? 'md:pb-6 md:px-8' : 'md:pb-8 md:px-10')}>
        <SettingsSectionsProvider>
          <SettingsBreadcrumbCtx.Provider value={breadcrumb}>
            <div className="flex justify-start gap-10">
              <div className={cn('w-full min-w-0', !wide && 'max-w-4xl')}>
                {children}
              </div>
              <SettingsOutline />
            </div>
          </SettingsBreadcrumbCtx.Provider>
        </SettingsSectionsProvider>
      </main>
      </div>
    </div>
  )
}
