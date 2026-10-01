// SelectMenu — o select de vidro do DS (01/10). Cobre: substituto direto do
// Select (mesmos <option>, onChange com e.target.value só quando muda, valor
// sem opção mostra a primeira habilitada, `name` no formulário), teclado
// (setas, Home/End, busca por letra sem acento, desabilitadas puladas, Tab
// escolhe, Esc fecha sem mudar), a lista abre acima de um Modal e o Esc fecha
// só ela, clique dentro ou fora não sobe para quem está em volta, o FormField
// rotula o campo, e em tela de toque o campo vira o <select> nativo.
import { afterEach, describe, it, expect, vi } from 'vitest'
import { useState, type ReactNode } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LayerProvider } from '@/contexts/LayerContext'
import { Modal } from './Modal'
import { FormField } from './FormField'
import { SelectMenu } from './SelectMenu'
import { escolherOpcao, rotulosDasOpcoes, valoresDasOpcoes } from '@/test/escolherOpcao'

const FRUTAS = (
  <>
    <option value="">— escolher —</option>
    <option value="banana">Banana</option>
    <option value="caju" disabled>Caju</option>
    <option value="cereja">Cereja</option>
    <option value="damasco">Damasco</option>
  </>
)

const AREAS = [
  ['educacao', 'Educação'],
  ['estetica', 'Estética'],
  ['saude', 'Saúde'],
  ['seguranca', 'Segurança'],
  ['servicos', 'Serviços'],
] as const

function Controlado({ inicial = '', onChange, rotulo = 'Fruta', children = FRUTAS }: {
  inicial?: string
  onChange?: (valor: string) => void
  rotulo?: string
  children?: ReactNode
}) {
  const [valor, setValor] = useState(inicial)
  return (
    <SelectMenu aria-label={rotulo} value={valor} onChange={(e) => { setValor(e.target.value); onChange?.(e.target.value) }}>
      {children}
    </SelectMenu>
  )
}

const campo = (nome = 'Fruta') => screen.getByRole('combobox', { name: nome })
const opcao = (nome: string) => screen.getByRole('option', { name: nome })
const ativa = () => campo().getAttribute('aria-activedescendant')

const matchMediaOriginal = window.matchMedia
afterEach(() => { window.matchMedia = matchMediaOriginal })

