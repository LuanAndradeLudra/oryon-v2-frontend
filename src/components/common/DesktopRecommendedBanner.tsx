import { Monitor, X } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'

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
    <Banner
      variant="warning"
      icon={<Monitor className="w-4 h-4 mt-0.5 flex-shrink-0" />}
      className="rounded-none border-x-0 border-t-0"
      action={
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar aviso"
          className="p-0.5 hover:opacity-70 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      }
    >
      <p className="leading-relaxed">{message}</p>
    </Banner>
  )
}
