// Fase 3 do plano de reestilização de Disparos/Agentes — extração do tablist
// hand-rolled já aprovado em AgentDetail.tsx pra um componente reutilizável.
// Cobre o contrato que o original já tinha: troca de aba (controlada, o pai
// decide o estado), aria-selected refletindo a aba ativa, e o botão focável
// nativamente (o original não tinha roving tabindex/setas — só isso, então
// não é achado deste teste que falte).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs, type TabOption } from './Tabs'

type Section = 'overview' | 'prompt' | 'metrics'

const TABS: TabOption<Section>[] = [
  { id: 'overview', label: 'Visão geral', icon: <span data-testid="icon-overview" /> },
  { id: 'prompt', label: 'System Prompt' },
  { id: 'metrics', label: 'Métricas' },
]

describe('Tabs', () => {
  it('renderiza role="tablist"/role="tab" e marca aria-selected na aba ativa', () => {
    render(<Tabs tabs={TABS} value="overview" onChange={vi.fn()} label="Seções de teste" />)

    expect(screen.getByRole('tablist', { name: 'Seções de teste' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(screen.getByRole('tab', { name: /Visão geral/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'System Prompt' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Métricas' })).toHaveAttribute('aria-selected', 'false')
  })

  it('renderiza o ícone quando informado, sem quebrar quando ausente', () => {
    render(<Tabs tabs={TABS} value="overview" onChange={vi.fn()} label="Seções de teste" />)
    expect(screen.getByTestId('icon-overview')).toBeInTheDocument()
  })

  it('clicar numa aba chama onChange com o id — é controlado, não muda sozinho', () => {
    const onChange = vi.fn()
    render(<Tabs tabs={TABS} value="overview" onChange={onChange} label="Seções de teste" />)

    fireEvent.click(screen.getByRole('tab', { name: 'Métricas' }))
    expect(onChange).toHaveBeenCalledWith('metrics')
    // Controlado: aria-selected só muda quando o pai atualiza `value` — o
    // clique sozinho, sem re-render com o novo value, não move o estado.
    expect(screen.getByRole('tab', { name: 'Métricas' })).toHaveAttribute('aria-selected', 'false')
  })

  it('clicar na aba já ativa ainda chama onChange (o original também não tinha guarda de no-op)', () => {
    const onChange = vi.fn()
    render(<Tabs tabs={TABS} value="overview" onChange={onChange} label="Seções de teste" />)
    fireEvent.click(screen.getByRole('tab', { name: /Visão geral/ }))
    expect(onChange).toHaveBeenCalledWith('overview')
  })

  it('reflete a troca quando o pai atualiza `value` (uso controlado real)', () => {
    const { rerender } = render(<Tabs tabs={TABS} value="overview" onChange={vi.fn()} label="Seções de teste" />)
    rerender(<Tabs tabs={TABS} value="prompt" onChange={vi.fn()} label="Seções de teste" />)
    expect(screen.getByRole('tab', { name: 'System Prompt' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Visão geral/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('botões são type="button" — nunca disparam submit se acabarem dentro de um <form>', () => {
    render(<Tabs tabs={TABS} value="overview" onChange={vi.fn()} label="Seções de teste" />)
    screen.getAllByRole('tab').forEach((tab) => expect(tab).toHaveAttribute('type', 'button'))
  })
})

// Fase 5a — accent categórico, só na aba ativa (AgentDetail.tsx).
describe('Tabs — accent (Fase 5a)', () => {
  const ACCENT_TABS: TabOption<Section>[] = [
    { id: 'overview', label: 'Visão geral' }, // sem accent — fica na cor da marca
    { id: 'prompt', label: 'System Prompt', accent: 'violet' },
    { id: 'metrics', label: 'Métricas', accent: 'blue' },
  ]

  it('aba ativa com accent usa a classe do tom informado, não a cor da marca', () => {
    render(<Tabs tabs={ACCENT_TABS} value="prompt" onChange={vi.fn()} label="Seções de teste" />)
    const active = screen.getByRole('tab', { name: 'System Prompt' })
    expect(active.className).toContain('text-accent-violet')
    expect(active.className).toContain('border-accent-violet')
    expect(active.className).not.toContain('border-brand-500')
  })

  it('aba ativa SEM accent mantém o default (cor da marca) — não quebra quem não usa a prop', () => {
    render(<Tabs tabs={ACCENT_TABS} value="overview" onChange={vi.fn()} label="Seções de teste" />)
    const active = screen.getByRole('tab', { name: 'Visão geral' })
    expect(active.className).toContain('border-brand-500')
    expect(active.className).toContain('text-surface-50')
  })

  it('aba INATIVA com accent configurado continua neutra — a cor só aparece quando ativa', () => {
    render(<Tabs tabs={ACCENT_TABS} value="overview" onChange={vi.fn()} label="Seções de teste" />)
    const inactive = screen.getByRole('tab', { name: 'System Prompt' })
    expect(inactive.className).not.toContain('accent-violet')
    expect(inactive.className).toContain('text-surface-500')
  })
})
