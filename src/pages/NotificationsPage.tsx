import { useNavigate } from 'react-router-dom'
import { Loader2, Bell, Check } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'
import { formatRelativeTime, cn } from '@/lib/utils'

// ─── Agrupamento por dia ─────────────────────────────────────────────────────
// "Hoje" / "Ontem" / data absoluta (dd 'de' MMMM). Agrupa itens adjacentes,
// preservando a ordem (a lista já chega ordenada por createdAt desc).

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Hoje'
  if (isYesterday(date)) return 'Ontem'
  return format(date, "dd 'de' MMMM", { locale: ptBR })
}

function groupByDay(items: AppNotification[]): Array<{ label: string; items: AppNotification[] }> {
  const groups: Array<{ label: string; items: AppNotification[] }> = []
  for (const n of items) {
    const label = dayLabel(new Date(n.createdAt))
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(n)
    else groups.push({ label, items: [n] })
  }
  return groups
}

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
    <div className="flex flex-col h-full bg-surface-950">
      <MobilePageHeader
        title="Notificações"
        onBack={() => navigate(-1)}
        hideBell
        rightActions={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={() => markAllAsRead()}
            >
              Marcar todas
            </Button>
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
          <EmptyState
            icon={Bell}
            title="Nenhuma notificação"
            hint="Você verá aqui novas mensagens, atribuições e eventos do sistema."
            className="m-4"
          />
        ) : (
          groupByDay(notifications).map((group) => (
            <section key={group.label}>
              <h2 className="px-4 pt-4 pb-1.5 text-[11px] uppercase tracking-wide text-surface-500 font-semibold">
                {group.label}
              </h2>
              <ul className="flex flex-col">
                {group.items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(n)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 px-4 py-3 border-b border-surface-800/40 transition-colors',
                        n.isRead
                          ? 'bg-surface-950 hover:bg-surface-900'
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
            </section>
          ))
        )}
      </div>
    </div>
  )
}

