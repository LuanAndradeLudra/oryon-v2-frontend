// Cena Disparos: função pura do passo — revisão -> disparo -> progresso -> resultado.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StagePoster } from '../StagePoster'
import { HeroStage } from '../HeroStage'
import { newCampaignAt, STEP } from './disparoScript'

describe('roteiro de disparos', () => {
  it('a campanha só existe depois do clique e o progresso só cresce até 100 %', () => {
    expect(newCampaignAt(0)).toBeNull()
    expect(newCampaignAt(STEP.press)).toBeNull()
    const a = newCampaignAt(STEP.sending)!
    const b = newCampaignAt(STEP.half)!
    const c = newCampaignAt(STEP.done)!
    expect(a.status).toBe('sending')
    expect(a.sent).toBeLessThan(b.sent)
    expect(b.sent).toBeLessThan(c.sent)
    expect(c.status).toBe('sent')
    expect(c.sent).toBe(24)
  })
})

describe('StagePoster · disparo', () => {
  it('revisão: resumo do assistente, prévia do modelo com a variável e aviso da janela de 24 h', () => {
    render(<StagePoster scene="disparo" frame="inicio" />)
    expect(screen.getByText('Revisar e disparar')).toBeInTheDocument()
    // A variável entra no corpo (pode vir em <b>: compara o texto corrido).
    expect(document.body.textContent).toContain('Olá Marina!')
    expect(screen.getByText(/fora da janela de 24 h/)).toBeInTheDocument()
    expect(screen.getByText('Disparar')).toBeInTheDocument()
  })

  it('durante o envio: card "Enviando" e a barra de resumo; no fim, "Enviada"', () => {
    const { unmount } = render(<StagePoster scene="disparo" frame="humano" />)
    expect(screen.getByText('Enviando')).toBeInTheDocument()
    expect(screen.getByText('Disparando agora…')).toBeInTheDocument()
    unmount()
    render(<StagePoster scene="disparo" frame="final" />)
    expect(screen.getByText('Disparo concluído')).toBeInTheDocument()
    expect(screen.getAllByText('Enviada').length).toBeGreaterThan(0)
  })
})

describe('HeroStage · três cenas', () => {
  it('oferece Conversas, Funis e Disparos (nenhuma aba morta)', () => {
    render(<HeroStage autoplay={false} />)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Conversas', 'Funis', 'Disparos'])
  })
})
