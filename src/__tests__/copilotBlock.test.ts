// ─── Bloqueio do Copilot: mensagem por causa e por papel (SCRUM-804) ────────
//
// Dois defeitos são fixados aqui. O primeiro é o que a história descreve: toda
// causa produzia "Créditos esgotados", inclusive contrato vencido.
//
// O segundo é mais silencioso — a mensagem antiga dizia "Atualize seu plano"
// para todo mundo, e desde a SCRUM-694 a aba de billing exige business_admin.
// Ou seja: mandava a maior parte do time fazer algo que a API recusaria.
import { describe, it, expect } from 'vitest'
import { CopilotBlockedError, describeCopilotBlock } from '@/lib/copilotBlock'

const balance = () => new CopilotBlockedError('Os créditos do plano acabaram.', 'balance', 'no_credits')
const entitlement = () => new CopilotBlockedError('O contrato venceu.', 'entitlement', 'contract_expired')

describe('quem não administra o plano recebe orientação, não uma promessa', () => {
  // `admin` é o caso que dói: tem cara de quem pode tudo, e é exatamente o
  // papel que a SCRUM-694 tirou das rotas de dinheiro.
  it.each(['admin', 'supervisor', 'agent'])('%s não recebe link de contato', (role) => {
    const n = describeCopilotBlock(balance(), role)
    expect(n.action).toBeUndefined()
    expect(n.guidance).toContain('responsável pela conta')
  })

  it('a causa continua sendo dita — só a ação é que muda', () => {
    expect(describeCopilotBlock(entitlement(), 'agent').cause).toBe('O contrato venceu.')
  })
})

describe('quem administra recebe um caminho', () => {
  it.each(['business_admin', 'super_admin'])('%s recebe link de contato', (role) => {
    expect(describeCopilotBlock(balance(), role).action?.href).toContain('mailto:')
  })

  it('falta de saldo e assinatura irregular levam a conversas diferentes', () => {
    const a = describeCopilotBlock(balance(), 'business_admin').action?.href
    const b = describeCopilotBlock(entitlement(), 'business_admin').action?.href
    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(a).not.toBe(b)
  })

  it('nenhum caminho leva a checkout — o modelo é de venda assistida', () => {
    for (const role of ['business_admin', 'super_admin']) {
      for (const err of [balance(), entitlement()]) {
        const href = describeCopilotBlock(err, role).action?.href ?? ''
        expect(href.startsWith('mailto:')).toBe(true)
      }
    }
  })
})

describe('degradação segura', () => {
  it('sem classe, trata como assinatura — não manda comprar crédito', () => {
    // O conservador: se não dá para classificar, sugerir compra de crédito
    // para um contrato que talvez não exista mais é o pior dos erros.
    const n = describeCopilotBlock(new CopilotBlockedError('Indisponível.'), 'business_admin')
    expect(n.guidance).toContain('regularizar')
  })

  it('corpo sem mensagem cai num texto neutro, nunca em vazio', () => {
    const n = describeCopilotBlock(new CopilotBlockedError(''), 'business_admin')
    expect(n.cause.length).toBeGreaterThan(0)
  })

  it('papel ausente é tratado como quem não administra', () => {
    expect(describeCopilotBlock(balance(), undefined).action).toBeUndefined()
  })
})
