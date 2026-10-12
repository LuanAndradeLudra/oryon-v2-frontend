import {
  Camera, Mic, FileText, Video, MapPin, Sticker, MousePointerClick, User,
  ClipboardList, ShoppingCart, SmilePlus, LayoutTemplate, AlertCircle, Info,
  Megaphone, Workflow, Plug,
} from 'lucide-react'
import type { Conversation, MessageType } from '@/types'

/**
 * Preview da última mensagem na lista de conversas (SCRUM-1253, PO 06/10).
 *
 * Regra: nenhum recurso da plataforma aparece como EMOJI. O backend grava o
 * preview com emoji de prefixo (message-preview.util.ts: "↩️ Quero agendar",
 * "📷 Foto", "🎤 Mensagem de voz"…) e, nos envios do operador sem texto, como
 * "[image]"/"[document]". Cada sistema desenha o emoji do seu jeito e nada
 * disso fala a língua do app. Aqui cada caso ganha o seu estilo:
 *   - resposta do cliente a botão/lista → mini-botão (o que ele apertou)
 *   - conteúdo (foto, áudio, documento…) → ícone da plataforma + rótulo
 *   - reação → ícone + "Reagiu" + a reação (o emoji é CONTEÚDO do cliente)
 *   - não suportada / sistema → aviso discreto
 * O emoji que o próprio cliente ou o template escreveu no texto é conteúdo e
 * fica como está.
 *
 * Revisão 11/10 (SCRUM-1161 C2/C3): com `lastMessageType`, o TIPO manda — um
 * texto do cliente começando com 📍/📷/👤/📄 não vira mais ícone de mídia. Sem
 * o tipo (conversa antiga, backend antigo) segue o formato antigo (emoji e
 * "[tipo]"), mas o prefixo só vale para mensagem do cliente: o backend só
 * grava emoji de prefixo no preview das mensagens RECEBIDAS, então texto da
 * IA, do operador ou de campanha com emoji no começo é conteúdo.
 */

export interface ContextoDoPreview {
  /** `lastMessageType` (C2). Ausente/null = conversa antiga: formato antigo. */
  tipo?: MessageType | null
  /** `lastMessageMeta` (C2): template, campanha, automação ou integração. */
  meta?: Conversation['lastMessageMeta']
  /** `lastMessageSenderKind`. */
  remetente?: Conversation['lastMessageSenderKind']
}

type Icone = typeof Camera

export type PreviewClassificado =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'resposta'; icone: Icone; texto: string }
  | { tipo: 'conteudo'; icone: Icone; texto: string }
  | { tipo: 'reacao'; icone: Icone; texto: string; reacao: string | null }
  | { tipo: 'aviso'; icone: Icone; texto: string }

/** U+FE0F — pede a forma colorida do emoji; vem grudado no ↩ do backend. */
const SELETOR_EMOJI = String.fromCharCode(0xfe0f)

const PREFIXOS: Array<{ emoji: string; icone: Icone; padrao: string; resposta?: true }> = [
  { emoji: '↩', icone: MousePointerClick, padrao: 'Respondeu', resposta: true },
  { emoji: '📷', icone: Camera, padrao: 'Foto' },
  { emoji: '🎥', icone: Video, padrao: 'Vídeo' },
  { emoji: '🎤', icone: Mic, padrao: 'Mensagem de voz' },
  { emoji: '📄', icone: FileText, padrao: 'Documento' },
  { emoji: '📍', icone: MapPin, padrao: 'Localização' },
  { emoji: '👤', icone: User, padrao: 'Contato' },
  { emoji: '📋', icone: ClipboardList, padrao: 'Formulário' },
  { emoji: '🛒', icone: ShoppingCart, padrao: 'Pedido' },
]

/** Envio do operador sem texto: o backend grava "[tipo]". */
const COLCHETES: Record<string, { icone: Icone; texto: string }> = {
  '[image]': { icone: Camera, texto: 'Imagem' },
  '[imagen]': { icone: Camera, texto: 'Imagem' },
  '[imagem]': { icone: Camera, texto: 'Imagem' },
  '[photo]': { icone: Camera, texto: 'Foto' },
  '[audio]': { icone: Mic, texto: 'Áudio' },
  '[document]': { icone: FileText, texto: 'Documento' },
  '[video]': { icone: Video, texto: 'Vídeo' },
  '[location]': { icone: MapPin, texto: 'Localização' },
  '[sticker]': { icone: Sticker, texto: 'Figurinha' },
  '[contacts]': { icone: User, texto: 'Contato' },
  '[template]': { icone: LayoutTemplate, texto: 'Template' },
  '[interactive]': { icone: MousePointerClick, texto: 'Mensagem com botões' },
  '[reaction]': { icone: SmilePlus, texto: 'Reação' },
  '[order]': { icone: ShoppingCart, texto: 'Pedido' },
}

