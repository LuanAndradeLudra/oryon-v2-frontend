import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Archive, Settings2 } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'
import { emptyStateFor } from '@/lib/notificationsUx'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { CATEGORY_CHIPS } from '@/components/notifications/notificationsMeta'
import { cn } from '@/lib/utils'

// SCRUM-1097 (23/09) — reescrita pra paridade com o popover do sino
// (TopBar.tsx): mesmo NotificationItem, mesmo hook completo (antes esta
// pagina nem usava loadMore/hasMore/arquivar/filtro — inventario do Farol).
// A moldura (cabeçalho, filtros) NÃO copia o markup do popover — são
// superfícies diferentes (painel de 400px vs página cheia) — só a peça de
// item e os dados são compartilhados.

// ─── Agrupamento por dia ─────────────────────────────────────────────────────
// "Hoje" / "Ontem" / data absoluta (dd 'de' MMMM). Agrupa itens adjacentes,
// preservando a ordem (a lista já chega ordenada por createdAt desc). Mais
// granular que os 4 baldes do popover (Hoje/Ontem/Esta semana/Anteriores) —
// deliberado: aqui é a página com mais espaço e mais histórico, então vale
// manter a data exata em vez de amontoar tudo antes da semana num "Anteriores".

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

type NotifFilter = 'all' | 'unread'

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
    setFilterTypes,
    showArchived,
    setShowArchived,
  } = useNotifications()

  // Aba lida/não-lida é filtro client-side sobre a lista já buscada (mesma
  // lógica do popover); a categoria já vai pro backend via setFilterTypes,
  // pra não refazer o fetch a cada toggle de aba.
  const [filter, setFilter] = useState<NotifFilter>('unread')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications),
    [filter, notifications],
  )

  const handleCategoryClick = useCallback((chip: typeof CATEGORY_CHIPS[number]) => {
    setActiveCategory(chip.key)
    setFilterTypes(chip.types)
  }, [setFilterTypes])

  // Tocar no disco de tipo de um item filtra a lista inteira por aquele
  // tipo — mesma fisga de drill-down rápido do popover.
  const handleItemCategoryClick = useCallback((types: string[]) => {
    setActiveCategory('custom')
    setFilterTypes(types)
  }, [setFilterTypes])

  const handleSelect = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await markAsRead(n.id)
      } catch {
        // silencioso — UI ja foi marcada como lida e proximo reload corrige
      }
    }
    if (isValidLink(n.link)) navigate(n.link!)
    // Notificações agrupadas sem link próprio (metadata rico, ex. vários
    // contatos) abrem um modal de detalhe no popover — essa peça é local ao
    // TopBar.tsx, não foi extraída. Aqui elas só marcam como lida por ora.
  }

  const empty = emptyStateFor(activeCategory, filter, showArchived)

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
              onClick={() => navigate('/settings/notifications')}
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
        <div className="flex-shrink-0 px-3 pt-2.5 pb-2 flex flex-col gap-2 border-b border-surface-700">
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
          {/* Categorias em faixa horizontal rolável — no popover de 400px cabe
              um Dropdown; numa página de largura cheia, a faixa de chips fica
              tudo visível de cara, sem esconder atrás de mais um toque. */}
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-3 px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORY_CHIPS.map((chip) => {
              const active = activeCategory === chip.key
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => handleCategoryClick(chip)}
                  aria-pressed={active}
                  className={cn(
                    'flex-shrink-0 h-9 px-3 rounded-sm border text-[12.5px] font-medium transition-colors whitespace-nowrap',
                    active
                      ? 'border-[var(--bd2)] bg-surface-800 text-surface-50 font-semibold'
                      : 'border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)]',
                  )}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1" role="list">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Spinner className="w-5 h-5 text-brand-400" />
            <span className="text-xs text-surface-500">Carregando...</span>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Bell} title={empty.title} hint={empty.hint} className="m-4" />
        ) : (
          <>
            {groupByDay(visible).map((group) => (
              <section key={group.label}>
                <h2 className="px-4 pt-3 pb-1 text-[11px] font-medium text-surface-500">
                  {group.label}
                </h2>
                <div>
                  {group.items.map((n) => (
                    <NotificationItem
                      key={n.id}
                      n={n}
                      onClick={() => handleSelect(n)}
                      onArchive={!showArchived ? () => archive(n.id) : undefined}
                      onMarkUnread={!showArchived && n.isRead ? () => markAsUnread(n.id) : undefined}
                      onCategoryClick={handleItemCategoryClick}
                    />
                  ))}
                </div>
              </section>
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
