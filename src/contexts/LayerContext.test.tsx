// useLayer (registro central de overlays). Sem nenhum teste até 2026-09-23 —
// e por isso um loop infinito de efeitos passou despercebido: com o efeito de
// registro dependendo de `[open, ctx]`, cada push mudava o `ctx`, que
// reexecutava o efeito (cleanup → pop → push → …) pra sempre, com QUALQUER
// overlay aberto dentro do LayerProvider. Estes testes cobrem o loop e o
// comportamento de pilha que o hook promete (z-index por posição, Esc só no
// topo).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LayerProvider, useLayer } from './LayerContext'

function Overlay({ name, open, onClose, onRender }: {
  name: string
  open: boolean
  onClose: () => void
  onRender?: () => void
}) {
  onRender?.()
  const { zIndex, isTopmost } = useLayer(open, onClose)
  return <div data-testid={name}>{`${zIndex}|${isTopmost}`}</div>
}

describe('useLayer', () => {
  it('estabiliza dentro do LayerProvider — não re-renderiza pra sempre (regressão do loop push→pop→push)', () => {
    let renders = 0
    const onRender = () => {
      renders++
      // Falha rápido e claro em vez de travar o worker se o loop voltar.
      if (renders > 100) throw new Error('LOOP: useLayer re-renderizou mais de 100 vezes')
    }
    render(
      <LayerProvider>
        <Overlay name="a" open onClose={() => {}} onRender={onRender} />
      </LayerProvider>,
    )
    expect(renders).toBeLessThan(10)
  })

  it('dois overlays abertos: o segundo fica acima e só ele é o topo', () => {
    render(
      <LayerProvider>
        <Overlay name="a" open onClose={() => {}} />
        <Overlay name="b" open onClose={() => {}} />
      </LayerProvider>,
    )
    expect(screen.getByTestId('a').textContent).toBe('60|false')
    expect(screen.getByTestId('b').textContent).toBe('61|true')
  })

  it('Esc fecha só o overlay do topo, nunca os dois', () => {
    const closeA = vi.fn()
    const closeB = vi.fn()
    render(
      <LayerProvider>
        <Overlay name="a" open onClose={closeA} />
        <Overlay name="b" open onClose={closeB} />
      </LayerProvider>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closeB).toHaveBeenCalledTimes(1)
    expect(closeA).not.toHaveBeenCalled()
  })

  it('fechar o do topo devolve o topo pro de baixo', () => {
    const { rerender } = render(
      <LayerProvider>
        <Overlay name="a" open onClose={() => {}} />
        <Overlay name="b" open onClose={() => {}} />
      </LayerProvider>,
    )
    rerender(
      <LayerProvider>
        <Overlay name="a" open onClose={() => {}} />
        <Overlay name="b" open={false} onClose={() => {}} />
      </LayerProvider>,
    )
    expect(screen.getByTestId('a').textContent).toBe('60|true')
  })

  it('sem LayerProvider (teste isolado de Modal/Drawer): Esc continua fechando', () => {
    const onClose = vi.fn()
    render(<Overlay name="a" open onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
