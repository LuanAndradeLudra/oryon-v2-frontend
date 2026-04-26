import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  imageUrl?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  online?: boolean
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

const dotSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
}

// Deterministic color from name
function colorFromName(name: string) {
  const colors = [
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-teal-500', 'bg-emerald-500', 'bg-rose-500', 'bg-orange-500',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function Avatar({ name, imageUrl, size = 'md', online, className }: AvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className={cn('rounded-full object-cover', sizes[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white',
            sizes[size],
            colorFromName(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface-900',
            dotSizes[size],
            online ? 'bg-online' : 'bg-offline'
          )}
        />
      )}
    </div>
  )
}
