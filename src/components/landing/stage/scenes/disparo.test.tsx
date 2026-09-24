// Cena Disparos: estado ESTÁTICO por frame — revisão -> enviando -> enviada,
// sem roteiro nem cursor clicando.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StagePoster } from '../StagePoster'
import { DEMO_CAMPAIGN_NEW } from '../demoData'

describe('cena Disparos · StagePoster', () => {
  it('inicio/ia: revisão do assistente, com a prévia do modelo e o aviso da janela de 24h', () => {
    render(<StagePoster scene="disparo" frame="inicio" />)
    expect(screen.getByText('Revisar e disparar')).toBeInTheDocument()
    expect(document.body.textContent).toContain('Olá Marina!')
    expect(screen.getByText(/fora da janela de 24 h/)).toBeInTheDocument()
    expect(screen.getAllByText('Disparar').length).toBeGreaterThan(0)
  })

  it('handoff: envio em andamento, abaixo de 100 %', () => {
    render(<StagePoster scene="disparo" frame="handoff" />)
    expect(screen.getByText('Enviando')).toBeInTheDocument()
    expect(screen.getByText('Disparando agora…')).toBeInTheDocument()
    expect(screen.getByText(`${Math.round(DEMO_CAMPAIGN_NEW.total * 0.25)} / ${DEMO_CAMPAIGN_NEW.total}`)).toBeInTheDocument()
  })

  it('humano: mais avançado que handoff', () => {
    render(<StagePoster scene="disparo" frame="humano" />)
    expect(screen.getByText(`${Math.round(DEMO_CAMPAIGN_NEW.total * 0.62)} / ${DEMO_CAMPAIGN_NEW.total}`)).toBeInTheDocument()
  })

  it('final: disparo concluído, 100 %', () => {
    render(<StagePoster scene="disparo" frame="final" />)
    expect(screen.getByText('Disparo concluído')).toBeInTheDocument()
    expect(screen.getAllByText('Enviada').length).toBeGreaterThan(0)
    expect(screen.getByText(`${DEMO_CAMPAIGN_NEW.total} / ${DEMO_CAMPAIGN_NEW.total}`)).toBeInTheDocument()
  })

  it('compact: mostra só o painel/lista relevante ao estado', () => {
    render(<StagePoster scene="disparo" frame="inicio" layout="compact" />)
    expect(document.querySelector('[data-stage-layout="compact"]')).toBeInTheDocument()
    expect(screen.getByText('Revisar e disparar')).toBeInTheDocument()
  })
})
