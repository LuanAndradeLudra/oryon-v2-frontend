// Composição do Hero (STORYBOARD-HERO.md): 5 frames estáticos, uma peça só —
// sem motor, sem cursor, sem laço ambiente. Cada teste confere o que "precisa
// ser compreendido" no frame, não pixels.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroComposition } from './HeroComposition'
import { HeroMobileComposition } from './HeroMobileComposition'
import { HERO } from './heroData'

describe('HeroComposition (desktop)', () => {
  it('demanda: só a bolha inbound; P2 e P3 ausentes', () => {
    render(<HeroComposition frame="demanda" />)
    expect(screen.getByText(HERO.demand)).toBeInTheDocument()
    expect(screen.queryByText(HERO.catalogItem.name)).not.toBeInTheDocument()
    expect(screen.queryByText(HERO.deal.title)).not.toBeInTheDocument()
  })

  it('contexto: a ficha do contato entra; a demanda permanece (nunca some)', () => {
    render(<HeroComposition frame="contexto" />)
    expect(screen.getByText(HERO.demand)).toBeInTheDocument()
    expect(screen.getByText(HERO.company)).toBeInTheDocument()
    expect(screen.getByText(HERO.ficha.negocioAberto)).toBeInTheDocument()
  })

  it('consulta: o item do catálogo retornado, com preço', () => {
    render(<HeroComposition frame="consulta" />)
    expect(screen.getByText(HERO.catalogItem.name)).toBeInTheDocument()
    expect(screen.getByText(HERO.catalogItem.price)).toBeInTheDocument()
  })

  it('ação: o card do negócio entra, etapa vai para Proposta (nunca Ganho)', () => {
    render(<HeroComposition frame="acao" />)
    expect(screen.getByText(HERO.deal.title)).toBeInTheDocument()
    expect(screen.getByText(HERO.stageTo)).toBeInTheDocument()
    expect(screen.queryByText('Ganho')).not.toBeInTheDocument()
  })

  it('resultado: a resposta do agente e o card assentado aparecem juntos, ligados por Marina/empresa', () => {
    render(<HeroComposition frame="resultado" />)
    expect(screen.getByText(HERO.response)).toBeInTheDocument()
    expect(screen.getByText(HERO.deal.title)).toBeInTheDocument()
    expect(screen.getAllByText(HERO.person).length).toBeGreaterThan(0)
  })
})

describe('HeroMobileComposition (3 momentos)', () => {
  it('demanda: só a conversa, texto essencial legível', () => {
    render(<HeroMobileComposition moment="demanda" />)
    expect(screen.getByText(HERO.demand)).toBeInTheDocument()
    expect(screen.queryByText(HERO.catalogItem.name)).not.toBeInTheDocument()
  })

  it('execução: consulta + mudança de etapa condensadas', () => {
    render(<HeroMobileComposition moment="execucao" />)
    expect(screen.getByText(HERO.catalogItem.name)).toBeInTheDocument()
    expect(screen.getByText(HERO.stageTo)).toBeInTheDocument()
    expect(screen.queryByText(HERO.demand)).not.toBeInTheDocument()
  })

  it('resultado: resposta + card do negócio', () => {
    render(<HeroMobileComposition moment="resultado" />)
    expect(screen.getByText(HERO.response)).toBeInTheDocument()
    expect(screen.getByText(HERO.stageTo)).toBeInTheDocument()
  })
})
