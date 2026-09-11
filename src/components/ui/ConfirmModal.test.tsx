// ConfirmModal — alcance real (`impact`) antes de confirmar. Achado de várias
// revisões: cada tela escrevia "vai afetar N coisas" na mão dentro de
// `description`, sem nenhum destaque visual. Cobre: sem `impact` o modal
// continua exatamente como antes (não quebra os ~29 consumidores existentes);
// com `impact`, o bloco aparece com label/count/tone corretos.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfirmModal } from './Modal'

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Excluir contatos',
  description: 'Esta ação não pode ser desfeita.',
}

describe('ConfirmModal — impact', () => {
  it('sem impact, renderiza exatamente como antes — sem o bloco de alcance', () => {
    render(<ConfirmModal {...baseProps} />)
    expect(screen.getByText('Excluir contatos')).toBeInTheDocument()
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('com impact.label só (sem count nem tone), renderiza o bloco com tone neutral', () => {
    render(<ConfirmModal {...baseProps} impact={{ label: '3 contatos selecionados' }} />)
    // tone default 'neutral' → Banner usa role="status", não "alert"
    const block = screen.getByRole('status')
    expect(block).toHaveTextContent('3 contatos selecionados')
  })

  it('com impact.count, o número aparece em destaque separado do label', () => {
    render(<ConfirmModal {...baseProps} impact={{ label: 'contatos serão excluídos permanentemente', count: 12, tone: 'danger' }} />)
    const block = screen.getByRole('alert') // tone danger → role="alert" (Banner)
    expect(block).toHaveTextContent('12')
    expect(block).toHaveTextContent('contatos serão excluídos permanentemente')
  })

  it('tone warning usa role="alert" e a cor de aviso', () => {
    render(<ConfirmModal {...baseProps} impact={{ label: 'Template será enviado para João Silva', tone: 'warning' }} />)
    const block = screen.getByRole('alert')
    expect(block).toHaveTextContent('Template será enviado para João Silva')
    expect(block.getAttribute('style')).toContain('--color-warning')
  })

  it('tone danger usa --color-danger no chip', () => {
    render(<ConfirmModal {...baseProps} impact={{ label: 'Ação irreversível', tone: 'danger' }} />)
    const block = screen.getByRole('alert')
    expect(block.getAttribute('style')).toContain('--color-danger')
  })
})
