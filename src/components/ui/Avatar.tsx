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
        /**
         * Fallback MONOCROMÁTICO.
         *
         * Aqui havia oito cores sorteadas por `name.charCodeAt(0) % 8` — o
         * PRIMEIRO caractere, e só ele. Todo "A" saía índigo, todo "M"
         * esmeralda, e "Zeca" colidia com "Bruno" (90 % 8 = 66 % 8). Numa
         * lista ordenada por nome isso produzia faixas da mesma cor, e a cor
         * duplicava exatamente a informação que as iniciais já mostram.
         *
         * Ou seja: era a maior mancha de cor da tela (círculo de 40 px, vinte
         * vezes na lista de conversas) gastando o recurso mais escasso da
         * interface com zero informação. Cor é para ESTADO — a urgência, o
         * não lido, o alerta. Identidade se resolve com forma e texto.
         *
         * Foto continua sendo foto: quando existe `imageUrl`, nada disto vale.
         */
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold',
            'bg-surface-700 text-surface-300',
            sizes[size],
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
