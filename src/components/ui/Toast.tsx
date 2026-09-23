import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Toast, ToastType } from '@/hooks/useToast'

// spec/1a-primitivos.md TOAST-01..03 (SCRUM-1097): superfície INVERTIDA única
// (`--toast`/`--toasttx`, troca de polaridade com o tema), 40px, raio 8,
// 12.5/500, sombra de overlay; o tipo aparece só no disco de 16px com o
// ícone de 10px — não no fundo inteiro como antes.
const config: Record<ToastType, { icon: React.ElementType; disc: string }> = {
  success: { icon: Check,         disc: 'var(--color-success)' },
  error:   { icon: X,             disc: 'var(--color-danger)' },
  info:    { icon: Info,          disc: 'var(--color-brand-500)' },
  warning: { icon: AlertTriangle, disc: 'var(--color-warning)' },
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const [visible, setVisible] = useState(true)
  const latest = toasts[toasts.length - 1]

  // Trigger a brief exit/enter animation when a new toast arrives
  useEffect(() => {
    if (!latest) return
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [latest?.id])

  if (!latest) return null
  if (typeof document === 'undefined') return null

  const { icon: Icon, disc } = config[latest.type]
  // Live region (AUDITORIA-A11Y-CAMADAS.md: o toast nunca era anunciado).
  // Erro interrompe (`alert`/assertive); o resto é `status`/polite. A região
  // precisa existir antes do texto trocar, por isso fica no wrapper fixo.
  const isError = latest.type === 'error'

  // Renderizado via Portal em document.body para escapar de qualquer ancestor
  // com `transform` (framer-motion no painel de contato, drawers, etc) — sem
  // o portal, position:fixed fica preso ao motion.div e o toast some ou
  // aparece no lugar errado em mobile.
  return createPortal(
    // Mobile: bottom-24 (96px) para ficar ACIMA da BottomTabBar (~56px+safe-area).
    // Desktop (md+): bottom-5 original.
    // inset-x-5 (não só right-5): sem uma borda esquerda também amarrada à
    // viewport, o toast (min-w-[260px]) ficava quase colado na borda esquerda
    // em telas de 320px — margem simétrica dos dois lados agora.
    <div
      className="fixed bottom-24 md:bottom-5 inset-x-5 md:left-auto z-[200] flex items-end justify-end pointer-events-none"
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div
        className={cn(
          'flex items-center gap-2.5 h-10 px-3 rounded-lg min-w-[260px] max-w-[400px] pointer-events-auto',
          'bg-[var(--toast)] text-[var(--toasttx)] shadow-[var(--shadow-overlay)]',
          'transition-all duration-200',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95',
        )}
      >
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: disc }}
          aria-hidden="true"
        >
          <Icon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
        <span className="text-[12.5px] font-medium flex-1">{latest.message}</span>
        {latest.action && (
          <button
            type="button"
            onClick={() => { latest.action?.onClick(); onDismiss(latest.id) }}
            className="ml-2 text-[12.5px] font-semibold text-brand-500 hover:brightness-110 whitespace-nowrap"
            data-testid="toast-action"
          >
            {latest.action.label}
          </button>
        )}
        <button
          onClick={() => onDismiss(latest.id)}
          aria-label="Fechar"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
