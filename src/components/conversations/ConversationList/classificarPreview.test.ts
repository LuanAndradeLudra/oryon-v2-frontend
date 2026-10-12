// SCRUM-1253 — nenhum recurso da plataforma aparece como emoji na lista; cada
// formato que o backend grava (message-preview.util.ts e "[tipo]" do operador)
// cai num estilo próprio.
import { describe, it, expect } from 'vitest'
import { classificarPreview } from './classificarPreview'

const VS16 = String.fromCharCode(0xfe0f)

describe('classificarPreview', () => {
  it('resposta a botão/lista vira "resposta", sem o emoji', () => {
    expect(classificarPreview(`↩${VS16} Quero agendar`)).toMatchObject({ tipo: 'resposta', texto: 'Quero agendar' })
    expect(classificarPreview('↩ Falar com a recepção')).toMatchObject({ tipo: 'resposta', texto: 'Falar com a recepção' })
    expect(classificarPreview(`↩${VS16} `)).toMatchObject({ tipo: 'resposta', texto: 'Respondeu' })
  })

  it.each([
    ['📷 Foto', 'Foto'], ['📷 Olha isso', 'Olha isso'], ['🎥 Vídeo', 'Vídeo'], ['🎤 Mensagem de voz', 'Mensagem de voz'],
    ['📄 contrato.pdf', 'contrato.pdf'], ['📍 Localização', 'Localização'], ['👤 Ana +2', 'Ana +2'],
    ['📋 Respondeu o formulário', 'Respondeu o formulário'], ['🛒 Pedido (2 itens)', 'Pedido (2 itens)'],
  ])('conteúdo do cliente "%s" vira ícone + "%s"', (bruto, texto) => {
    expect(classificarPreview(bruto)).toMatchObject({ tipo: 'conteudo', texto })
  })

  it.each([
    ['[image]', 'Imagem'], ['[document]', 'Documento'], ['[audio]', 'Áudio'], ['[template]', 'Template'],
    ['[interactive]', 'Mensagem com botões'], ['[contacts]', 'Contato'],
  ])('envio do operador "%s" vira "%s"', (bruto, texto) => {
    expect(classificarPreview(bruto)).toMatchObject({ tipo: 'conteudo', texto })
  })

  it('figurinha, reação, não suportada e sistema têm estilo próprio', () => {
    expect(classificarPreview('Figurinha')).toMatchObject({ tipo: 'conteudo' })
    expect(classificarPreview('Reagiu com 👍')).toMatchObject({ tipo: 'reacao', reacao: '👍' })
    expect(classificarPreview('Reagiu')).toMatchObject({ tipo: 'reacao', reacao: null })
    expect(classificarPreview('Mensagem não suportada')).toMatchObject({ tipo: 'aviso' })
    expect(classificarPreview('Evento do sistema')).toMatchObject({ tipo: 'aviso' })
  })

  it('texto do cliente, da IA ou do template fica como está — inclusive o emoji que é conteúdo', () => {
    expect(classificarPreview('Oi! 😊 Tudo bem?')).toEqual({ tipo: 'texto', texto: 'Oi! 😊 Tudo bem?' })
    expect(classificarPreview('')).toEqual({ tipo: 'texto', texto: '…' })
  })
  it('revisão 11/10: com lastMessageType "text", emoji no começo é conteúdo — nunca ícone de mídia', () => {
    for (const t of ['📍 Rua das Flores, 10', '📷 manda a foto?', '👤 sou eu', '📄 segue o contrato', '↩ voltei']) {
      expect(classificarPreview(t, { tipo: 'text', remetente: 'client' })).toEqual({ tipo: 'texto', texto: t })
    }
  })

  it('revisão 11/10: sem o tipo (conversa antiga), emoji de prefixo só vale para mensagem do cliente', () => {
    expect(classificarPreview('📍 Nosso endereço: Rua X', { remetente: 'ai' })).toEqual({ tipo: 'texto', texto: '📍 Nosso endereço: Rua X' })
    expect(classificarPreview('📍 Nosso endereço: Rua X', { remetente: 'campaign' })).toMatchObject({ tipo: 'texto' })
    expect(classificarPreview('📍 Localização', { remetente: 'client' })).toMatchObject({ tipo: 'conteudo', texto: 'Localização' })
    expect(classificarPreview('[image]', { remetente: 'operator' })).toMatchObject({ tipo: 'conteudo', texto: 'Imagem' })
  })

  it.each([
    ['image', 'Foto', 'Foto'], ['image', '📷 Olha isso', 'Olha isso'], ['audio', 'Mensagem de voz', 'Mensagem de voz'],
    ['document', 'contrato.pdf', 'contrato.pdf'], ['location', 'Localização', 'Localização'], ['contacts', 'Ana +2', 'Ana +2'],
    ['image', '[image]', 'Foto'], ['order', 'Pedido (2 itens)', 'Pedido (2 itens)'],
  ] as const)('C3: tipo "%s" com preview "%s" vira ícone + "%s"', (tipo, bruto, texto) => {
    expect(classificarPreview(bruto, { tipo, remetente: 'client' })).toMatchObject({ tipo: 'conteudo', texto })
  })

  it('C3: botão/lista do cliente vira resposta; enviada pela plataforma vira "mensagem com botões"', () => {
    expect(classificarPreview('Quero agendar', { tipo: 'interactive', remetente: 'client' })).toMatchObject({ tipo: 'resposta', texto: 'Quero agendar' })
    expect(classificarPreview('Escolha uma opção', { tipo: 'interactive', remetente: 'ai' })).toMatchObject({ tipo: 'conteudo', texto: 'Escolha uma opção' })
  })

  it('C2: a origem (campanha, automação, template, integração) vira o rótulo', () => {
    expect(classificarPreview('Olá {{1}}', { tipo: 'template', meta: { templateName: 'boas_vindas', campaignName: 'Outubro' } })).toMatchObject({ texto: 'Campanha · Outubro' })
    expect(classificarPreview('x', { meta: { automationName: 'Lembrete' } })).toMatchObject({ texto: 'Automação · Lembrete' })
    expect(classificarPreview('x', { meta: { templateName: 'boas_vindas' } })).toMatchObject({ texto: 'Template · boas_vindas' })
    expect(classificarPreview('x', { meta: { integration: true } })).toMatchObject({ texto: 'Integração' })
  })
})
