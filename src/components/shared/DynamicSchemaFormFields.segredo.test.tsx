// Revisão 02/10: a marca "__SECRET_SET__" (segredo já guardado) não pode virar
// texto editável — colar o token novo com o cursor no fim gravava a marca
// concatenada como credencial.
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DynamicSchemaFormFields } from './DynamicSchemaFormFields'

const SCHEMA = { type: 'object', properties: { token: { type: 'string', title: 'Token', secret: true } } }

function Harness({ onValues }: { onValues: (v: Record<string, unknown>) => void }) {
  const [values, setValues] = useState<Record<string, unknown>>({ token: '__SECRET_SET__' })
  return <DynamicSchemaFormFields schema={SCHEMA as never} values={values} onChange={(v) => { setValues(v); onValues(v) }} />
}

describe('campo secreto com segredo guardado', () => {
  it('mostra vazio, digitar substitui por inteiro e apagar volta a manter o guardado', () => {
    const onValues = vi.fn()
    const { container } = render(<Harness onValues={onValues} />)
    const campo = container.querySelector('input') as HTMLInputElement
    expect(campo.value).toBe('')
    expect(campo.placeholder).toMatch(/Salvo/)
    fireEvent.change(campo, { target: { value: 'abc123' } })
    expect(onValues).toHaveBeenLastCalledWith({ token: 'abc123' })
    fireEvent.change(campo, { target: { value: '' } })
    expect(onValues).toHaveBeenLastCalledWith({ token: '__SECRET_SET__' })
    expect(screen.queryByDisplayValue(/__SECRET_SET__/)).toBeNull()
  })
})
