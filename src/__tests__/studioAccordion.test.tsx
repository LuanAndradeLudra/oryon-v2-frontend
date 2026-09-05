import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudioAccordion } from '@/components/agents/studio/blueprint/StudioAccordion'
import { DEFAULT_DATA, STEP_LABELS, type WizardData } from '@/components/agents/studio/types'

const bodies = STEP_LABELS.map((label, i) => <div key={label}>corpo da etapa {i + 1}</div>)

function montar(step: number, over: Partial<WizardData> = {}) {
  const onJump = vi.fn()
  const r = render(
    <StudioAccordion step={step} data={{ ...DEFAULT_DATA, ...over }} bodies={bodies} onJump={onJump} />,
  )
  return { onJump, rerender: (s: number) => r.rerender(
    <StudioAccordion step={s} data={{ ...DEFAULT_DATA, ...over }} bodies={bodies} onJump={onJump} />,
  ) }
}

const cabecalho = (label: string) => screen.getByRole('button', { name: new RegExp(label) })

describe('StudioAccordion', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('mostra as 8 etapas', () => {
    montar(1)
    for (const label of STEP_LABELS) expect(cabecalho(label)).toBeInTheDocument()
  })

  it('só a etapa atual fica aberta', () => {
    montar(3)
    expect(screen.getByText('corpo da etapa 3')).toBeInTheDocument()
    expect(screen.queryByText('corpo da etapa 2')).not.toBeInTheDocument()
    expect(screen.queryByText('corpo da etapa 4')).not.toBeInTheDocument()
    expect(cabecalho('Escopo')).toHaveAttribute('aria-expanded', 'true')
    expect(cabecalho('Identidade')).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicar numa etapa concluída avisa quem manda no passo', () => {
    const { onJump } = montar(5)
    fireEvent.click(cabecalho('Identidade'))
    expect(onJump).toHaveBeenCalledWith(1)
  })

  it('etapa futura não é clicável — não dá para pular o que ainda não foi feito', () => {
    const { onJump } = montar(2)
    const futura = cabecalho('Revisão')
    expect(futura).toBeDisabled()
    fireEvent.click(futura)
    expect(onJump).not.toHaveBeenCalled()
  })

  it('a etapa atual também não navega para si mesma', () => {
    const { onJump } = montar(2)
    expect(cabecalho('Personalidade')).toBeDisabled()
    expect(onJump).not.toHaveBeenCalled()
  })

  it('etapa concluída mostra o resumo do que foi decidido nela', () => {
    montar(4, { name: 'Sofia', sector: 'ecommerce', tone: 'entusiasmado' })
    expect(screen.getByText('Sofia · E-commerce / Varejo')).toBeInTheDocument()
    expect(screen.getByText('Entusiasmado · Português')).toBeInTheDocument()
  })

  it('a etapa aberta não repete o resumo — o corpo já mostra tudo', () => {
    montar(1, { name: 'Sofia', sector: 'ecommerce' })
    expect(screen.queryByText('Sofia · E-commerce / Varejo')).not.toBeInTheDocument()
  })

  it('rola até a etapa que abre', () => {
    // Sem isto, avançar da 7 para a 8 deixa o corpo aberto fora da área
    // rolável e parece que nada aconteceu. Mesma família do bottomRef da W0.3:
    // rolagem não sai em dump de DOM, só em teste.
    const { rerender } = montar(1)
    ;(Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear()
    rerender(2)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' })
  })
})
