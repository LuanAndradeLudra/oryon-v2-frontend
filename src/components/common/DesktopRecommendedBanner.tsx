import { Monitor, X } from 'lucide-react'

interface DesktopRecommendedBannerProps {
  visible: boolean
  onDismiss: () => void
  message?: string
}

const DEFAULT_MESSAGE =
  'Esta tela funciona melhor no desktop. Use seu computador para configurar com tranquilidade.'

export function DesktopRecommendedBanner({
  visible,
  onDismiss,
  message = DEFAULT_MESSAGE,
}: DesktopRecommendedBannerProps) {
  if (!visible) return null

  return (
    <div
      role="status"
      className="flex items-start gap-3 px-4 py-3 bg-amber-950/40 border-b border-amber-700/40 text-amber-200 text-xs"
    >
      <Monitor className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p className="flex-1 leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dispensar aviso"
        className="flex-shrink-0 p-0.5 hover:opacity-70 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