/** Tipo da mensagem → ícone + rótulo padrão (C3: o preview novo já vem sem emoji). */
const POR_TIPO: Partial<Record<MessageType, { icone: Icone; padrao: string }>> = {
  image: { icone: Camera, padrao: 'Foto' },
  video: { icone: Video, padrao: 'Vídeo' },
  audio: { icone: Mic, padrao: 'Mensagem de voz' },
  document: { icone: FileText, padrao: 'Documento' },
  location: { icone: MapPin, padrao: 'Localização' },
  contacts: { icone: User, padrao: 'Contato' },
  sticker: { icone: Sticker, padrao: 'Figurinha' },
  order: { icone: ShoppingCart, padrao: 'Pedido' },
  template: { icone: LayoutTemplate, padrao: 'Template' },
}

/** Tira o emoji de prefixo do formato antigo (se houver) e o "[tipo]" do operador. */
function semPrefixoAntigo(texto: string): string {
  for (const p of PREFIXOS) {
    if (!texto.startsWith(p.emoji)) continue
    let resto = texto.slice(p.emoji.length)
    if (resto.startsWith(SELETOR_EMOJI)) resto = resto.slice(1)
    return resto.trimStart()
  }
  return COLCHETES[texto.toLowerCase()] ? '' : texto
}

function pelaOrigem(meta: ContextoDoPreview['meta']): PreviewClassificado | null {
  if (!meta) return null
  if (meta.campaignName) return { tipo: 'conteudo', icone: Megaphone, texto: `Campanha · ${meta.campaignName}` }
  if (meta.automationName) return { tipo: 'conteudo', icone: Workflow, texto: `Automação · ${meta.automationName}` }
  if (meta.templateName) return { tipo: 'conteudo', icone: LayoutTemplate, texto: `Template · ${meta.templateName}` }
  if (meta.integration) return { tipo: 'conteudo', icone: Plug, texto: 'Integração' }
  return null
}

function pelaReacao(texto: string): PreviewClassificado | null {
  const reacao = /^Reagiu(?: com (.+))?$/.exec(texto)
  return reacao ? { tipo: 'reacao', icone: SmilePlus, texto: 'Reagiu', reacao: reacao[1] ?? null } : null
}

function peloTipo(tipo: MessageType, texto: string, remetente: ContextoDoPreview['remetente']): PreviewClassificado {
  if (tipo === 'text') return { tipo: 'texto', texto: texto || '…' }
  if (tipo === 'reaction') return pelaReacao(texto) ?? { tipo: 'reacao', icone: SmilePlus, texto: 'Reagiu', reacao: null }
  if (tipo === 'unsupported') return { tipo: 'aviso', icone: AlertCircle, texto: 'Mensagem não suportada' }
  if (tipo === 'system') return { tipo: 'aviso', icone: Info, texto: texto || 'Evento do sistema' }
  const limpo = semPrefixoAntigo(texto)
  if (tipo === 'interactive' || tipo === 'button') {
    // Do cliente = o que ele apertou (mini-botão); enviada pela plataforma = mensagem com botões.
    if (remetente && remetente !== 'client') return { tipo: 'conteudo', icone: MousePointerClick, texto: limpo || 'Mensagem com botões' }
    if (texto.startsWith('📋')) return { tipo: 'conteudo', icone: ClipboardList, texto: limpo || 'Formulário' }
    return { tipo: 'resposta', icone: MousePointerClick, texto: limpo || 'Respondeu' }
  }
  const t = POR_TIPO[tipo]
  return t ? { tipo: 'conteudo', icone: t.icone, texto: limpo || t.padrao } : { tipo: 'texto', texto: texto || '…' }
}

export function classificarPreview(bruto: string, contexto: ContextoDoPreview = {}): PreviewClassificado {
  const texto = bruto.trim()
  const origem = pelaOrigem(contexto.meta)
  if (origem) return origem
  // C2/C3: com o tipo, ele manda — 'text' NUNCA é classificado pelo prefixo.
  if (contexto.tipo) return peloTipo(contexto.tipo, texto, contexto.remetente)
  // Formato antigo: emoji de prefixo só existe no preview de mensagem RECEBIDA.
  const podeSerPrefixo = !contexto.remetente || contexto.remetente === 'client'
  for (const p of podeSerPrefixo ? PREFIXOS : []) {
    if (!texto.startsWith(p.emoji)) continue
    let resto = texto.slice(p.emoji.length)
    if (resto.startsWith(SELETOR_EMOJI)) resto = resto.slice(1)
    resto = resto.trimStart() || p.padrao
    return p.resposta ? { tipo: 'resposta', icone: p.icone, texto: resto } : { tipo: 'conteudo', icone: p.icone, texto: resto }
  }
  const colchete = COLCHETES[texto.toLowerCase()]
  if (colchete) return { tipo: 'conteudo', ...colchete }
  if (texto === 'Figurinha') return { tipo: 'conteudo', icone: Sticker, texto }
  const reacao = pelaReacao(texto)
  if (reacao) return reacao
  if (texto === 'Mensagem não suportada') return { tipo: 'aviso', icone: AlertCircle, texto }
  if (texto === 'Evento do sistema') return { tipo: 'aviso', icone: Info, texto }
  return { tipo: 'texto', texto: texto || '…' }
}
