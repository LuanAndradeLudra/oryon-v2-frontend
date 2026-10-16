// SCRUM-1158 — achado do usuário: mensagem de imagem/vídeo/documento recebida
// mostrava a legenda DUAS vezes (uma vez em MediaContent, embaixo da mídia;
// outra vez neste TextContent, num parágrafo à parte) porque body e
// mediaCaption vêm da MESMA legenda da Meta (inbound-message.extractor.ts) e
// image/video/document não estavam em STRUCTURED_TYPES.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TextContent, legendaDaMidia, textoDoDocumento } from './MessageBubble'
import type { Message } from '@/types'

const baseMessage: Message = {
  id: 'm1',
  conversationId: 'c1',
  direction: 'inbound',
  type: 'text',
  status: 'delivered',
  sentAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
}

describe('TextContent', () => {
  it('mensagem de texto normal: renderiza o body (comportamento de sempre, não pode quebrar)', () => {
    const { container } = render(<TextContent message={{ ...baseMessage, type: 'text', body: 'Oi, tudo bem?' }} />)
    expect(container.textContent).toBe('Oi, tudo bem?')
  })

  it.each(['image', 'video', 'document'] as const)(
    'mídia (%s) com legenda: NÃO renderiza o body — MediaContent já mostra essa legenda embaixo da mídia',
    (type) => {
      const { container } = render(
        <TextContent message={{ ...baseMessage, type, body: 'Confirmado para quinta às 14h', mediaUrl: '/uploads/x' }} />,
      )
      expect(container.textContent).toBe('')
    },
  )

  it('imagem sem legenda (body null): continua sem renderizar nada — não regride pra "null" literal na tela', () => {
    const { container } = render(<TextContent message={{ ...baseMessage, type: 'image', body: undefined, mediaUrl: '/uploads/x' }} />)
    expect(container.textContent).toBe('')
  })

  it('áudio/figurinha: body já é sempre null no backend, mas confirma que não renderiza se vier preenchido por engano', () => {
    // audio/sticker não entraram no STRUCTURED_TYPES (body sempre null pra eles,
    // extractor.ts) — se algum dia um body vazar aqui, isto pega a regressão.
    const { container: audio } = render(<TextContent message={{ ...baseMessage, type: 'audio', body: undefined }} />)
    expect(audio.textContent).toBe('')
  })

  it('localização/reação seguem sem renderizar body (comportamento já existente, não pode regredir)', () => {
    const { container: loc } = render(<TextContent message={{ ...baseMessage, type: 'location', body: '[Localização compartilhada]' }} />)
    expect(loc.textContent).toBe('')
    const { container: reac } = render(<TextContent message={{ ...baseMessage, type: 'reaction', body: '👍' }} />)
    expect(reac.textContent).toBe('')
  })
})

// SCRUM-1161 (produção 15/10): imagem enviada pelo operador com texto — o
// texto estava só em `body` e a bolha lia a legenda só de `mediaCaption`.
describe('legendaDaMidia / textoDoDocumento', () => {
  it('imagem/vídeo do operador (linha antiga, mediaCaption null): usa o body', () => {
    expect(legendaDaMidia({ ...baseMessage, direction: 'outbound', type: 'image', body: 'Segue o pedido', mediaCaption: null } as unknown as Message)).toBe('Segue o pedido')
    expect(legendaDaMidia({ ...baseMessage, direction: 'outbound', type: 'video', body: 'Veja', mediaCaption: undefined })).toBe('Veja')
  })

  it('recebimento (body = mediaCaption): uma legenda só', () => {
    expect(legendaDaMidia({ ...baseMessage, type: 'image', body: 'Oi', mediaCaption: 'Oi' })).toBe('Oi')
  })

  it('sem texto: null', () => {
    expect(legendaDaMidia({ ...baseMessage, type: 'image' })).toBeNull()
  })

  it('documento com texto do operador: mostra o texto (título segue o nome do arquivo)', () => {
    expect(textoDoDocumento({ ...baseMessage, type: 'document', body: 'Assine e devolva', mediaCaption: 'contrato.pdf' })).toBe('Assine e devolva')
  })

  it('documento recebido com legenda (body = mediaCaption): não repete', () => {
    expect(textoDoDocumento({ ...baseMessage, type: 'document', body: 'Exame', mediaCaption: 'Exame' })).toBeNull()
    expect(textoDoDocumento({ ...baseMessage, type: 'document', mediaCaption: 'a.pdf' })).toBeNull()
  })
})
