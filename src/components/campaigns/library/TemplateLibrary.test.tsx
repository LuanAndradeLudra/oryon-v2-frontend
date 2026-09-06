import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TemplateLibrary } from './TemplateLibrary'
import type { TemplateStatus, WhatsAppTemplate } from '@/types'

const listWithUsage = vi.fn()
const listAutomations = vi.fn()
const numbers = vi.fn()

vi.mock('@/services/campaignsV2Api', () => ({
  templatesV2Api: {
    listWithUsage: () => listWithUsage(),
    rewrite: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  automationsApi: { list: () => listAutomations() },
}))

vi.mock('@/contexts/WorkspaceNumberContext', () => ({
  useWorkspaceNumber: () => numbers(),
}))

/** Erro que o `withFallback` lê como "endpoint ainda não existe". */
function notFound() {
  return Object.assign(new Error('Not Found'), { response: { status: 404 } })
}

let seq = 0
function tpl(patch: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  seq += 1
  return {
    id: `t${seq}`,
    tenantId: 'tenant',
    name: `template_${seq}`,
    language: 'pt_BR',
    category: 'MARKETING',
    status: 'APPROVED' as TemplateStatus,
    body: `Corpo do template ${seq}`,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...patch,
  }
}

function renderLibrary(templates: WhatsAppTemplate[], props: Partial<Parameters<typeof TemplateLibrary>[0]> = {}) {
  const handlers = {
    onCreate: vi.fn(), onEdit: vi.fn(), onUse: vi.fn(), onRewrite: vi.fn(),
    onDelete: vi.fn(), onDuplicate: vi.fn(), onAssignWaba: vi.fn(),
  }
  render(
    <TemplateLibrary
      templates={templates}
      loading={false}
      canCreate
      deletingId={null}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('TemplateLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    seq = 0
    listWithUsage.mockRejectedValue(notFound())
    listAutomations.mockResolvedValue({ data: [] })
    numbers.mockReturnValue({ numbers: [], loading: false })
  })

  it('monta o rail com contagem e a grade com um card por template', async () => {
    renderLibrary([tpl(), tpl({ status: 'REJECTED', rejectionReason: 'motivo' })])

    expect(await screen.findByText('Status Meta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Todos/ })).toHaveTextContent('2')
    expect(screen.getByText('template_1')).toBeInTheDocument()
    expect(screen.getByText('template_2')).toBeInTheDocument()
  })

  it('filtrar pelo rail muda a grade e as contagens dos outros eixos', async () => {
    renderLibrary([
      tpl({ category: 'MARKETING' }),
      tpl({ category: 'UTILITY' }),
      tpl({ category: 'UTILITY', status: 'PENDING' }),
    ])

    fireEvent.click(await screen.findByRole('button', { name: /Utilidade/ }))

    expect(screen.queryByText('template_1')).not.toBeInTheDocument()
    expect(screen.getByText('template_2')).toBeInTheDocument()
    // A contagem de situação passa a falar DENTRO de Utilidade: 1 aprovado,
    // não os 2 da base inteira. Sem isso o rail mostra número que não bate
    // com a grade.
    expect(screen.getByRole('button', { name: /Aprovados/ })).toHaveTextContent('1')
  })

  it('a busca casa nome E corpo — o nome é snake_case técnico', async () => {
    renderLibrary([tpl({ name: 'promocao_relampago' }), tpl({ body: 'Seu carrinho está esperando' })])

    fireEvent.change(await screen.findByRole('searchbox', { name: /Buscar template/ }), {
      target: { value: 'carrinho' },
    })

    expect(screen.queryByText('promocao_relampago')).not.toBeInTheDocument()
    expect(screen.getByText('template_2')).toBeInTheDocument()
  })

  it('sem BE.8 não existe grupo "Uso" nem rótulo de ordenação por uso', async () => {
    renderLibrary([tpl()])

    expect(await screen.findByText(/ordenado por atualização/)).toBeInTheDocument()
    expect(screen.queryByText('Uso')).not.toBeInTheDocument()
    expect(screen.queryByText(/ordenado por uso/)).not.toBeInTheDocument()
  })

  it('com BE.8 o uso entra no card, no rail e na ordenação', async () => {
    const a = tpl()
    const b = tpl()
    listWithUsage.mockResolvedValue({
      data: [
        { ...a, usageCount: 0, lastUsedAt: null },
        { ...b, usageCount: 31, lastUsedAt: '2026-09-01T10:00:00Z' },
      ],
    })

    renderLibrary([a, b])

    expect(await screen.findByText(/ordenado por uso/)).toBeInTheDocument()
    expect(screen.getByText(/usado 31×/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nunca usados/ })).toHaveTextContent('1')
  })

  it('atribui o template à automação que o dispara, e só a automações', async () => {
    const t = tpl()
    listAutomations.mockResolvedValue({
      data: [{
        id: 'a1',
        name: 'carrinho 2h',
        actions: [{ type: 'send_message', templateId: t.id, templateName: t.name }],
      }],
    })

    renderLibrary([t])

    // "Usados por agentes" do mockup não tem dado: nenhum agente referencia
    // template no produto.
    expect(await screen.findByText('Automação "carrinho 2h"')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Usados em automações/ })).toHaveTextContent('1')
    expect(screen.queryByText(/Usados por agentes/)).not.toBeInTheDocument()
  })

  it('o grupo "Linha" só existe em conta multilinha', async () => {
    numbers.mockReturnValue({
      numbers: [
        { id: 'n1', label: 'Vendas', displayPhoneNumber: '5511999998888' },
        { id: 'n2', label: 'Suporte', displayPhoneNumber: '5511777776666' },
      ],
      loading: false,
    })

    renderLibrary([tpl({ whatsappNumberId: 'n1' }), tpl({ whatsappNumberId: 'n2' }), tpl()])

    expect(await screen.findByText('Linha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Todas as linhas/ })).toHaveTextContent('3')
    // Vendas conta 2: o template dela MAIS o legado sem `whatsappNumberId`.
    // `lineMatches` deixa o legado visível em qualquer linha de propósito —
    // escondê-lo tornaria a lacuna da Migration #045 invisível justamente
    // para quem precisa resolvê-la. Suporte conta pelo mesmo motivo.
    expect(screen.getByRole('button', { name: /Vendas/ })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: /Suporte/ })).toHaveTextContent('2')
  })

  it('duplicar só é oferecido em conta multilinha', async () => {
    renderLibrary([tpl()])
    expect(await screen.findByText('template_1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Duplicar/ })).not.toBeInTheDocument()
  })

  it('convida a criar só quando a base está vazia E há linha conectada', async () => {
    renderLibrary([], { canCreate: false })
    expect(await screen.findByText('Nenhum template ainda')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Criar primeiro template/ })).not.toBeInTheDocument()
  })

  it('base cheia com filtro sem resultado não convida a criar: convida a afrouxar', async () => {
    renderLibrary([tpl({ status: 'APPROVED' })])

    fireEvent.change(await screen.findByRole('searchbox', { name: /Buscar template/ }), {
      target: { value: 'nao-existe-nada-assim' },
    })

    expect(screen.getByText('Nenhum template com esse filtro')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Criar primeiro template/ })).not.toBeInTheDocument()
  })

  it('devolve o filtro para "todos" quando a opção escolhida some do rail', async () => {
    // Categoria é o caso real: `buildRail` só devolve as que a conta usa. As
    // situações aprovado/em análise/rejeitado ficam SEMPRE no rail, mesmo
    // zeradas — lá o filtro continua visível com "0" ao lado, que é honesto,
    // e por isso o reconcile não mexe nelas.
    const only = (list: WhatsAppTemplate[]) => (
      <TemplateLibrary
        templates={list}
        loading={false}
        canCreate
        deletingId={null}
        onCreate={vi.fn()} onEdit={vi.fn()} onUse={vi.fn()} onRewrite={vi.fn()}
        onDelete={vi.fn()} onDuplicate={vi.fn()} onAssignWaba={vi.fn()}
      />
    )
    const utility = tpl({ category: 'UTILITY' })
    const { rerender } = render(only([utility, tpl({ category: 'MARKETING' })]))

    fireEvent.click(await screen.findByRole('button', { name: /Utilidade/ }))
    expect(screen.getByText(utility.name)).toBeInTheDocument()

    // A sincronização com a Meta apaga o último de Utilidade enquanto o
    // filtro está ligado: a opção some do rail e o filtro ficaria invisível.
    rerender(only([tpl({ category: 'MARKETING' })]))

    await waitFor(() => expect(screen.queryByRole('button', { name: /Utilidade/ })).not.toBeInTheDocument())
    expect(screen.getByText('template_3')).toBeInTheDocument()
  })

  it('as ações do card chegam ao dono do fluxo', async () => {
    const handlers = renderLibrary([tpl()])

    fireEvent.click(await screen.findByRole('button', { name: /Usar/ }))
    expect(handlers.onUse).toHaveBeenCalledWith(expect.objectContaining({ name: 'template_1' }))

    fireEvent.click(screen.getByRole('button', { name: 'Excluir template' }))
    expect(handlers.onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: 'template_1' }))
  })
})
