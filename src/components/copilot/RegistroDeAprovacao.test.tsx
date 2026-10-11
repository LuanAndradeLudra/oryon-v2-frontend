import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RegistroDeAprovacao } from './RegistroDeAprovacao'
import { expirarLotesOrfaos, contarPendentes } from './bancada/lotes'
import type { CopilotMessage, ToolCallRecord } from '@/contexts/CopilotContext'

const lote = (extra: Partial<ToolCallRecord>): ToolCallRecord => ({
  id: 'lote', name: '__approval_batch__', input: null, status: 'running',
  batchItems: [
    { id: 'a', name: 'create_tag', input: {} },
    { id: 'b', name: 'update_tag', input: {} },
    { id: 'c', name: 'delete_tag', input: {} },
  ],
  ...extra,
})

describe('RegistroDeAprovacao', () => {
  it('aprovação parcial mostra "1 de 3" e marca as recusadas', () => {
    render(<RegistroDeAprovacao tc={lote({ approvalStatus: 'approved', approvedIds: ['a'] })} />)
    expect(screen.getByText('1 de 3 aprovada')).toBeTruthy()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getAllByText('recusada')).toHaveLength(2)
  })

  it('registro antigo sem approvedIds conta como aprovação total', () => {
    render(<RegistroDeAprovacao tc={lote({ approvalStatus: 'approved' })} />)
    expect(screen.getByText('3 ações aprovadas')).toBeTruthy()
  })

  it('lote expirado não aparece como aguardando', () => {
    render(<RegistroDeAprovacao tc={lote({ approvalStatus: 'expired' })} />)
    expect(screen.getByText('Expirou — peça de novo ao Copilot')).toBeTruthy()
  })
})

describe('expirarLotesOrfaos', () => {
  it('lote pendente do histórico vira expirado e deixa de contar', () => {
    const msgs = [{ id: 'm', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [lote({ approvalStatus: 'pending' })] }] as CopilotMessage[]
    expect(contarPendentes(msgs)).toBe(1)
    const r = expirarLotesOrfaos(msgs)
    expect(r[0].toolCalls?.[0].approvalStatus).toBe('expired')
    expect(contarPendentes(r)).toBe(0)
  })

  it('sem lote pendente devolve o mesmo array', () => {
    const msgs = [{ id: 'm', role: 'user', content: 'oi', timestamp: new Date() }] as CopilotMessage[]
    expect(expirarLotesOrfaos(msgs)).toBe(msgs)
  })
})
