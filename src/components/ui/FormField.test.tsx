// Onda 1 da auditoria de interface — a ligação rótulo ↔ campo.
//
// Antes destes testes, `htmlFor` não aparecia uma única vez em todo o frontend:
// nenhum campo da plataforma tinha nome acessível, clicar no rótulo não focava
// nada, e `hint`/`error` não eram anunciados. O `FormField` é o ponto único que
// corrige isso para ~75 campos — daí valer travar o comportamento aqui.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from './FormField'
import { Input } from './Input'
import { Select } from './Select'
import { Textarea } from './Textarea'

describe('FormField — ligação rótulo ↔ campo', () => {
  it('associa o rótulo ao Input: getByLabelText encontra o campo', () => {
    render(
      <FormField label="Nome do funil">
        <Input placeholder="Ex: Suporte" />
      </FormField>,
    )

    const input = screen.getByLabelText('Nome do funil')
    expect(input.tagName).toBe('INPUT')
    // O `htmlFor` do rótulo aponta para o `id` do campo — não é coincidência de texto.
    expect(screen.getByText('Nome do funil').getAttribute('for')).toBe(input.id)
    expect(input.id).toBeTruthy()
  })

  it('funciona com Select e com Textarea', () => {
    render(
      <>
        <FormField label="Tipo">
          <Select><option value="a">A</option></Select>
        </FormField>
        <FormField label="Observação">
          <Textarea />
        </FormField>
      </>,
    )

    expect(screen.getByLabelText('Tipo').tagName).toBe('SELECT')
    expect(screen.getByLabelText('Observação').tagName).toBe('TEXTAREA')
  })

  it('atravessa wrappers — o campo dentro de um <div> continua ligado ao rótulo', () => {
    // Caso real: ícone posicionado sobre o campo exige um `div.relative` em volta.
    // É exatamente onde `cloneElement` falharia em silêncio.
    render(
      <FormField label="Buscar">
        <div className="relative">
          <span>🔍</span>
          <Input />
        </div>
      </FormField>,
    )

    expect(screen.getByLabelText('Buscar').tagName).toBe('INPUT')
  })

  it('campo nativo passado direto também recebe o id (sem contexto)', () => {
    render(
      <FormField label="Chave">
        <input data-testid="raw" />
      </FormField>,
    )

    expect(screen.getByLabelText('Chave')).toBe(screen.getByTestId('raw'))
  })

  it('o id do FormField manda: fixa o campo E o htmlFor do rótulo', () => {
    render(
      <FormField label="Nome" id="campo-nome">
        <Input />
      </FormField>,
    )

    const input = screen.getByLabelText('Nome')
    expect(input.id).toBe('campo-nome')
    expect(screen.getByText('Nome').getAttribute('for')).toBe('campo-nome')
  })

  it('id passado no primitivo dentro de um FormField é ignorado — o rótulo nunca aponta para o vazio', () => {
    // Deixar a prop vencer traria de volta o defeito original: o `htmlFor`
    // continuaria no id gerado e o campo teria outro. Quem precisa de id fixo
    // usa a prop do FormField (teste acima).
    render(
      <FormField label="Nome">
        <Input id="ignorado" />
      </FormField>,
    )

    const input = screen.getByLabelText('Nome')
    expect(input.id).not.toBe('ignorado')
    expect(screen.getByText('Nome').getAttribute('for')).toBe(input.id)
  })
})

describe('FormField — hint, erro e obrigatoriedade', () => {
  it('hint é anunciado pelo campo via aria-describedby', () => {
    render(
      <FormField label="Valor" hint="Somente números">
        <Input />
      </FormField>,
    )

    const input = screen.getByLabelText('Valor')
    const hint = screen.getByText('Somente números')
    expect(input.getAttribute('aria-describedby')).toBe(hint.id)
    expect(hint.id).toBeTruthy()
  })

  it('erro: aria-invalid, aria-describedby apontando para a mensagem e role=alert', () => {
    render(
      <FormField label="E-mail" error="E-mail inválido">
        <Input />
      </FormField>,
    )

    const input = screen.getByLabelText('E-mail')
    const err = screen.getByRole('alert')
    expect(err).toHaveTextContent('E-mail inválido')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(err.id)
  })

  it('com erro, o campo do DS também ganha a borda de perigo (antes só a mensagem ficava vermelha)', () => {
    render(
      <FormField label="E-mail" error="inválido">
        <Input />
      </FormField>,
    )

    expect(screen.getByLabelText('E-mail').className).toContain('border-danger')
  })

  it('o erro substitui o hint — descreve um, nunca os dois (o hint some da tela)', () => {
    render(
      <FormField label="Valor" hint="Somente números" error="Obrigatório">
        <Input />
      </FormField>,
    )

    expect(screen.queryByText('Somente números')).toBeNull()
    const input = screen.getByLabelText('Valor')
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
  })

  it('required vira aria-required, e o asterisco é decoração (aria-hidden)', () => {
    render(
      <FormField label="Nome" required>
        <Input />
      </FormField>,
    )

    // `exact: false`: o rótulo carrega o asterisco junto do texto.
    expect(screen.getByLabelText('Nome', { exact: false }).getAttribute('aria-required')).toBe('true')
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
  })

  it('requirement="required" também marca aria-required (o selo textual é o outro sinal)', () => {
    render(
      <FormField label="Nome" requirement="required">
        <Input />
      </FormField>,
    )

    // O selo "Obrigatório" NÃO é aria-hidden de propósito: é informação, e
    // entra no nome acessível ("Nome Obrigatório") junto com o aria-required.
    expect(screen.getByLabelText(/Nome/).getAttribute('aria-required')).toBe('true')
    expect(screen.getByText('Obrigatório')).toBeInTheDocument()
  })

  it('sem hint e sem erro não inventa aria-describedby', () => {
    render(
      <FormField label="Nome"><Input /></FormField>,
    )

    expect(screen.getByLabelText('Nome').getAttribute('aria-describedby')).toBeNull()
  })
})

describe('primitivos fora do FormField', () => {
  it('Input isolado continua funcionando, sem id nem aria inventados', () => {
    render(<Input placeholder="solto" />)

    const input = screen.getByPlaceholderText('solto')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.getAttribute('aria-describedby')).toBeNull()
    expect(input.id).toBe('')
  })

  it('Input isolado com error mantém a borda de perigo (comportamento anterior preservado)', () => {
    render(<Input placeholder="x" error="ruim" />)

    const input = screen.getByPlaceholderText('x')
    expect(input.className).toContain('border-danger')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('dois FormFields na mesma tela geram ids distintos', () => {
    render(
      <>
        <FormField label="Um"><Input /></FormField>
        <FormField label="Dois"><Input /></FormField>
      </>,
    )

    expect(screen.getByLabelText('Um').id).not.toBe(screen.getByLabelText('Dois').id)
  })
})
