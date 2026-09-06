// ─── templatePresets ───────────────────────────────────────────────────────
// Os 3 rascunhos que os atalhos do rodapé abrem. Dados, não componentes —
// texto espalhado por JSX é texto que ninguém revisa junto.
//
// Copy aprovada pelo Maestro no §8 do `coord/D5-plano.md`, escrita pela
// Alavanca. Adotada sem mudança, inclusive as duas ressalvas dela, que estão
// certas e vale repetir aqui para quem ler só este arquivo:
//
// 1. NENHUM corpo promete descadastro ("responda SAIR para não receber mais").
//    Procurei no backend: não existe tratamento de descadastro por palavra-
//    chave — o `optIn` do contato só muda por escrita explícita, e o módulo de
//    compliance apenas CONTA opt-in/opt-out. Prometer isso seria prometer o
//    que o produto não cumpre. Descadastro por palavra-chave é história
//    própria.
// 2. `welcome` fica em UTILITY porque o mockup diz "utilidade", e o texto foi
//    escrito para sustentar essa leitura (fala de um cadastro que o contato
//    fez). A Meta costuma reclassificar boas-vindas genérica para MARKETING;
//    se reprovar, a pessoa troca no editor. O rascunho não trava nada.
//
// Tudo aqui é RASCUNHO INICIAL que a pessoa edita antes de enviar à Meta.
// Nada é enviado automaticamente.
import type { TemplateCategoryType } from '@/types'

export type PresetId = 'welcome' | 'winback' | 'launch'

export interface TemplateDraft {
  name?: string
  category?: TemplateCategoryType
  body?: string
  footer?: string
}

export const TEMPLATE_PRESETS: Record<PresetId, TemplateDraft> = {
  welcome: {
    name: 'boas_vindas_v1',
    category: 'UTILITY',
    body: [
      'Oi, {{1}}! Que bom ter você por aqui.',
      'Recebemos seu cadastro e já está tudo certo.',
      'Se precisar de qualquer coisa, é só responder esta mensagem.',
    ].join('\n'),
  },
  winback: {
    name: 'reengajamento_v1',
    category: 'MARKETING',
    body: [
      'Oi, {{1}}! Faz um tempo que a gente não conversa.',
      'Se quiser retomar de onde parou, é só responder esta mensagem.',
    ].join('\n'),
  },
  launch: {
    name: 'lancamento_v1',
    category: 'MARKETING',
    body: [
      'Oi, {{1}}! Temos uma novidade: {{2}}.',
      'Quer saber mais? Responde esta mensagem que a gente te conta.',
    ].join('\n'),
  },
}

/** O nome é SUGESTÃO. `name` de template é único por namespace, então
 *  `boas_vindas_v1` pode já existir e o save falha com erro do backend — que é
 *  o que o editor já mostra. De propósito NÃO invento sufixo (`_v2`,
 *  timestamp): isso encheria o namespace do tenant de nomes sujos sem
 *  ninguém pedir. */
export function presetFor(id: string | null | undefined): TemplateDraft | undefined {
  if (!id) return undefined
  return TEMPLATE_PRESETS[id as PresetId]
}
