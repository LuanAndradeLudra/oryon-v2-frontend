import { useState, type ReactNode } from 'react'
import {
  User,
  Building2,
  Users,
  Smartphone,
  Zap,
  Tag,
  CreditCard,
  ShieldCheck,
  Layers,
  Megaphone,
  Globe2,
  Brain,
  Bell,
  Activity,
  ScrollText,
  Search,
} from 'lucide-react'
import { SettingsSidebarItem } from './SettingsSidebarItem'
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
  'company-brain':   ['ia', 'contexto', 'cérebro', 'conhecimento', 'prompt'],
  agents:            ['usuários', 'atendentes', 'equipe', 'membros', 'convites'],
  departments:       ['setores', 'times', 'filas'],
  'quick-replies':   ['respostas rápidas', 'atalhos', 'mensagens prontas'],
  tags:              ['etiquetas', 'labels', 'marcadores'],
  numbers:           ['whatsapp', 'linhas', 'números', 'telefone', 'conexão'],
  'whatsapp-health': ['saúde', 'qualidade', 'limites', 'tier'],
  'ad-accounts':     ['anúncios', 'meta ads', 'facebook', 'marketing'],
  vertical:          ['vocabulário', 'nicho', 'segmento', 'crm'],
  billing:           ['plano', 'fatura', 'cobrança', 'pagamento', 'assinatura'],
  security:          ['segurança', 'sessões', 'logs de acesso', '2fa'],
  audit:             ['auditoria', 'logs', 'histórico', 'atividade'],
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const NAV_GROUPS = [
  {
    label: 'Conta',
    items: [
      { section: 'account',  label: 'Minha Conta',      icon: <User className="w-4 h-4" />, desc: 'Perfil pessoal, e-mail e senha' },
      { section: 'notifications', label: 'Notificações',  icon: <Bell className="w-4 h-4" />, desc: 'Alertas, push e avisos por tipo' },
      { section: 'company',       label: 'Perfil da Empresa', icon: <Building2 className="w-4 h-4" />, supervisorOnly: true, desc: 'Nome, logo e dados da organização' },
      { section: 'company-brain', label: 'Contexto da IA',   icon: <Brain className="w-4 h-4" />,    supervisorOnly: true, desc: 'O que os agentes sabem sobre o negócio' },
    ],
  },
  {
    label: 'Equipe & Atendimento',
    items: [
      { section: 'agents',       label: 'Usuários',          icon: <Users className="w-4 h-4" />,  supervisorOnly: true, desc: 'Convites, papéis e acessos da equipe' },
      { section: 'departments',  label: 'Setores',           icon: <Layers className="w-4 h-4" />, supervisorOnly: true, desc: 'Times e filas de atendimento' },
      { section: 'quick-replies', label: 'Respostas Rápidas', icon: <Zap className="w-4 h-4" />,  supervisorOnly: true, desc: 'Atalhos de mensagem com /' },
      { section: 'tags',         label: 'Tags',              icon: <Tag className="w-4 h-4" />,    supervisorOnly: true, desc: 'Etiquetas de conversas e contatos' },
    ],
  },
  {
    label: 'WhatsApp',
    items: [
      { section: 'numbers', label: 'Números WhatsApp', icon: <Smartphone className="w-4 h-4" />, adminOnly: true, desc: 'Linhas conectadas e pareamento' },
      { section: 'whatsapp-health', label: 'Saúde das Linhas', icon: <Activity className="w-4 h-4" />, adminOnly: true, desc: 'Qualidade, limites e tier das linhas' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { section: 'ad-accounts', label: 'Contas de Anúncios', icon: <Megaphone className="w-4 h-4" />, adminOnly: true, desc: 'Integração Meta Ads e pixels' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { section: 'vertical', label: 'Vertical & Vocabulário', icon: <Globe2 className="w-4 h-4" />, adminOnly: true, desc: 'Nicho do negócio e termos do funil' },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { section: 'billing',  label: 'Plano & Faturamento', icon: <CreditCard className="w-4 h-4" />, adminOnly: true, desc: 'Assinatura, uso e cobrança' },
      { section: 'security', label: 'Segurança',           icon: <ShieldCheck className="w-4 h-4" />, adminOnly: true, desc: 'Sessões ativas e logs de acesso' },
      { section: 'audit',    label: 'Auditoria',           icon: <ScrollText className="w-4 h-4" />, adminOnly: true, desc: 'Histórico de ações no workspace' },
    ],
  },
]

/** Filtra grupos/itens por papel + feature flags — usado pela sidebar e pelo hub. */
export function visibleNavGroups(currentRole: string) {
  const isAdmin = currentRole === 'admin'
    || currentRole === 'business_admin'
    || currentRole === 'super_admin'
  return NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const adminOnly = 'adminOnly' in item && item.adminOnly
        const supervisorOnly = 'supervisorOnly' in item && item.supervisorOnly
        if (adminOnly && !isAdmin) return false
        if (supervisorOnly && currentRole === 'agent') return false
        return isRouteVisible(`/settings/${item.section}`)
      }),
    }))
    .filter((group) => group.items.length > 0)
}

export function SettingsLayout({ children, currentRole = 'admin' }: SettingsLayoutProps) {
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('')
  const query = normalize(search.trim())
  const matches = (item: { section: string; label: string }) => {
    if (!query) return true
    if (normalize(item.label).includes(query)) return true
    return (SEARCH_KEYWORDS[item.section] ?? []).some((kw) => normalize(kw).includes(query))
  }
  const visibleGroups = visibleNavGroups(currentRole)
    .map((group) => ({ ...group, items: group.items.filter(matches) }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex flex-1 overflow-hidden flex-col">
      {isMobile && <MobilePageHeader title="Configurações" />}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
      {/* Settings sidebar — empilhada acima em mobile, lateral em desktop */}
      <aside className="w-full md:w-56 lg:w-60 flex-shrink-0 md:border-r border-b md:border-b-0 border-surface-800 py-3 md:py-4 px-2 overflow-y-auto max-h-52 md:max-h-none">
        {/* Busca de configurações — encontra por rótulo OU sinônimo natural */}
        <div className="relative px-1 mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar configuração..."
            aria-label="Buscar configuração"
            className="w-full bg-surface-900 border border-surface-700 rounded-xl pl-8 pr-3 py-1.5 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
        {visibleGroups.length === 0 && (
          <p className="px-3 py-4 text-xs text-surface-500">Nenhuma configuração encontrada.</p>
        )}
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-600">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <SettingsSidebarItem
                  key={item.section}
                  section={item.section}
                  label={item.label}
                  icon={item.icon}
                  currentRole={currentRole}
                />
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto py-4 px-4 md:py-6 md:px-6">
        {children}
      </main>
      </div>
    </div>
  )
}
