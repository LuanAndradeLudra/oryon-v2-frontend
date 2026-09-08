import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComposerPhonePreview } from './ComposerPhonePreview'
import type { CampaignVariableMapping, Contact, WhatsAppTemplate } from '@/types'

const TEMPLATE = {
  id: 'tpl_1', name: 'novo_lancamento_v2', category: 'MARKETING', language: 'pt_BR',
  status: 'APPROVED', body: 'Oi {{1}}, a coleção da {{2}} chegou',
  bodyVariables: ['nome', 'empresa'],
} as unknown as WhatsAppTemplate

const CONTATOS = [
  { id: 'c1', displayName: 'Marina Torres', waId: '5511999990001', company: 'Nuvem Moda' },
  { id: 'c2', displayName: 'João Prado',    waId: '5511999990002' },
] as unknown as Contact[]

const MAPPINGS = [
  { position: 1, variableName: 'nome',    source: 'contact_field', contactField: 'displayName' },
  { position: 2, variableName: 'empresa', source: 'contact_field', contactField: 'company' },
] as unknown as CampaignVariableMapping[]

function renderPhone(over: Partial<Parameters<typeof ComposerPhonePreview>[0]> = {}) {
  return render(
    <ComposerPhonePreview
      template={TEMPLATE}
      mappings={MAPPINGS}
      contacts={CONTATOS}
      {...over}
    />,
  )
}

describe('ComposerPhonePreview — o telefone mostra a mensagem com dado real', () => {
  it('renderiza o corpo do template com os dados do primeiro contato', () => {
    renderPhone()
    expect(screen.getByText(/Oi Marina Torres, a coleção da Nuvem Moda chegou/)).toBeInTheDocument()
  })

  it('variável sem dado no contato fica visível como {{n}}, em vez de sumir', () => {
    // O João não tem empresa. Mostrar a mensagem sem a lacuna esconderia
    // exatamente o risco que o operador precisa ver antes de disparar.
    renderPhone({ contacts: [CONTATOS[1]] })
    expect(screen.getByText(/Oi João Prado, a coleção da \{\{2\}\} chegou/)).toBeInTheDocument()
  })

  it('o seletor nomeia o primeiro contato, e "aleatório" troca de pessoa', () => {
    renderPhone()
    fireEvent.click(screen.getByRole('tab', { name: 'Marina T.' }))
    expect(screen.getByText(/Oi Marina Torres/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'aleatório' }))
    expect(screen.getByText(/Oi João Prado/)).toBeInTheDocument()
  })

  it('sem contatos carregados não há seletor, e nada de gente inventada', () => {
    renderPhone({ contacts: [] })
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByText(/Oi \{\{1\}\}, a coleção da \{\{2\}\} chegou/)).toBeInTheDocument()
  })

  it('sem template escolhido, o telefone convida a escolher em vez de mostrar bolha vazia', () => {
    renderPhone({ template: null })
    expect(screen.getByText(/Escolha um template para ver como a mensagem chega/)).toBeInTheDocument()
    expect(screen.queryByText(/Oi /)).not.toBeInTheDocument()
  })

  it('o remetente é a linha escolhida; sem linha, um texto neutro e não um nome inventado', () => {
    const { unmount } = renderPhone({ senderName: 'Nuvem Moda' })
    expect(screen.getByText('Nuvem Moda')).toBeInTheDocument()
    unmount()

    renderPhone()
    expect(screen.getByText('Sua conta comercial')).toBeInTheDocument()
  })

  it('contato sem nome nao esconde o seletor inteiro, apenas troca o rotulo', () => {
    // Antes, "ha' contatos?" e "o primeiro tem nome?" moravam na mesma
    // condicao, entao um nome em branco levava junto o botao "aleatorio", que
    // funcionaria (N3 do Calibre).
    renderPhone({ contacts: [{ ...CONTATOS[0], displayName: '  ' }, CONTATOS[1]] as Contact[] })
    expect(screen.getByRole('tab', { name: '1º da base' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'aleatório' }))
    expect(screen.getByText(/Oi João Prado/)).toBeInTheDocument()
  })

  it('nao promete "como o cliente ve": a amostra vem da base, nao do publico', () => {
    // A fonte e' `contactsApi.list`, os 500 primeiros contatos do tenant SEM
    // filtro. Prometer "o cliente" faria a tela garantir justamente o que ela
    // nao pode checar (F2 do Calibre).
    renderPhone()
    expect(screen.queryByText(/como o cliente vê/i)).not.toBeInTheDocument()
    expect(screen.getByText(/exemplo da sua base/i)).toBeInTheDocument()
    expect(screen.getByText(/não necessariamente do público deste disparo/i)).toBeInTheDocument()
  })
})
