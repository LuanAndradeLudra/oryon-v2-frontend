// Cena Funis: estado ESTÁTICO por frame — o negócio da demonstração já está
// na coluna certa (sem timeline, sem cursor arrastando).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StagePoster } from '../StagePoster'

describe('cena Funis · StagePoster', () => {
  it('inicio: o negócio está em Novo lead, sem chip IA', () => {
    render(<StagePoster scene="funil" frame="inicio" />)
    expect(screen.getByText('Plano trimestral · Marina Exemplo')).toBeInTheDocument()
    expect(screen.queryByText('IA')).not.toBeInTheDocument()
  })

  it('ia: o negócio ganha o chip IA (moveu por conta do Agente)', () => {
    render(<StagePoster scene="funil" frame="ia" />)
    expect(screen.getByText('IA')).toBeInTheDocument()
    expect(screen.getByText('Plano trimestral · Marina Exemplo')).toBeInTheDocument()
  })

  it('humano/final: sem chip IA — o negócio já não está mais em Qualificado', () => {
    render(<StagePoster scene="funil" frame="humano" />)
    expect(screen.queryByText('IA')).not.toBeInTheDocument()
    expect(screen.getByText('Plano trimestral · Marina Exemplo')).toBeInTheDocument()
  })

  it('Ganho e Perdido são colunas terminais com a mesma copy do board real', () => {
    render(<StagePoster scene="funil" frame="final" />)
    expect(screen.getAllByText('Ganho').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Perdido').length).toBeGreaterThan(0)
    expect(screen.getByText(/Etapas terminais pedem motivo/)).toBeInTheDocument()
  })

  it('compact: uma etapa por vez, sem o resto do board', () => {
    render(<StagePoster scene="funil" frame="ia" layout="compact" />)
    expect(document.querySelector('[data-stage-layout="compact"]')).toBeInTheDocument()
    expect(screen.queryByText('Perdido')).not.toBeInTheDocument()
  })
})
