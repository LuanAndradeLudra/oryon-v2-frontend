import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { DesfechoDonut } from './DesfechoDonut'

afterEach(() => cleanup())

describe('Desfecho dos atendimentos (auditoria 12/11, D6)', () => {
  it('as fatias somam o total do centro, com a porcentagem de cada uma', () => {
    render(<DesfechoDonut data={{ resolvedByAiOnly: 965, resolvedWithTeam: 432, archived: 83, open: 183 }} periodo="nos últimos 7 dias" />)
    expect(screen.getByText('1.663')).toBeTruthy()
    expect(screen.getByText('Resolvidos só pela IA')).toBeTruthy()
    expect(screen.getByText('58%')).toBeTruthy()
    expect(screen.getByLabelText('O que é o desfecho dos atendimentos')).toBeTruthy()
  })

  it('sem o dado diz que está indisponível (nunca um zero que parece dado)', () => {
    render(<DesfechoDonut data={null} />)
    expect(screen.getByText('Desfecho indisponível')).toBeTruthy()
  })
})
