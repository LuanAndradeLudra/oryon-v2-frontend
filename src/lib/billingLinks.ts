// ─── Links para a tela de cobrança (CL5) ──────────────────────────────────────
// Com `VITE_SETTINGS_BILLING` desligada, /settings/billing redireciona para
// "Minha conta" (SettingsPage). Oferecer botão/link para lá mandaria o cliente
// para a tela errada — por isso todo atalho de cobrança passa por aqui e some
// quando a tela não existe. Lido na hora da chamada (não no import) para que os
// testes consigam ligar/desligar a flag.

import { isFeatureVisible } from '@/config/featureFlags'

export const BILLING_SETTINGS_PATH = '/settings/billing'

/** A tela Configurações > Plano e cobrança está habilitada neste build? */
export function billingSettingsEnabled(userEmail?: string | null): boolean {
  return isFeatureVisible('settingsBilling', userEmail)
}

/**
 * Destino do link de cobrança, ou `null` quando a tela está desligada (não
 * mostrar o link). `path` permite o deep link de uma fatura
 * (`/settings/billing?invoice=…`).
 */
export function billingHref(path: string = BILLING_SETTINGS_PATH): string | null {
  return billingSettingsEnabled() ? path : null
}

/**
 * Link de notificação pode ser aberto? O backend manda `/settings/billing?…`
 * nos avisos de cobrança mesmo com a tela desligada no frontend.
 */
export function notificationLinkAllowed(link: string): boolean {
  return !link.startsWith(BILLING_SETTINGS_PATH) || billingSettingsEnabled()
}
