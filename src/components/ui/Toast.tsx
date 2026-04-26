import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Toast, ToastType } from '@/hooks/useToast'

const config: Record<ToastType, { icon: React.ElementType; classes: string }> = {
  success: { icon: CheckCircle, classes: 'bg-emerald-600 text-white' },
  error:   { icon: XCircle,     classes: 'bg-danger text-white' },
  info:    { icon: Info,        classes: 'bg-brand-600 text-surface-950' },
  warning: { icon: AlertTriangle, classes: 'bg-amber-500 text-white' },
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

  const { icon: Icon, classes } = config[latest.type]

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex items-end justify-end">
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl min-w-[260px] max-w-[400px]',
          'transition-all duration-200',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95',
          classes,
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{latest.message}</span>
        <button
          onClick={() => onDismiss(latest.id)}
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
