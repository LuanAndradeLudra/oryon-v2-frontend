// Revisão 02/10: a ficha acoplada de Contatos não remonta ao trocar de contato
// (↑↓). Os cartões precisam acompanhar o contato novo — antes "Salvar" gravava
// os dados do contato anterior no atual.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/services/api', () => ({ contactsApi: { getCustomFieldDefs: vi.fn(async () => ({ data: [] })) } }))

import { ContactInfoCard } from './ContactInfoCard'
import { CustomFieldsCard } from './CustomFieldsCard'
import type { Contact } from '@/types'

const A = { id: 'A', email: 'a@email.example', company: 'Empresa A', customFields: [{ key: 'plano', label: 'Plano', value: 'Ouro', type: 'text' }] } as unknown as Contact
const B = { id: 'B', email: 'b@email.example', company: 'Empresa B', customFields: [{ key: 'plano', label: 'Plano', value: 'Prata', type: 'text' }] } as unknown as Contact

describe('ficha acoplada · troca de contato', () => {
  it('Dados: a edição aberta em A fecha, e salvar em B grava os dados de B', async () => {
    const onSave = vi.fn(async () => {})
    const { rerender } = render(<ContactInfoCard contact={A} onSave={onSave} flat />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar dados' }))
    rerender(<ContactInfoCard contact={B} onSave={onSave} flat />)
    expect(screen.queryByDisplayValue('a@email.example')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Editar dados' }))
    expect(screen.getByDisplayValue('b@email.example')).toBeInTheDocument()
  })

  it('Campos personalizados mostram os de B depois da troca', () => {
    const { rerender } = render(<CustomFieldsCard contact={A} onSave={vi.fn(async () => {})} flat />)
    expect(screen.getByText('Ouro')).toBeInTheDocument()
    rerender(<CustomFieldsCard contact={B} onSave={vi.fn(async () => {})} flat />)
    expect(screen.queryByText('Ouro')).toBeNull()
    expect(screen.getByText('Prata')).toBeInTheDocument()
  })
})
