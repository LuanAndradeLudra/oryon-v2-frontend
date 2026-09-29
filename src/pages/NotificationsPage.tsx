import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { comVolta } from '@/lib/voltarPara'
import { Bell, CheckCheck, Archive, Settings2, ChevronDown } from 'lucide-react'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'
import { emptyStateFor, normalizeNotificationLink } from '@/lib/notificationsUx'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { CATEGORY_CHIPS } from '@/components/notifications/notificationsMeta'
import { cn } from '@/lib/utils'

// SCRUM-1097 (23/09) — paridade com o popover do sino (TopBar.tsx): mesmo
// NotificationItem, mesmo hook completo e, desde a direção A do painel, as
// mesmas SEÇÕES POR CATEGORIA recolhíveis (mesma chave de localStorage).
// A moldura (cabeçalho da página, aba lida/não lida) NÃO copia o markup do
// popover — são superfícies diferentes (painel de 400px vs página cheia).

type NotifFilter = 'all' | 'unread'

/** Mesma chave do popover: recolher "Campanhas" num lugar vale no outro. */
const COLLAPSED_KEY = 'oryon:notif:collapsed'

/** Descarta link malformado/incompleto — mesma guarda do popover do sino
 *  (TopBar.tsx isValidLink), contra "/undefined" ou "/null" que às vezes
 *  escapam de metadata mal formado vindo do backend. */
function isValidLink(link: string | null | undefined): boolean {
  if (!link) return false
  const trimmed = link.trim()
  if (!trimmed.startsWith('/')) return false
  if (trimmed.includes('/undefined') || trimmed.includes('/null')) return false
  return true
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archive,
    loadMore,
    showArchived,
    setShowArchived,
  } = useNotifications()

  // Aba lida/não-lida é filtro client-side sobre a lista já buscada (mesma
  // lógica do popover).
  const [filter, setFilter] = useState<NotifFilter>('unread')

  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications),
    [filter, notifications],
  )

  // Urgentes primeiro, depois ordem de chegada (sort estável por índice) —
  // igual ao popover.
  const sortedVisible = useMemo(() => {
    const weight = (p?: string) => (p === 'urgent' ? 0 : p === 'low' ? 2 : 1)
    return visible
      .map((n, idx) => ({ n, idx }))
      .sort((a, b) => {
        const d = weight(a.n.priority) - weight(b.n.priority)
        return d !== 0 ? d : a.idx - b.idx
      })
      .map((x) => x.n)
  }, [visible])

  // Seções por categoria (Conversas, Equipe, Campanhas, Automações,
  // Segurança + "Outras" p/ tipo desconhecido), recolhíveis, com contagem.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '{}') } catch { return {} }
  })
  const toggleSection = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])
  const groups = useMemo(() => {
    const ordem = CATEGORY_CHIPS.filter((c) => c.key !== 'all')
    return ordem
      .map((c) => ({ key: c.key, label: c.label, items: sortedVisible.filter((x) => c.types.includes(x.type)) }))
      .concat([{ key: 'outros', label: 'Outras', items: sortedVisible.filter((x) => !ordem.some((c) => c.types.includes(x.type))) }])
      .filter((g) => g.items.length > 0)
  }, [sortedVisible])

  const handleSelect = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await markAsRead(n.id)
      } catch {
        // silencioso — UI ja foi marcada como lida e proximo reload corrige
      }
    }
    if (isValidLink(n.link)) navigate(normalizeNotificationLink(n.link!))
    // Notificações agrupadas sem link próprio (metadata rico, ex. vários
    // contatos) abrem um modal de detalhe no popover — essa peça é local ao
    // TopBar.tsx, não foi extraída. Aqui elas só marcam como lida por ora.
  }

  const empty = emptyStateFor('all', filter, showArchived)

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <MobilePageHeader
        title="Notificações"
        onBack={() => navigate(-1)}
        hideBell
        rightActions={
          <div className="flex items-center gap-0.5">
            {unreadCount > 0 && !showArchived && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<CheckCheck className="w-4 h-4" />}
                onClick={() => markAllAsRead()}
              >
                Marcar todas
              </Button>
            )}
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              title={showArchived ? 'Voltar às ativas' : 'Ver arquivadas'}
              aria-label={showArchived ? 'Voltar às ativas' : 'Ver arquivadas'}
              aria-pressed={showArchived}
              className={cn(
                'w-11 h-11 rounded-lg flex items-center justify-center transition-colors flex-shrink-0',
                showArchived ? 'text-surface-100 bg-[var(--sf2)]' : 'text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)]',
              )}
            >
              <Archive className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => navigate(comVolta('/settings/notifications', '/notifications', 'Voltar para as notificações'))}
              title="Preferências de notificação"
              aria-label="Preferências de notificação"
              className="w-11 h-11 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors flex-shrink-0"
            >
              <Settings2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        }
      />

      {!showArchived && (
        <div className="flex-shrink-0 px-3 pt-2.5 pb-2 border-b border-surface-700">
          <SegmentedControl
            size="md"
            label="Filtrar notificações"
            value={filter}
            onChange={(v) => setFilter(v as NotifFilter)}
            options={[
              { value: 'unread', label: 'Não lidas', count: unreadCount > 0 ? unreadCount : undefined },
              { value: 'all', label: 'Todas' },
            ]}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1" role="list">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Spinner className="w-5 h-5 text-brand-400" />
            <span className="text-xs text-surface-500">Carregando...</span>
          </div>
        ) : sortedVisible.length === 0 ? (
          <EmptyState icon={Bell} title={empty.title} hint={empty.hint} className="m-4" />
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.key}>
                {/* Cabeçalho da seção: no popover é h32 (ponteiro fino); aqui a
                    página é sempre toque, então o alvo é 44px. */}
                <button
                  type="button"
                  onClick={() => toggleSection(g.key)}
                  aria-expanded={!collapsed[g.key]}
                  className="w-full h-11 px-4 flex items-center gap-1.5 text-[11px] font-semibold text-surface-400 hover:text-surface-200 bg-surface-950 sticky top-0 z-10 transition-colors"
                >
                  <span>{g.label}</span>
                  <span className="font-medium text-surface-500 tabular-nums">· {g.items.filter((x) => !x.isRead).length || g.items.length}</span>
                  <ChevronDown className={cn('ml-auto w-3.5 h-3.5 text-surface-500 transition-transform', collapsed[g.key] && '-rotate-90')} strokeWidth={1.75} />
                </button>
                {!collapsed[g.key] && g.items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onClick={() => handleSelect(n)}
                    onArchive={!showArchived ? () => archive(n.id) : undefined}
                    onMarkUnread={!showArchived && n.isRead ? () => markAsUnread(n.id) : undefined}
                  />
                ))}
              </div>
            ))}
            {hasMore && (
              <div className="py-3 flex justify-center">
                <Button size="sm" variant="ghost" onClick={() => loadMore()} disabled={loadingMore}>
                  {loadingMore ? 'Carregando…' : 'Carregar mais'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
