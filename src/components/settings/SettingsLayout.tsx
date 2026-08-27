import type { ReactNode } from 'react'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
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
  Package,
  IdCard,
} from 'lucide-react'
import { SettingsSidebarItem } from './SettingsSidebarItem'
import { isRouteVisible } from '@/config/featureFlags'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'

interface SettingsLayoutProps {
  children: ReactNode
  currentRole?: string
}

const NAV_GROUPS = [
  {
    label: 'Conta',
    items: [
      { section: 'account',  label: 'Minha Conta',      icon: <User className="w-4 h-4" /> },
      { section: 'notifications', label: 'Notificações',  icon: <Bell className="w-4 h-4" /> },
      { section: 'company',       label: 'Perfil da Empresa', icon: <Building2 className="w-4 h-4" />, supervisorOnly: true },
      { section: 'company-brain', label: 'Contexto da IA',   icon: <Brain className="w-4 h-4" />,    supervisorOnly: true },
    ],
  },
  {
    label: 'Equipe & Atendimento',
    items: [
      { section: 'agents',       label: 'Usuários',          icon: <Users className="w-4 h-4" />,  supervisorOnly: true },
      { section: 'departments',  label: 'Setores',           icon: <Layers className="w-4 h-4" />, supervisorOnly: true },
      { section: 'quick-replies', label: 'Respostas Rápidas', icon: <Zap className="w-4 h-4" />,  supervisorOnly: true },
      { section: 'tags',         label: 'Tags',              icon: <Tag className="w-4 h-4" />,    supervisorOnly: true },
    ],
  },
  {
    label: 'WhatsApp',
    items: [
      { section: 'numbers', label: 'Números WhatsApp', icon: <Smartphone className="w-4 h-4" />, adminOnly: true },
      { section: 'whatsapp-health', label: 'Saúde das Linhas', icon: <Activity className="w-4 h-4" />, adminOnly: true },
      { section: 'whatsapp-profile', label: 'Perfil do WhatsApp', icon: <IdCard className="w-4 h-4" />, adminOnly: true },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { section: 'ad-accounts', label: 'Contas de Anúncios', icon: <Megaphone className="w-4 h-4" />, adminOnly: true },
    ],
  },
  {
    label: 'CRM',
    items: [
      { section: 'vertical', label: 'Vertical & Vocabulário', icon: <Globe2 className="w-4 h-4" />, adminOnly: true },
      { section: 'crm-products', label: 'Produtos', icon: <Package className="w-4 h-4" />, adminOnly: true },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      // `flag` respeita o feature flag settingsBilling, que ja existia e ja era
      // false em producao — mas ninguem aqui o consultava, entao a tela
      // aparecia para todo admin mesmo com o flag desligado. O isRouteVisible
      // so era usado pela navegacao principal (NavSidebar), nunca por este
      // submenu.
      { section: 'billing',  label: 'Plano & Faturamento', icon: <CreditCard className="w-4 h-4" />, adminOnly: true, flag: 'settingsBilling' as const },
      { section: 'security', label: 'Segurança',           icon: <ShieldCheck className="w-4 h-4" />, adminOnly: true },
      { section: 'audit',    label: 'Auditoria',           icon: <ScrollText className="w-4 h-4" />, adminOnly: true },
    ],
  },
]

export function SettingsLayout({ children, currentRole = 'admin' }: SettingsLayoutProps) {
  const { isFeatureVisible } = useFeatureVisibility()
  // super_admin (Oryon staff) and business_admin (tenant owner) both should
  // see every admin-gated section. Missing super_admin here was the reason
  // WhatsApp + Plataforma vanished after `/auth/me` resolved.
  const isAdmin = currentRole === 'admin'
    || currentRole === 'business_admin'
    || currentRole === 'super_admin'
  const isMobile = useIsMobile()
  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const adminOnly = 'adminOnly' in item && item.adminOnly
        const supervisorOnly = 'supervisorOnly' in item && item.supervisorOnly
        // Feature flag antes do papel: secao desligada nao aparece para
        // ninguem, nem para super_admin.
        if ('flag' in item && item.flag && !isFeatureVisible(item.flag)) return false
        if (adminOnly && !isAdmin) return false
        if (supervisorOnly && currentRole === 'agent') return false
        return isRouteVisible(`/settings/${item.section}`)
      }),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex flex-1 overflow-hidden flex-col">
      {isMobile && <MobilePageHeader title="Configurações" />}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
      {/* Settings sidebar — empilhada acima em mobile, lateral em desktop */}
      <aside className="w-full md:w-60 flex-shrink-0 md:border-r border-b md:border-b-0 border-surface-800 py-3 md:py-4 px-2 overflow-y-auto max-h-52 md:max-h-none">
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
