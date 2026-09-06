import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateCard } from './TemplateCard'
import type { TemplateStatus, WhatsAppTemplate } from '@/types'

function tpl(patch: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  return {
    id: 't1',
    tenantId: 'tenant',
    name: 'novo_lancamento_v2',
    language: 'pt_BR',
    category: 'MARKETING',
    status: 'APPROVED' as TemplateStatus,
    body: 'Oi {{1}}, a nova coleção chegou',
    bodyVariables: ['nome'],
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...patch,
  }
}

function renderCard(props: Partial<Parameters<typeof TemplateCard>[0]> = {}) {
  const handlers = { onEdit: vi.fn(), onUse: vi.fn(), onRewrite: vi.fn() }
  const view = render(<TemplateCard template={tpl()} canEdit {...handlers} {...props} />)
  return { ...handlers, container: view.container }
}

describe('TemplateCard', () => {
  it('mostra o corpo do template como bolha, não como texto cru numa lista', () => {
    renderCard()
    // O corpo vem do TemplatePreview — se o card parasse de montar a prévia,
    // este texto sumiria e o card viraria só um rótulo.
    expect(screen.getByText(/a nova coleção chegou/)).toBeInTheDocument()
    expect(screen.getByText('novo_lancamento_v2')).toBeInTheDocument()
    expect(screen.getByText('Aprovado')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('sem BE.8 a linha de metadados não fala de uso — nem para dizer zero', () => {
    renderCard()
    expect(screen.getByText('pt-BR · 1 variável')).toBeInTheDocument()
    expect(screen.queryByText(/usado/)).not.toBeInTheDocument()
  })

  it('com BE.8 o uso entra na mesma linha, no lugar do mockup', () => {
    renderCard({ usageLabel: 'usado 12× · última hoje' })
    expect(screen.getByText('pt-BR · 1 variável · usado 12× · última hoje')).toBeInTheDocument()
  })

  it('em análise diz que aguarda a Meta, sem inventar quanto tempo faz', () => {
    // "enviado à Meta há 6h" precisaria de `submittedAt`, que não existe:
    // `updatedAt` erra assim que alguém edita o template depois de enviar.
    renderCard({ template: tpl({ status: 'PENDING' }), usageLabel: 'usado 12×' })
    expect(screen.getByText('pt-BR · 1 variável · aguardando resposta da Meta')).toBeInTheDocument()
    expect(screen.getByText('Em análise')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Usar/ })).toBeDisabled()
  })

  it('recusado troca metadados e ações pelo motivo da Meta e pela correção', () => {
    const handlers = renderCard({
      template: tpl({ status: 'REJECTED', rejectionReason: 'linguagem promocional excessiva.' }),
    })
    expect(screen.getByText(/linguagem promocional excessiva/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Usar/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Reescrever com a IA/ }))
    expect(handlers.onRewrite).toHaveBeenCalledOnce()
  })

  it('aprovado sem permissão de edição mostra o lápis desabilitado, com o motivo', () => {
    // Esconder o botão faria parecer que ele faltou; a decisão do plano é
    // mantê-lo visível e explicar por que não dá.
    renderCard({ canEdit: false, editBlockedReason: 'A Meta não permite editar um template aprovado' })
    const pencil = screen.getByRole('button', { name: 'Editar template' })
    expect(pencil).toBeDisabled()
    expect(pencil).toHaveAttribute('title', 'A Meta não permite editar um template aprovado')
  })

  it('"Usar" dispara o callback só quando o template está aprovado', () => {
    const handlers = renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Usar/ }))
    expect(handlers.onUse).toHaveBeenCalledOnce()
  })

  it('template de autenticação não oferece "Usar" — quem dispara é o login', () => {
    renderCard({ template: tpl({ category: 'AUTHENTICATION' }) })
    expect(screen.getByText('Autenticação')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Usar/ })).not.toBeInTheDocument()
  })

  it('a prévia sai na paleta escura do WhatsApp, não na clara do Composer', () => {
    // Sem `theme="dark"` o card escuro mostraria um retângulo branco, e nada
    // além desta asserção pegaria: a prop tem padrão claro e o `tsc` fica
    // feliz dos dois jeitos.
    const { container } = renderCard()
    const painted = container.querySelector('[style*="--wa-chat"]')
    expect(painted?.getAttribute('style')).toContain('#0B141A')
    expect(container.innerHTML).not.toContain('#ECE5DD')
  })

  it('conta botões e variáveis no singular e no plural', () => {
    renderCard({
      template: tpl({
        bodyVariables: ['nome', 'link'],
        buttons: [{ type: 'URL', text: 'Ver coleção', url: 'https://x.test' }],
      }),
    })
    expect(screen.getByText('pt-BR · 2 variáveis · 1 botão')).toBeInTheDocument()
  })
})
