import { forwardRef, useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/Input'

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>

/**
 * Campo de senha com botão de mostrar/ocultar. O botão é FOCÁVEL (Tab alcança,
 * Enter/Espaço aciona — o antigo tinha tabIndex=-1, inacessível ao teclado) e
 * usa `aria-pressed` com rótulo fixo "Mostrar senha".
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className={`pr-11 ${className ?? ''}`} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label="Mostrar senha"
          aria-pressed={visible}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-sm text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
        >
          {visible
            ? <EyeOff className="w-4 h-4" strokeWidth={1.75} />
            : <Eye className="w-4 h-4" strokeWidth={1.75} />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
