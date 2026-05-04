import { useNavigate } from 'react-router-dom'
import { Loader2, Bell, Check } from 'lucide-react'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'
import { formatRelativeTime, cn } from '@/lib/utils'

export function NotificationsPage() {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const handleSelect = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await markAsRead(n.id)
      } catch {
        // silencioso — UI ja foi marcada como lida e proximo reload corrige
      }
    }
    if (n.link) navigate(n.link)
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <MobilePageHeader
        title="Notificações"
        onBack={() => navigate(-1)}
        hideBell
        rightActions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="px-2 h-9 flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Check className="w-4 h-4" />
              Marcar todas
            </button>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
            <span className="text-xs text-surface-500">Carregando...</span>
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(n)}
                  className={cn(
                    'w-full text-left flex items-start gap-3 px-4 py-3 border-b border-surface-800/40 transition-colors',
                    n.isRead
                      ? 'bg-black hover:bg-surface-900'
                      : 'bg-surface-900/40 hover:bg-surface-900',
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 w-2 h-2 rounded-full mt-2',
                      n.isRead ? 'bg-transparent' : 'bg-brand-500',
                    )}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold text-surface-100 leading-snug flex-1 truncate">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-surface-500 flex-shrink-0 mt-0.5 whitespace-nowrap">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    {n.description && (
                      <p className="text-xs text-surface-400 mt-1 leading-relaxed line-clamp-2">
                        {n.description}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center">
        <Bell className="w-6 h-6 text-surface-500" />
      </div>
      <p className="text-sm font-medium text-surface-200">Nenhuma notificação</p>
      <p className="text-xs text-surface-500 max-w-xs leading-relaxed">
        Você verá aqui novas mensagens, atribuições e eventos do sistema.
      </p>
    </div>
  )
}