describe('SelectMenu — substituto direto do Select', () => {
  it('fechado: mostra a opção escolhida e leva o valor no botão, como o select', () => {
    render(<Controlado inicial="cereja" />)
    expect(campo()).toHaveTextContent('Cereja')
    expect(campo()).toHaveValue('cereja')
    expect(campo()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('abre no clique com a escolhida marcada; onChange só quando o valor muda', () => {
    const onChange = vi.fn()
    render(<Controlado inicial="banana" onChange={onChange} />)
    fireEvent.click(campo())
    expect(screen.getByRole('listbox', { name: 'Fruta' })).toBeInTheDocument()
    expect(opcao('Banana')).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(opcao('Banana'))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    escolherOpcao(campo(), 'damasco')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('damasco')
    expect(campo()).toHaveValue('damasco')
    expect(campo()).toHaveTextContent('Damasco')
  })

  it('valor sem opção correspondente mostra a primeira habilitada', () => {
    render(
      <SelectMenu aria-label="Fruta" value="kiwi" onChange={vi.fn()}>
        <option value="a" disabled>A</option>
        <option value="b">B</option>
      </SelectMenu>,
    )
    expect(campo()).toHaveValue('b')
    expect(campo()).toHaveTextContent('B')
  })

  it('lê opções em Fragment, array, texto misto e optgroup (e ignora false)', () => {
    const pessoas = [{ id: 'u1', nome: 'Ana', sobrenome: 'Lima' }, { id: 'u2', nome: 'Bia', sobrenome: 'Souza' }]
    render(
      <SelectMenu aria-label="Dono" value="u2" onChange={vi.fn()}>
        <option value="creator">Quem cria</option>
        {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome} {p.sobrenome}</option>)}
        {pessoas.length > 2 && <option value="x">X</option>}
        <optgroup label="Outros"><option value="none">Ninguém</option></optgroup>
      </SelectMenu>,
    )
    expect(campo('Dono')).toHaveTextContent('Bia Souza')
    expect(valoresDasOpcoes(campo('Dono'))).toEqual(['creator', 'u1', 'u2', 'none'])
    expect(rotulosDasOpcoes(campo('Dono'))).toEqual(['Quem cria', 'Ana Lima', 'Bia Souza', 'Ninguém'])
    // Os ajudantes fecham o que abriram.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('sem value, usa defaultValue e guarda a escolha sozinho', () => {
    const onValueChange = vi.fn()
    render(<SelectMenu aria-label="Fruta" defaultValue="banana" onValueChange={onValueChange}>{FRUTAS}</SelectMenu>)
    expect(campo()).toHaveTextContent('Banana')
    escolherOpcao(campo(), 'Damasco')
    expect(onValueChange).toHaveBeenCalledWith('damasco')
    expect(campo()).toHaveTextContent('Damasco')
  })

  it('com name, um input escondido leva o valor no formulário', () => {
    const { container } = render(
      <form><SelectMenu aria-label="Fruta" name="fruta" value="cereja" onChange={vi.fn()}>{FRUTAS}</SelectMenu></form>,
    )
    expect(container.querySelector('input[type="hidden"][name="fruta"]')).toHaveValue('cereja')
  })

  it('desabilitado não abre, nem pelo clique nem pelo teclado', () => {
    render(<SelectMenu aria-label="Fruta" value="banana" disabled onChange={vi.fn()}>{FRUTAS}</SelectMenu>)
    fireEvent.click(campo())
    fireEvent.keyDown(campo(), { key: 'ArrowDown' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('dentro de um FormField, o rótulo nomeia o campo e o erro o descreve', () => {
    render(
      <FormField label="Funil" error="Escolha um funil">
        <SelectMenu value="a" onChange={vi.fn()}><option value="a">Vendas</option></SelectMenu>
      </FormField>,
    )
    const c = screen.getByRole('combobox', { name: 'Funil' })
    expect(c).toHaveAttribute('aria-invalid', 'true')
    expect(c).toHaveAccessibleDescription('Escolha um funil')
  })
})

describe('SelectMenu — teclado', () => {
  it('↓ abre na escolhida, as setas pulam a desabilitada, Enter escolhe, Esc fecha sem mudar', () => {
    const onChange = vi.fn()
    render(<Controlado inicial="banana" onChange={onChange} />)
    fireEvent.keyDown(campo(), { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(ativa()).toBe(opcao('Banana').id)

    fireEvent.keyDown(campo(), { key: 'End' })
    expect(ativa()).toBe(opcao('Damasco').id)
    fireEvent.keyDown(campo(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.keyDown(campo(), { key: 'Enter' })
    expect(ativa()).toBe(opcao('Banana').id)
    fireEvent.keyDown(campo(), { key: 'ArrowDown' })
    expect(ativa()).toBe(opcao('Cereja').id) // Caju está desabilitada
    fireEvent.keyDown(campo(), { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('cereja')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('a opção desabilitada não é escolhida no clique, e o ponteiro em cima torna a outra ativa', () => {
    const onChange = vi.fn()
    render(<Controlado inicial="banana" onChange={onChange} />)
    fireEvent.click(campo())
    fireEvent.click(opcao('Caju'))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.mouseMove(opcao('Damasco'))
    expect(ativa()).toBe(opcao('Damasco').id)
  })

  it('busca por letra: abre na que começa com ela, sem acento; repetir anda; letras seguidas refinam', () => {
    const onChange = vi.fn()
    const opcoes = AREAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)
    const { unmount } = render(<Controlado rotulo="Área" inicial="saude" onChange={onChange}>{opcoes}</Controlado>)
    fireEvent.keyDown(campo('Área'), { key: 'e' })
    expect(campo('Área')).toHaveAttribute('aria-activedescendant', opcao('Educação').id)
    fireEvent.keyDown(campo('Área'), { key: 'e' })
    expect(campo('Área')).toHaveAttribute('aria-activedescendant', opcao('Estética').id)
    fireEvent.keyDown(campo('Área'), { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('estetica')
    unmount()

    render(<Controlado rotulo="Área" inicial="educacao" onChange={onChange}>{opcoes}</Controlado>)
    fireEvent.keyDown(campo('Área'), { key: 's' })
    expect(campo('Área')).toHaveAttribute('aria-activedescendant', opcao('Saúde').id)
    fireEvent.keyDown(campo('Área'), { key: 'e' })
    expect(campo('Área')).toHaveAttribute('aria-activedescendant', opcao('Segurança').id)
    fireEvent.keyDown(campo('Área'), { key: 'r' })
    expect(campo('Área')).toHaveAttribute('aria-activedescendant', opcao('Serviços').id)
    fireEvent.keyDown(campo('Área'), { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('servicos')
  })

  it('Tab com a lista aberta escolhe a ativa e fecha', () => {
    const onChange = vi.fn()
    render(<Controlado inicial="banana" onChange={onChange} />)
    fireEvent.keyDown(campo(), { key: 'ArrowDown' })
    fireEvent.keyDown(campo(), { key: 'ArrowDown' })
    fireEvent.keyDown(campo(), { key: 'Tab' })
    expect(onChange).toHaveBeenCalledWith('cereja')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('SelectMenu — camadas e cliques', () => {
  it('dentro de um Modal: a lista abre acima dele e o Esc fecha só a lista', async () => {
    const fecharModal = vi.fn()
    render(
      <LayerProvider>
        <Modal open onClose={fecharModal} title="Novo funil">
          <SelectMenu aria-label="Fruta" value="banana" onChange={vi.fn()}>{FRUTAS}</SelectMenu>
        </Modal>
      </LayerProvider>,
    )
    const camadaDoModal = screen.getByRole('dialog').parentElement as HTMLElement
    fireEvent.click(campo())
    const camadaDaLista = screen.getByRole('listbox').parentElement as HTMLElement
    await waitFor(() => expect(Number(camadaDaLista.style.zIndex)).toBeGreaterThan(Number(camadaDoModal.style.zIndex)))

    fireEvent.keyDown(campo(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(fecharModal).not.toHaveBeenCalled()

    // Com a lista fechada, o Esc volta a ser do Modal.
    fireEvent.keyDown(campo(), { key: 'Escape' })
    expect(fecharModal).toHaveBeenCalledTimes(1)
  })

  it('clique na lista ou fora dela não sobe para quem está em volta do campo', () => {
    const emVolta = vi.fn()
    render(<div onClick={emVolta} onMouseDown={emVolta}><Controlado inicial="banana" /></div>)
    fireEvent.keyDown(campo(), { key: 'ArrowDown' })
    fireEvent.mouseDown(opcao('Cereja'))
    fireEvent.click(opcao('Cereja'))
    expect(campo()).toHaveTextContent('Cereja')

    fireEvent.keyDown(campo(), { key: 'ArrowDown' })
    const camada = screen.getByRole('listbox').parentElement as HTMLElement
    fireEvent.mouseDown(camada)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    fireEvent.click(camada)
    expect(emVolta).not.toHaveBeenCalled()
  })
})

describe('SelectMenu — tela de toque', () => {
  it('com ponteiro grosso, vira o <select> nativo (o seletor do aparelho)', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    const onChange = vi.fn()
    render(<Controlado inicial="banana" onChange={onChange} />)
    expect(campo().tagName).toBe('SELECT')
    expect(valoresDasOpcoes(campo())).toEqual(['', 'banana', 'caju', 'cereja', 'damasco'])
    escolherOpcao(campo(), 'cereja')
    expect(onChange).toHaveBeenCalledWith('cereja')
  })
})
