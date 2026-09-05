// O que este teste protege é COMPORTAMENTO DE ESTADO — foco — que some em
// movimento puro e não aparece em dump de DOM nem em screenshot
// (coord/D2-plano.md §11; a lição veio do bug de rolagem/foco que a paridade
// determinística do Compasso pegou na W0.3).
//
// `document.activeElement` funciona no jsdom, então foco dá para asserir
// aqui. Rolagem não dá: `scrollIntoView` não existe no jsdom, e o que este
// arquivo cobre dela é apenas que a ausência não quebra o componente. A
// rolagem de verdade fica para a verificação ao vivo na porta 3014,
// declarada como tal no PR.
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Calendar } from 'lucide-react'
import { ComposerBlock } from './ComposerBlock'

/** O corpo do bloco não tem `role` próprio de propósito (a `<section>` já é
 *  a região). Pega-se ele pelo `aria-controls` do cabeçalho, que é
 *  justamente o vínculo que precisa estar certo. */
function bodyOf(header: HTMLElement): HTMLElement {
  const id = header.getAttribute('aria-controls')
  const el = id ? document.getElementById(id) : null
  if (!el) throw new Error('cabeçalho sem aria-controls apontando para o corpo')
  return el
}

/** Casca controlada, como a página vai usar: um bloco aberto por vez. */
function Harness({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <ComposerBlock
      title="Envio"
      summary="Quando e por qual linha."
      status="pending"
      icon={Calendar}
      accent="brand"
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <button type="button">Agora</button>
    </ComposerBlock>
  )
}

describe('ComposerBlock — acessibilidade da casca', () => {
  it('cabeçalho anuncia o estado e aponta para o corpo', () => {
    render(<Harness />)
    const header = screen.getByRole('button', { name: /Envio/ })
    expect(header).toHaveAttribute('aria-expanded', 'false')
    // A região acessível é a <section>, nomeada pelo cabeçalho — uma só,
    // não duas aninhadas com o mesmo nome.
    expect(screen.getByRole('region', { name: /Envio/ })).toBeInTheDocument()
    expect(bodyOf(header)).toBeInTheDocument()
  })

  it('corpo fica escondido de verdade quando fechado', () => {
    render(<Harness />)
    const header = screen.getByRole('button', { name: /Envio/ })
    // `hidden` remove do acessível — não é só CSS.
    expect(bodyOf(header)).not.toBeVisible()
    expect(screen.queryByRole('button', { name: 'Agora' })).toBeNull()
  })

  it('abrir revela o corpo e atualiza o aria-expanded', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /Envio/ }))

    const header = screen.getByRole('button', { name: /Envio/ })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(bodyOf(header)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Agora' })).toBeVisible()
  })
})

describe('ComposerBlock — foco (o que captura nenhuma pega)', () => {
  it('abrir move o foco para dentro do bloco', () => {
    render(<Harness />)
    const header = screen.getByRole('button', { name: /Envio/ })
    fireEvent.click(header)
    expect(bodyOf(header)).toHaveFocus()
  })

  it('fechar devolve o foco ao cabeçalho, nunca ao body', () => {
    render(<Harness />)
    const header = screen.getByRole('button', { name: /Envio/ })

    fireEvent.click(header)
    fireEvent.click(header)

    expect(header).toHaveFocus()
    expect(document.activeElement).not.toBe(document.body)
  })

  it('bloco que JÁ NASCE aberto não rouba o foco de quem entrou na página', () => {
    render(<Harness initialOpen />)
    const header = screen.getByRole('button', { name: /Envio/ })
    // Só a ação de abrir move o foco; a montagem não.
    expect(bodyOf(header)).not.toHaveFocus()
    expect(document.activeElement).toBe(document.body)
  })
})

describe('ComposerBlock — rolagem', () => {
  it('pede para ser trazido à janela ao abrir', () => {
    const scrollIntoView = vi.fn()
    // jsdom não implementa; instalamos para observar a chamada.
    Element.prototype.scrollIntoView = scrollIntoView

    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /Envio/ }))

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' })
  })

  it('não quebra onde scrollIntoView não existe', () => {
    // @ts-expect-error — remover de propósito para simular o jsdom cru.
    delete Element.prototype.scrollIntoView

    render(<Harness />)
    const header = screen.getByRole('button', { name: /Envio/ })
    fireEvent.click(header)

    // Abriu e focou mesmo sem a API existir.
    expect(bodyOf(header)).toHaveFocus()
  })
})
