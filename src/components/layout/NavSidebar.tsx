import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Home,
  Send,
  Sparkles,
  Megaphone,
  Workflow,
  MessagesSquare,
  Bot,
  ShieldCheck,
  Activity,
  LineChart,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Sidebar, SidebarBody, SidebarLink, SidebarSectionLabel, useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { isOryonStaff as isOryonStaffHelper } from '@/lib/roleHelpers'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { useInternalChat } from '@/contexts/InternalChatContext'
import { conversationsApi } from '@/services/api'
import { isRouteVisible, isFeatureVisible } from '@/config/featureFlags'

interface NavSidebarProps {
  totalUnread?: number
  currentUser?: { firstName: string; lastName: string; avatarUrl?: string }
  /**
   * When true, renders fully expanded (no hover-collapse) and overrides the
   * primitive's fixed width to fill the parent. Used by AppShell to embed the
   * sidebar inside a mobile drawer.
   */
  forceExpanded?: boolean
}

function LogoSection() {
  const { open, animate } = useSidebar()
  return (
    <div className="flex items-center gap-3 px-3 mb-2 flex-shrink-0">
      <img
        src="/oryon-logo.svg"
        alt="Oryon"
        className="w-9 h-9 flex-shrink-0 select-none"
        draggable={false}
      />
      <AnimatePresence>
        {(!animate || open) && (
          <motion.img
            src="/oryon-wordmark.png"
            alt="Oryon"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="h-[27px] w-auto select-none"
            draggable={false}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function UserFooter({
  currentUser,
  onLogout,
}: {
  currentUser?: NavSidebarProps['currentUser']
  onLogout: () => void
}) {
  const { open, animate } = useSidebar()
  const { user } = useAuth()

  const name = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : user
      ? `${user.firstName} ${user.lastName}`
      : ''

  return (
    <div className="flex flex-col gap-0.5">
      <div className="mx-3 mb-2 border-t border-surface-800/60" />

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full text-left"
      >
        <span className="flex items-center gap-3 px-3 py-2 rounded-xl w-full transition-colors duration-150 text-danger hover:bg-danger/10">
          <span className="relative flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </span>
          <AnimatePresence>
            {(!animate || open) && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-medium whitespace-pre overflow-hidden"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>

      {/* User profile */}
      {name && (
        <div className="flex items-center gap-3 px-3 py-3 mt-1">
          <Avatar
            name={name}
            imageUrl={currentUser?.avatarUrl}
            size="sm"
          />
          <AnimatePresence>
            {(!animate || open) && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col min-w-0 overflow-hidden"
              >
                <span className="text-xs font-semibold text-surface-200 truncate whitespace-pre">
                  {name}
                </span>
                {user?.email && (
                  <span className="text-[10px] text-surface-600 truncate whitespace-pre">
                    {user.email}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export function NavSidebar({ totalUnread = 0, currentUser, forceExpanded = false }: NavSidebarProps) {
  const [open, setOpen] = useState(false)
  const [whatsappUnread, setWhatsappUnread] = useState(totalUnread)
  const location = useLocation()
  const navigate = useNavigate()
  const activeHref = '/' + location.pathname.split('/')[1]
  const { user, organizationConfigured, logout } = useAuth()
  const { checklist } = useSetupChecklist(user?.id)
  const { vocab } = useTenantVocab()
  const { totalUnread: internalUnread } = useInternalChat()

  const refreshUnread = useCallback(() => {
    conversationsApi.unreadTotal()
      .then((res) => setWhatsappUnread(res.data.totalUnread ?? 0))
      .catch(() => {})
  }, [])

  // Re-fetch unread count whenever route changes (user opens a conversation)
  useEffect(() => {
    refreshUnread()
  }, [location.pathname, totalUnread, refreshUnread])

  // Listen for real-time unread updates via socket
  useEffect(() => {
    let socket: ReturnType<typeof import('@/services/socket').connectSocket> | null = null
    import('@/services/socket').then(({ connectSocket }) => {
      socket = connectSocket()
      socket.on('unread:update', (payload: { total: number }) => {
        setWhatsappUnread(payload.total)
      })
      // Update unread count when new messages come in (via conversation:updated)
      socket.on('conversation:updated', () => {
        refreshUnread()
      })
    })
    return () => {
      socket?.off('unread:update')
      socket?.off('conversation:updated')
    }
  }, [refreshUnread])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const geralItems = [
    { icon: <Home className="w-4.5 h-4.5" />,          label: 'Home',       href: '/home' },
    {
      icon: <BarChart3 className="w-4.5 h-4.5" />,
      label: 'Dashboard',
      href: '/dashboard',
      nudge: !checklist.dashboard ? 'Novo' : undefined,
    },
    {
      icon: <MessageSquare className="w-4.5 h-4.5" />,
      label: 'Conversas',
      href: '/conversations',
      badge: whatsappUnread > 0 ? whatsappUnread : undefined,
    },
    {
      icon: <Users className="w-4.5 h-4.5" />,
      label: vocab.contacts,
      href: '/contacts',
      nudge: !organizationConfigured ? 'Configurar' : undefined,
    },
  ].filter((item) => isRouteVisible(item.href))

  const ferramentasItems = [
    {
      icon: <Send className="w-4.5 h-4.5" />,
      label: 'Disparos',
      href: '/campaigns',
      nudge: !checklist.campaigns ? 'Novo' : undefined,
    },
    { icon: <Megaphone className="w-4.5 h-4.5" />, label: 'Marketing',   href: '/marketing' },
    { icon: <Workflow className="w-4.5 h-4.5" />,   label: 'Automações',  href: '/automations' },
    { icon: <Bot className="w-4.5 h-4.5" />,        label: 'Agentes IA',  href: '/agents' },
    { icon: <Sparkles className="w-4.5 h-4.5" />,   label: 'Copilot AI', href: '/copilot',
      nudge: !checklist.copilot ? 'Setup' : undefined },
  ].filter((item) => isRouteVisible(item.href))

  const internalChatItem = {
    icon: <MessagesSquare className="w-4.5 h-4.5" />,
    label: 'Nexus',
    href: '/team',
    badge: internalUnread > 0 ? internalUnread : undefined,
  }
  const internalChatVisible = isRouteVisible(internalChatItem.href)
  const settingsVisible = isRouteVisible('/settings')
  // Oryon staff only — never shown to a customer's business_admin even if
  // they discover the URL (the route guard + agent-server gate also block them).
  const isOryonStaff = isOryonStaffHelper(user?.role)

  // When forceExpanded is true, the Sidebar primitive renders at fixed 228px
  // (via inline style). The wrapper className `[&_.nav-sidebar]:!w-full`
  // overrides that inline width so the sidebar fills its parent — used when
  // embedded in a mobile drawer that is wider than 228px.
  const sidebarOpen = forceExpanded ? true : open
  const sidebarSetOpen = forceExpanded ? () => {} : setOpen
  const sidebarAnimate = !forceExpanded

  const body = (
    <Sidebar open={sidebarOpen} setOpen={sidebarSetOpen} animate={sidebarAnimate}>
      <SidebarBody className="justify-between">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <LogoSection />

          {/* GERAL */}
          {geralItems.length > 0 && (
            <>
              <SidebarSectionLabel label="Geral" />
              <nav className="flex flex-col gap-0.5 px-1.5">
                {geralItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={activeHref === item.href}
                    badge={item.badge}
                    nudge={item.nudge}
                  />
                ))}
              </nav>
            </>
          )}

          {/* Chat Interno */}
          {internalChatVisible && (
            <nav className="flex flex-col gap-0.5 px-1.5 mb-1">
              <SidebarLink
                href={internalChatItem.href}
                icon={internalChatItem.icon}
                label={internalChatItem.label}
                badge={internalChatItem.badge}
                active={activeHref === '/team'}
              />
            </nav>
          )}

          {/* FERRAMENTAS */}
          {ferramentasItems.length > 0 && (
            <>
              <SidebarSectionLabel label="Ferramentas" />
              <nav className="flex flex-col gap-0.5 px-1.5">
                {ferramentasItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={activeHref === item.href}
                    nudge={item.nudge}
                  />
                ))}
              </nav>
            </>
          )}

          {/* ORYON (super_admin only) — gated by `oryonStaffSidebar` flag for
              temporary hiding. When the flag is false, the whole section
              disappears from the menu but routes (/admin/*) still work via
              direct URL — matches the pattern of every other flag here. */}
          {isOryonStaff && isFeatureVisible('oryonStaffSidebar') && (
            <>
              <SidebarSectionLabel label="Oryon" />
              <nav className="flex flex-col gap-0.5 px-1.5">
                <SidebarLink
                  href="/admin/skill-templates"
                  icon={<ShieldCheck className="w-4.5 h-4.5" />}
                  label="Skills"
                  active={activeHref.startsWith('/admin/skill')}
                />
                <SidebarLink
                  href="/admin/agents"
                  icon={<Bot className="w-4.5 h-4.5" />}
                  label="Agentes (cross-tenant)"
                  active={activeHref.startsWith('/admin/agents')}
                />
                <SidebarLink
                  href="/admin/audit"
                  icon={<Activity className="w-4.5 h-4.5" />}
                  label="Auditoria"
                  active={activeHref === '/admin/audit'}
                />
                <SidebarLink
                  href="/admin/ai-observability"
                  icon={<LineChart className="w-4.5 h-4.5" />}
                  label="AI Observability"
                  active={activeHref === '/admin/ai-observability'}
                />
                <SidebarLink
                  href="/admin/ai-executions"
                  icon={<Bot className="w-4.5 h-4.5" />}
                  label="AI Executions"
                  active={activeHref === '/admin/ai-executions'}
                />
              </nav>
            </>
          )}

          {/* CONFIGURAÇÕES */}
          {settingsVisible && (
            <>
              <SidebarSectionLabel label="Configurações" />
              <nav className="flex flex-col gap-0.5 px-1.5">
                <SidebarLink
                  href="/settings"
                  icon={<Settings className="w-4.5 h-4.5" />}
                  label="Configurações"
                  active={activeHref === '/settings'}
                  nudge={(!checklist.company || !checklist.profile) ? 'Setup' : undefined}
                />
              </nav>
            </>
          )}
        </div>

        {/* User footer */}
        <UserFooter currentUser={currentUser} onLogout={handleLogout} />
      </SidebarBody>
    </Sidebar>
  )

  if (forceExpanded) {
    return <div className="h-full w-full [&_.nav-sidebar]:!w-full">{body}</div>
  }
  return body
}
