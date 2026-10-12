import type { ComponentType } from 'react'

/** Provedor de login social/SSO. `href` é o início do fluxo OAuth no backend. */
export interface SsoProvider {
  id: string
  /** Texto do botão, ex.: "Continuar com Google". */
  label: string
  /** Rota do backend que inicia o fluxo — `/auth/oauth/<provider>`. */
  href: string
  Icon?: ComponentType<{ className?: string }>
}

/**
 * VAZIO DE PROPÓSITO (09/2026): o backend não tem OAuth. Um botão de Google que
 * não faz nada seria um botão morto (P14), então nada renderiza — `SsoSlot` já
 * reserva o lugar (divisor "ou" + botões, depois do formulário).
 *
 * Para ligar: quando `/auth/oauth/<provider>` existir, adicione o provedor aqui
 * (ex.: `{ id: 'google', label: 'Continuar com Google', href: '/auth/oauth/google' }`).
 * Nenhuma outra mudança é necessária.
 */
export const SSO_PROVIDERS: SsoProvider[] = []
