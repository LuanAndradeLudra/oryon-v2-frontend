import type { ReactNode } from 'react'
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
} from 'lucide-react'
import { SettingsSidebarItem } from './SettingsSidebarItem'
import { isRouteVisible } from '@/config/featureFlags'

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
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { section: 'billing',  label: 'Plano & Faturamento', icon: <CreditCard className="w-4 h-4" />, adminOnly: true },
      { section: 'security', label: 'Segurança',           icon: <ShieldCheck className="w-4 h-4" />, adminOnly: true },
    ],
  },
]

export function SettingsLayout({ children, currentRole = 'admin' }: SettingsLayoutProps) {
  const isAdmin = currentRole === 'admin' || currentRole === 'business_admin'
  const visibleGroups = NAV_GROUPS
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

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Settings sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-surface-800 py-4 px-2 overflow-y-auto">
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
      <main className="flex-1 overflow-y-auto py-6 px-6">
        {children}
      </main>
    </div>
  )
}
