import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Users, BarChart3, Handshake, Menu } from 'lucide-react'
import { useEffect, useState, useCallback, useMemo, type ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { conversationsApi } from '@/services/api'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'

interface Tab {
  href: string
  label: string
  Icon: ComponentType<{ className?: string }>
  /** Match also nested rotas (ex.: /conversations/:id). */
  matchPrefix?: boolean
}

const BASE_TABS: Tab[] = [
  { href: '/conversations', label: 'Conversas', Icon: MessageSquare, matchPrefix: true },
  { href: '/contacts', label: 'Contatos', Icon: Users, matchPrefix: true },
  { href: '/dashboard', label: 'Relatórios', Icon: BarChart3, matchPrefix: true },
]

const NEGOCIOS_TAB: Tab = { href: '/pipelines', label: 'Negócios', Icon: Handshake, matchPrefix: true }

const MAIS_TAB: Tab = { href: '/more', label: 'Mais', Icon: Menu, matchPrefix: true }

function isActive(pathname: string, tab: Tab): boolean {
  if (tab.matchPrefix) return pathname === tab.href || pathname.startsWith(tab.href + '/')
  return pathname === tab.href
}

export function BottomTabBar() {
  const location = useLocation()
  const [unreadConversations, setUnreadConversations] = useState(0)
  // Negócios só entra na barra principal quando o tenant tem múltiplos funis
  // (mesmo gate do item "Funis" em MorePage — SCRUM-935/SCRUM-498); um único
  // funil não justifica um item de primeiro nível dedicado.
  const multiPipeline = useMultiPipeline()
  const TABS = useMemo(
    () => [...BASE_TABS, ...(multiPipeline ? [NEGOCIOS_TAB] : []), MAIS_TAB],
    [multiPipeline],
  )

  const refresh = useCallback(() => {
    conversationsApi
      .unreadTotal()
      .then((res) => setUnreadConversations(res.data.totalUnread ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
  }, [location.pathname, refresh])

  useEffect(() => {
    let socket: ReturnType<typeof import('@/services/socket').connectSocket> | null = null
    import('@/services/socket').then(({ connectSocket }) => {
      socket = connectSocket()
      socket.on('unread:update', (payload: { total: number }) => {
        setUnreadConversations(payload.total)
      })
      socket.on('conversation:updated', () => refresh())
    })
    return () => {
      socket?.off('unread:update')
      socket?.off('conversation:updated')
    }
  }, [refresh])

  return (
    <nav
      role="tablist"
      aria-label="NavegaÃ§Ã£o principal"
      className={cn(
        'flex-shrink-0 grid bg-surface-950 border-t border-surface-800/80 pb-[env(safe-area-inset-bottom)]',
        TABS.length === 5 ? 'grid-cols-5' : 'grid-cols-4',
      )}
    >
      {TABS.map((tab) => {
        const active = isActive(location.pathname, tab)
        const showBadge = tab.href === '/conversations' && unreadConversations > 0
        return (
          <Link
            key={tab.href}
            to={tab.href}
            role="tab"
            aria-selected={active}
            aria-label={tab.label}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 transition-colors min-h-[56px]',
              active ? 'text-brand-400' : 'text-surface-400 hover:text-surface-200',
            )}
          >
            <span className="relative flex items-center justify-center w-6 h-6">
              <tab.Icon className="w-5 h-5" />
              {showBadge && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-danger text-white text-[9px] font-bold leading-none">
                  {unreadConversations > 99 ? '99+' : unreadConversations}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
