// Cena Funis: função pura do passo — cada quadro do poster mostra o negócio na coluna certa.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { StagePoster } from '../StagePoster'
import { HeroStage } from '../HeroStage'
import { dealsAt, leadStageAt, STEP } from './funilScript'

describe('roteiro do funil', () => {
  it('o negócio percorre Novo lead -> Qualificado -> Proposta e o chip IA só vale enquanto a IA o moveu', () => {
    expect(leadStageAt(0)).toBeNull()
    expect(leadStageAt(STEP.enter)).toBe('s-novo')
    expect(leadStageAt(STEP.ai)).toBe('s-qualificado')
    expect(leadStageAt(STEP.press)).toBe('s-qualificado')
    expect(leadStageAt(STEP.dropped)).toBe('s-proposta')
    expect(dealsAt(STEP.ai)['s-qualificado'][0].byAi).toBe(true)
    expect(dealsAt(STEP.dropped)['s-proposta'][0].byAi).toBe(false)
  })
})

describe('StagePoster · funil', () => {
  it('frame "ia": negócio em Qualificado com o chip IA', () => {
    render(<StagePoster scene="funil" frame="ia" />)
    expect(screen.getByText('Plano trimestral · Marina Exemplo')).toBeInTheDocument()
    expect(screen.getByText('IA')).toBeInTheDocument()
  })

  it('frame "humano": o negócio já está em Proposta enviada (2 cards) e sem chip IA', () => {
    render(<StagePoster scene="funil" frame="humano" />)
    expect(screen.queryByText('IA')).not.toBeInTheDocument()
    const proposta = screen.getByText('Proposta enviada').closest('[data-stage-target], div.flex.flex-col') as HTMLElement
    expect(within(proposta.parentElement as HTMLElement).getByText('Plano trimestral · Marina Exemplo')).toBeInTheDocument()
  })

  it('Ganho e Perdido são colunas terminais com o slot de soltar (mesma copy do board real)', () => {
    render(<StagePoster scene="funil" frame="final" />)
    expect(screen.getByText(/Etapas terminais pedem motivo/)).toBeInTheDocument()
    expect(screen.getByText('Solte aqui para marcar como Perdido')).toBeInTheDocument()
  })

  it('compact: uma etapa por vez com as abas das etapas', () => {
    render(<StagePoster scene="funil" frame="ia" layout="compact" />)
    expect(screen.getByRole('tablist', { name: /Etapas do funil/, hidden: true })).toBeInTheDocument()
    expect(screen.queryByText('Solte aqui para marcar como Perdido')).not.toBeInTheDocument()
  })
})

describe('HeroStage · abas de cena', () => {
  it('mostra as abas das cenas existentes e troca de cena avisando o chamador', () => {
    const onSceneChange = vi.fn()
    render(<HeroStage autoplay={false} onSceneChange={onSceneChange} />)
    expect(screen.getByRole('tab', { name: 'Conversas' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Funis' }))
    expect(onSceneChange).toHaveBeenCalledWith('funil')
    expect(screen.getByText('Oryon · Funis')).toBeInTheDocument()
  })
})
