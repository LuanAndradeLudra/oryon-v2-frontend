import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  /** Selo textual ao lado do rótulo: "Obrigatório" (vermelho) ou "Opcional" (cinza). */
  requirement?: 'required' | 'optional'
  className?: string
  children: ReactNode
}

export function FormField({ label, error, hint, required, requirement, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
        {requirement === 'required' && (
          <span className="ml-2 text-[10px] font-semibold text-danger normal-case tracking-normal">
            Obrigatório
          </span>
        )}
        {requirement === 'optional' && (
          <span className="ml-2 text-[10px] font-medium text-surface-500 normal-case tracking-normal">
            Opcional
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-surface-500">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
