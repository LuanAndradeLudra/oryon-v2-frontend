// Onda 2 — o campo de telefone/WhatsApp, que numa plataforma WhatsApp-first
// era um `<input>` de texto sem type, sem inputMode, sem máscara e com o
// formato vivendo só no placeholder.
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhoneField } from './PhoneField'
import { NumberField } from './NumberField'
import { FormField } from './FormField'

function Controlled({ onDigits }: { onDigits: (d: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <FormField label="WhatsApp">
      <PhoneField value={value} onChange={(d) => { setValue(d); onDigits(d) }} />
    </FormField>
  )
}

describe('PhoneField', () => {
  it('tem a semântica de telefone: type=tel, inputMode numérico e autofill', () => {
    render(<PhoneField value="" onChange={() => {}} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'tel')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveAttribute('autocomplete', 'tel')
  })

  it('mostra formatado e entrega DÍGITOS — a máscara não vaza para o estado', () => {
    const onDigits = vi.fn()
    render(<Controlled onDigits={onDigits} />)

    const input = screen.getByLabelText('WhatsApp')
    fireEvent.change(input, { target: { value: '5511999887766' } })

    // O que o formulário guarda:
    expect(onDigits).toHaveBeenLastCalledWith('5511999887766')
    // O que o humano vê:
    expect((input as HTMLInputElement).value).toBe('+55 11 99988-7766')
  })

  it('digitar com símbolos ou colar formatado dá no mesmo', () => {
    const onDigits = vi.fn()
    render(<Controlled onDigits={onDigits} />)

    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '+55 (11) 99988-7766' } })

    expect(onDigits).toHaveBeenLastCalledWith('5511999887766')
  })

  it('herda rótulo e aria do FormField — sem nada na chamada', () => {
    render(
      <FormField label="WhatsApp" required error="Número inválido">
        <PhoneField value="" onChange={() => {}} />
      </FormField>,
    )

    const input = screen.getByLabelText(/WhatsApp/)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-required')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
  })

  it('o placeholder ensina o formato, mas o hint do FormField é quem permanece', () => {
    render(
      <FormField label="WhatsApp" hint="Código do país + DDD + número">
        <PhoneField value="" onChange={() => {}} />
      </FormField>,
    )

    const input = screen.getByLabelText('WhatsApp')
    expect(input).toHaveAttribute('placeholder', '+55 11 99988-7766')
    // O hint continua na tela depois de digitar — o placeholder não.
    expect(input.getAttribute('aria-describedby')).toBe(
      screen.getByText('Código do país + DDD + número').id,
    )
  })
})

describe('NumberField', () => {
  function ControlledNumber({ onValue, ...rest }: { onValue: (v: number | null) => void; min?: number; max?: number }) {
    const [value, setValue] = useState<number | null>(null)
    return (
      <FormField label="Cadência">
        <NumberField value={value} onChange={(v) => { setValue(v); onValue(v) }} {...rest} />
      </FormField>
    )
  }

  it('é text + inputMode numérico — imune à roda do mouse que o type=number sofre', () => {
    render(<NumberField value={null} onChange={() => {}} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('inputmode', 'numeric')
  })

  it('campo vazio devolve null, não NaN', () => {
    const onValue = vi.fn()
    render(<ControlledNumber onValue={onValue} />)

    const input = screen.getByLabelText('Cadência')
    fireEvent.change(input, { target: { value: '7' } })
    expect(onValue).toHaveBeenLastCalledWith(7)

    fireEvent.change(input, { target: { value: '' } })
    expect(onValue).toHaveBeenLastCalledWith(null)
  })

  it('descarta o que não é dígito em vez de aceitar e falhar no submit', () => {
    const onValue = vi.fn()
    render(<ControlledNumber onValue={onValue} />)

    fireEvent.change(screen.getByLabelText('Cadência'), { target: { value: '1a2b' } })

    expect(onValue).toHaveBeenLastCalledWith(12)
  })

  it('min/max só se aplicam no blur — corrigir a cada tecla impediria apagar para reescrever', () => {
    const onValue = vi.fn()
    render(<ControlledNumber onValue={onValue} min={1} max={50} />)

    const input = screen.getByLabelText('Cadência')
    fireEvent.change(input, { target: { value: '99' } })
    expect(onValue).toHaveBeenLastCalledWith(99) // ainda digitando, não mexe

    fireEvent.blur(input)
    expect(onValue).toHaveBeenLastCalledWith(50)
  })
})
