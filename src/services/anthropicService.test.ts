import { describe, it, expect } from 'vitest'
import { businessContextFromHub } from './anthropicService'

/**
 * F13-904: a IA de etapas saiu do onboarding e virou o "Sugerir etapas com IA"
 * do modal de Novo funil. O único ponto onde o Hub da empresa encontra o
 * formato que o agent-server espera é esta função — daí valer um teste próprio.
 */
describe('businessContextFromHub (F13-904)', () => {
  const HUB = {
    companyName: 'Clínica Serra',
    industry: 'Saúde',
    businessType: ['clínica'],
    teamSize: '11-50',
    description: 'Clínica de dermatologia',
    productsServices: 'Consultas e procedimentos',
  }

  it('mapeia os campos do Hub para o contexto do agent-server', () => {
    const ctx = businessContextFromHub(HUB)

    expect(ctx).toMatchObject({
      companyName: 'Clínica Serra',
      industry: 'Saúde',
      businessType: ['clínica'],
      teamSize: '11-50',
      companyDescription: 'Clínica de dermatologia',
      productsServices: 'Consultas e procedimentos',
    })
  })

  it('campos que o Hub não coleta vão vazios — inventar valor enviesaria a sugestão', () => {
    const ctx = businessContextFromHub(HUB)

    expect(ctx.salesProcessDescription).toBe('')
    expect(ctx.crmGoals).toEqual([])
    expect(ctx.acquisitionChannels).toEqual([])
    expect(ctx.averageTicket).toBe('')
  })

  it('sem nome no Hub, usa o nome que o usuário está digitando no funil', () => {
    const ctx = businessContextFromHub({ ...HUB, companyName: '   ' }, '  Suporte  ')

    expect(ctx.companyName).toBe('Suporte')
  })

  it('Hub vazio não quebra o mapeamento', () => {
    const ctx = businessContextFromHub({
      companyName: '', industry: '', businessType: [], teamSize: '', description: '', productsServices: '',
    })

    expect(ctx.companyName).toBe('')
    expect(ctx.businessType).toEqual([])
  })
})
