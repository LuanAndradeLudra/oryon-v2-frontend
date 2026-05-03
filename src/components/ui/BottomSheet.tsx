import type { ReactNode } from 'react'
import { Drawer } from './Drawer'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 'half' = 50vh, 'tall' = 90vh. Default 'half'. */
  size?: 'half' | 'tall'
  className?: string
  ariaLabel?: string
  /** Hide the visible drag handle at the top. Default false (handle shown). */
  hideHandle?: boolean
}

const SIZE_CLASS = {
  half: 'h-[50vh]',
  tall: 'h-[90vh]',
} as const

export function BottomSheet({
  open,
  onClose,
  children,
  size = 'half',
  className,
  ariaLabel = 'Bottom sheet',
  hideHandle = false,
}: BottomSheetProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="bottom"
      ariaLabel={ariaLabel}
      className={cn(SIZE_CLASS[size], className)}
    >
      {!hideHandle && (
        <div className="flex-shrink-0 flex justify-center py-3" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-surface-600" />
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
    </Drawer>
  )
}
