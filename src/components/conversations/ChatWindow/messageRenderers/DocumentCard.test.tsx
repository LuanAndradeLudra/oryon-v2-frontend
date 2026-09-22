// Card de documento estilo WhatsApp — miniatura + selo colorido + metadados
// (pedido do usuário 2026-09-22, sem card de Jira).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentCard } from './DocumentCard'
import type { Message } from '@/types'

// mediaThumbnailUrl resolve via useAuthenticatedMediaSrc → getUploadsAuthToken
// (chamada real de API) — mockado pra não sair rede nenhuma nesses testes.
vi.mock('@/services/api', () => ({
  getUploadsAuthToken: vi.fn(() => Promise.resolve('fake-token')),
}))

const base: Message = {
  id: 'm1',
  conversationId: 'c1',
  direction: 'inbound',
  type: 'document',
  status: 'delivered',
  sentAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  mediaUrl: '/uploads/tenant-1/doc.pdf',
  mediaCaption: 'DAS-PGMEI.pdf',
}

describe('DocumentCard', () => {
  it('com metadados completos: mostra "N página(s) · TIPO · tamanho"', () => {
    render(<DocumentCard message={{ ...base, mediaPageCount: 1, mediaSizeBytes: 158 * 1024 }} />)
    expect(screen.getByText('1 página · PDF · 158 KB')).toBeInTheDocument()
    expect(screen.getByText('DAS-PGMEI.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument() // selo colorido
  })

  it('plural de páginas', () => {
    render(<DocumentCard message={{ ...base, mediaPageCount: 3 }} />)
    expect(screen.getByText(/^3 páginas/)).toBeInTheDocument()
  })

  it('com legenda: mostra pelo menos a extensão, mesmo sem tamanho/páginas (mensagem antiga)', () => {
    render(<DocumentCard message={base} />)
    expect(screen.getByText('PDF', { selector: 'p' })).toBeInTheDocument()
  })

  it('sem legenda e sem extensão reconhecível (nem dado real nenhum): cai no fallback "Toque para abrir"', () => {
    render(<DocumentCard message={{ ...base, mediaCaption: undefined, mediaUrl: '/uploads/tenant-1/media_123' }} />)
    expect(screen.getByText('Toque para abrir')).toBeInTheDocument()
  })

  it('selo colorido varia por extensão, no fallback por nome (DOCX → DOC azul, XLSX → XLS verde)', () => {
    const { rerender } = render(<DocumentCard message={{ ...base, mediaCaption: 'relatorio.docx' }} />)
    expect(screen.getByText('DOC')).toBeInTheDocument()
    rerender(<DocumentCard message={{ ...base, mediaCaption: 'planilha.xlsx' }} />)
    expect(screen.getByText('XLS')).toBeInTheDocument()
  })

  it('mediaMimeType tem prioridade sobre o nome — achado real: inbound com LEGENDA DE TEXTO (não nome de arquivo) ainda acerta o selo', () => {
    // waMsg.document.caption é o que o CLIENTE digitou ao enviar — pode ser
    // qualquer texto, sem relação nenhuma com o nome/extensão do arquivo.
    render(
      <DocumentCard
        message={{ ...base, mediaCaption: 'Segue o comprovante', mediaMimeType: 'application/pdf' }}
      />,
    )
    expect(screen.getByText('Segue o comprovante')).toBeInTheDocument()
    expect(screen.getByText('PDF', { selector: 'p' })).toBeInTheDocument()
  })

  it('mediaMimeType presente mas sem correspondência no mapa: cai no fallback por nome, não em ARQ direto', () => {
    render(<DocumentCard message={{ ...base, mediaCaption: 'planilha.xlsx', mediaMimeType: 'application/octet-stream' }} />)
    expect(screen.getByText('XLS')).toBeInTheDocument()
  })

  it('sem miniatura: não renderiza <img>', () => {
    const { container } = render(<DocumentCard message={base} />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('com miniatura (mediaThumbnailUrl): renderiza <img>', () => {
    const { container } = render(<DocumentCard message={{ ...base, mediaThumbnailUrl: '/uploads/tenant-1/thumb.png' }} />)
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('clique chama onOpen', () => {
    const onOpen = vi.fn()
    render(<DocumentCard message={base} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
