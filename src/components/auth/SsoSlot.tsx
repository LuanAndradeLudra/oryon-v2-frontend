import { Button } from '@/components/ui/Button'
import { SSO_PROVIDERS } from './ssoProviders'

/**
 * Lugar reservado para login social, depois do formulário: divisor "ou" +
 * um botão por provedor. Sem provedores (hoje), não renderiza nada — nunca um
 * botão que não funciona.
 */
export function SsoSlot() {
  if (SSO_PROVIDERS.length === 0) return null
  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-xs text-surface-500" role="separator" aria-label="ou">
        <span className="h-px flex-1 bg-surface-700" />
        <span>ou</span>
        <span className="h-px flex-1 bg-surface-700" />
      </div>
      <div className="mt-5 flex flex-col gap-2">
        {SSO_PROVIDERS.map(({ id, label, href, Icon }) => (
          <Button
            key={id}
            type="button"
            variant="neutral"
            size="lg"
            className="w-full"
            leftIcon={Icon ? <Icon className="w-4 h-4" /> : undefined}
            onClick={() => window.location.assign(href)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
