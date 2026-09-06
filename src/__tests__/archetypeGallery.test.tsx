// ─── A5 / SCRUM-1016 — a galeria ─────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ArchetypeGallery } from '@/components/agents/archetypes/ArchetypeGallery'
import { ARCHETYPES, chipLabel } from '@/components/agents/archetypes/archetypes'

function montar() {
  const onEscolher = vi.fn()
  render(<ArchetypeGallery onEscolher={onEscolher} />)
  return { onEscolher }
}

/** O card de um arquétipo, achado pelo nome visível. */
function cartao(nome: string) {
  return screen.getByText(nome).closest('article') as HTMLElement
}

describe('ArchetypeGallery', () => {
  it('monta os 3 cards com nome, descrição e conversa de exemplo', () => {
    montar()
    for (const arquetipo of ARCHETYPES) {
      const card = cartao(arquetipo.nome)
      expect(card).toBeInTheDocument()
      expect(within(card).getByText(arquetipo.descricao)).toBeInTheDocument()
      for (const bolha of arquetipo.exemplo) {
        expect(within(card).getByText(bolha.texto)).toBeInTheDocument()
      }
    }
  })

  it('mostra o texto dos chips vindo do dado, não de string solta', () => {
    montar()
    for (const arquetipo of ARCHETYPES) {
      const card = cartao(arquetipo.nome)
      for (const chip of arquetipo.chips) {
        expect(within(card).getByText(chipLabel(chip, arquetipo))).toBeInTheDocument()
      }
    }
  })

  it('só Vendas mostra o selo "Mais usado"', () => {
    montar()
    expect(screen.getAllByText('Mais usado')).toHaveLength(1)
    expect(within(cartao('Vendas')).getByText('Mais usado')).toBeInTheDocument()
  })

  it('"Usar este arquétipo" chama o callback com o arquétipo daquele card', () => {
    const { onEscolher } = montar()
    for (const arquetipo of ARCHETYPES) {
      onEscolher.mockClear()
      fireEvent.click(within(cartao(arquetipo.nome)).getByRole('button', { name: 'Usar este arquétipo' }))
      expect(onEscolher).toHaveBeenCalledTimes(1)
      // O bug que este teste existe para pegar é o clássico do `.map`: todos os
      // botões fecharem sobre o último arquétipo da lista.
      expect(onEscolher).toHaveBeenCalledWith(arquetipo)
    }
  })

  it('"Começar do zero no Studio" chama o callback sem arquétipo nenhum', () => {
    const { onEscolher } = montar()
    fireEvent.click(screen.getByRole('button', { name: /Começar do zero no Studio/ }))
    expect(onEscolher).toHaveBeenCalledTimes(1)
    // Sem argumento, não `undefined` explícito nem um objeto vazio: é assim que
    // o Studio distingue "escolheu arquétipo" de "quer começar em branco".
    expect(onEscolher.mock.calls[0]).toHaveLength(0)
  })

  it('há exatamente 4 caminhos de saída: 3 arquétipos + começar do zero', () => {
    montar()
    expect(screen.getAllByRole('button', { name: 'Usar este arquétipo' })).toHaveLength(3)
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('o véu de cor do topo é decoração — fica fora da árvore de acessibilidade', () => {
    montar()
    const veu = cartao('Vendas').querySelector('[aria-hidden]')
    expect(veu).toBeInTheDocument()
    expect(veu).toHaveClass('pointer-events-none')
  })
})
