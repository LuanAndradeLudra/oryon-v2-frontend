// O risco deste card é ele parecer acessível e não ser: três linhas cujo
// único sinal de estado é a cor e o formato do ícone soam idênticas para
// quem lê por audição. Por isso o estado também sai em texto, e é isso que
// os testes abaixo prendem.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReadinessChecklist } from './ReadinessChecklist'

const ITEMS = [
  { label: 'Template aprovado', done: true },
  { label: 'Variáveis mapeadas', done: true },
  { label: 'Linha e horário definidos', done: false },
]

describe('ReadinessChecklist', () => {
  it('lista os pré-requisitos com o estado em texto, não só em cor', () => {
    render(<ReadinessChecklist items={ITEMS} />)
    expect(screen.getByText('Template aprovado').parentElement).toHaveTextContent('(atendido)')
    expect(screen.getByText('Linha e horário definidos').parentElement).toHaveTextContent('(pendente)')
  })

  it('resume no rótulo do grupo quantos faltam', () => {
    render(<ReadinessChecklist items={ITEMS} />)
    expect(screen.getByRole('group', { name: /1 pendente$/ })).toBeInTheDocument()
  })

  it('concorda em número quando falta mais de um', () => {
    render(<ReadinessChecklist items={[{ label: 'a', done: false }, { label: 'b', done: false }]} />)
    expect(screen.getByRole('group', { name: /2 pendentes/ })).toBeInTheDocument()
  })

  it('sem pendência, o rótulo diz que está tudo atendido', () => {
    render(<ReadinessChecklist items={[{ label: 'a', done: true }]} />)
    expect(screen.getByRole('group', { name: /todos atendidos/i })).toBeInTheDocument()
  })
})
