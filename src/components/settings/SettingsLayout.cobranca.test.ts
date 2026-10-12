import { describe, it, expect, vi } from 'vitest'

// A aba de cobrança também depende do flag de build (VITE_SETTINGS_BILLING);
// aqui ela é tratada como ligada para testar só o flag do tenant.
vi.mock('@/config/featureFlags', async (original) => ({
  ...(await original<typeof import('@/config/featureFlags')>()),
  isRouteVisible: () => true,
}))

const { visibleSettingsNav } = await import('./SettingsLayout')
const secoes = (opts?: { cobrancaOculta?: boolean }) =>
  visibleSettingsNav('business_admin', opts).flatMap((d) => d.clusters.flatMap((c) => c.items.map((i) => i.section)))

// PO 12/10 — FF_OCULTAR_COBRANCA: cliente com cobrança fora do Oryon.
describe('visibleSettingsNav · cobrança oculta por tenant', () => {
  it('sem o flag, o dono vê "Plano & faturamento"', () => {
    expect(secoes()).toContain('billing')
    expect(secoes({ cobrancaOculta: false })).toContain('billing')
  })

  it('com o flag, a aba some e o resto continua', () => {
    const s = secoes({ cobrancaOculta: true })
    expect(s).not.toContain('billing')
    expect(s).toContain('account')
  })
})
