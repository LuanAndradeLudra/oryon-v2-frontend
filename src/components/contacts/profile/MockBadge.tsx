import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Selo "Dados de exemplo" — obrigatório em toda seção da página de perfil que
 * ainda usa dados simulados (fase frontend-first). Segue o PADRÃO SATURADO
 * (.color-chip, como as tags/estágios/status): fundo cheio + texto branco,
 * com a cor warning (token theme-aware). A borda tracejada branca mantém o
 * sinal visual de "provisório/exemplo" sobre o preenchimento saturado.
 */
export function MockBadge({ className }: { className?: string }) {
  return (
    <span
      title="Dados simulados para validação do layout — serão conectados ao backend."
      style={{ ['--chip']: 'var(--color-warning)', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.5)' } as React.CSSProperties}
      className={cn(
        'color-chip inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
        className,
      )}
    >
      <FlaskConical className="w-2.5 h-2.5" />
      Exemplo
    </span>
  )
}
