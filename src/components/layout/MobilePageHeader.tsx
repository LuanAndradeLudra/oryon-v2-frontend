import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell } from 'lucide-react'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'

interface MobilePageHeaderProps {
  title: string
  /** Quando presente, renderiza esta imagem no lugar do título textual.
   *  Usado p.ex. em /more para mostrar o wordmark Oryon. */
  titleImage?: string
  /** When provided, mostra um botão de voltar a esquerda em vez do espaço vazio. */
  onBack?: () => void
  /** Slot a direita, antes do sino de notificações. Use para ícone de busca,
   *  filtro, ou ações específicas da página. */
  rightActions?: ReactNode
  /** Esconder o sino de notificações (raro — útil em telas onde o sino seria
   *  redundante, ex.: o próprio dropdown de notificações). */
  hideBell?: boolean
  className?: string
}

export function MobilePageHeader({
  title,
  titleImage,
  onBack,
  rightActions,
  hideBell = false,
  className,
}: MobilePageHeaderProps) {
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()

  return (
    <header
      className={cn(
        'flex-shrink-0 pt-safe px-3 flex items-center gap-2 bg-black border-b border-surface-800/60',
        className,
      )}
      style={{ minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label="Ir para Home"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-800 transition-colors flex-shrink-0"
        >
          <img
            src="/oryon-logo.svg"
            alt="Oryon"
            className="w-7 h-7 select-none"
            draggable={false}
          />
        </button>
      )}

      {titleImage ? (
        <div className="flex-1 min-w-0 flex items-center">
          <img
            src={titleImage}
            alt={title}
            className="h-[20px] w-auto select-none"
            draggable={false}
          />
        </div>
      ) : (
        <h1 className="flex-1 min-w-0 text-base font-semibold text-surface-50 truncate">
          {title}
        </h1>
      )}

      {rightActions}

      {!hideBell && (
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label="Notificações"
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors flex-shrink-0"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-danger text-white text-[9px] font-bold leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </header>
  )
}
