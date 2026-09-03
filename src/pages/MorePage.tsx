import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Settings,
  Send,
  Megaphone,
  Workflow,
  Bot,
  Sparkles,
  MessagesSquare,
  BarChart3,
  Activity,
  ShieldCheck,
  LineChart,
  LogOut,
  User as UserIcon,
  Bell,
  Handshake,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { isOryonStaff } from '@/lib/roleHelpers'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { cn } from '@/lib/utils'

interface Item {
  href: string
  label: string
  description?: string
  Icon: LucideIcon
  superAdminOnly?: boolean
  /** D2 (SCRUM-935): item só existe com o gate de múltiplos funis ligado (SCRUM-498). */
  requiresMultiPipeline?: boolean
}

interface Section {
  label: string
  items: Item[]
}

const SECTIONS: Section[] = [
  {
    label: 'Trabalho',
    items: [
      { href: '/pipelines', label: 'Funis', description: 'Board e relatorios de negocios', Icon: Handshake, requiresMultiPipeline: true },
      { href: '/team', label: 'Nexus', description: 'Chat interno da equipe', Icon: MessagesSquare },
      { href: '/dashboard', label: 'Dashboard', description: 'KPIs e relatorios', Icon: BarChart3 },
      { href: '/campaigns', label: 'Disparos', description: 'Campanhas em massa', Icon: Send },
      { href: '/marketing', label: 'Marketing', description: 'Meta Ads e funil', Icon: Megaphone },
      { href: '/automations', label: 'Automacoes', description: 'Fluxos automaticos', Icon: Workflow },
      { href: '/agents', label: 'Agentes IA', description: 'Assistentes autonomos', Icon: Bot },
      { href: '/copilot', label: 'Copilot AI', description: 'Analise com IA', Icon: Sparkles },
    ],
  },
  {
    label: 'Configuracao',
    items: [
      { href: '/settings', label: 'Configuracoes', description: 'Conta, equipe, integracoes', Icon: Settings },
    ],
  },
  {
    label: 'Oryon staff',
    items: [
      { href: '/admin/audit', label: 'Auditoria', Icon: Activity, superAdminOnly: true },
      { href: '/admin/ai-observability', label: 'AI Observability', Icon: LineChart, superAdminOnly: true },
      { href: '/admin/ai-executions', label: 'AI Executions', Icon: Bot, superAdminOnly: true },
      { href: '/admin/skill-templates', label: 'Skills', Icon: ShieldCheck, superAdminOnly: true },
    ],
  },
]

function ItemRow({ item }: { item: Item }) {
  return (
    <Link
      to={item.href}
      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-900 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center flex-shrink-0">
        <item.Icon className="w-5 h-5 text-surface-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-100 truncate">{item.label}</p>
        {item.description && (
          <p className="text-xs text-surface-500 truncate">{item.description}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-surface-600 flex-shrink-0" />
    </Link>
  )
}

export function MorePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = isOryonStaff(user?.role)
  const { isRouteVisible } = useFeatureVisibility()
  const multiPipeline = useMultiPipeline()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const visibleSections = SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.superAdminOnly && !isSuperAdmin) return false
        if (item.requiresMultiPipeline && !multiPipeline) return false
        return isRouteVisible(item.href)
      }),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <MobilePageHeader title="Mais" titleImage="/oryon-wordmark.png" />
      <div className="flex-1 overflow-y-auto">
        {/* User card */}
        {user && (
          <div className="px-4 py-4 border-b border-surface-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-6 h-6 text-surface-950" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-50 truncate">
                  {user.firstName} {user.lastName ?? ''}
                </p>
                <p className="text-xs text-surface-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sections */}
        {visibleSections.map((section) => (
          <div key={section.label} className="border-b border-surface-800/60 py-1">
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-surface-500">
              {section.label}
            </p>
            <div className="flex flex-col">
              {section.items.map((item) => (
                <ItemRow key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}

        {/* Settings rapidas + logout */}
        <div className="border-b border-surface-800/60 py-1">
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-surface-500">
            Voce
          </p>
          <Link
            to="/settings/notifications"
            className="flex items-center gap-3 px-4 py-3 hover:bg-surface-900 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-surface-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-100">Preferencias de notificacao</p>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-600 flex-shrink-0" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-4 py-3 w-full text-left',
              'hover:bg-danger/10 transition-colors',
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-danger">Sair</p>
            </div>
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}
