import type { Catalogo } from '@/services/jornadas/tipos'
import { variaveisConhecidas } from '@/services/jornadas/validar'
import { CONTEXTO_DE_TESTE } from '@/services/jornadas/simulador'

/**
 * ORY-60 — as variáveis em português. Na tela, `{{conector.agenda.data}}` vira a
 * etiqueta "Data do agendamento", com um exemplo do valor. O código fica para o
 * modo avançado.
 */

const ROTULOS: Record<string, string> = {
  'contato.nome': 'Nome do contato',
  'contato.telefone': 'Telefone do contato',
  'contato.email': 'E-mail do contato',
  'contato.etapa': 'Etapa do contato',
  'contato.origem': 'Origem do contato',
  'conversa.atendente': 'Atendente da conversa',
  'conversa.linha': 'Linha da conversa',
  'evento.id': 'Número do registro (agendamento, negócio…)',
  'evento.data': 'Data do evento',
  'evento.profissional': 'Profissional ou responsável',
  'evento.servico': 'Serviço do evento',
  'evento.texto': 'Texto que a pessoa mandou',
  'evento.botao': 'Botão que a pessoa apertou',
  'evento.respostas': 'Respostas do formulário',
  'evento.etiqueta': 'Etiqueta',
  'evento.etapa': 'Etapa',
  'evento.motivo': 'Motivo',
  'evento.desfecho': 'Desfecho da missão',
  'evento.atendente': 'Atendente',
  'evento.valor': 'Valor',
  'evento.vencimento': 'Vencimento',
  'evento.imovel': 'Imóvel',
  'conector.agenda.id': 'Número do agendamento',
  'conector.agenda.data': 'Data do agendamento',
  'conector.agenda.hora': 'Hora do agendamento',
  'conector.agenda.profissional': 'Profissional',
  'conector.agenda.servico': 'Serviço',
  'conector.agenda.unidade': 'Unidade',
  'conector.agenda.preparo': 'Preparo',
  'conector.agenda.status': 'Status do agendamento',
  'conector.resultado': 'Resultado do sistema',
  'conector.cancelada.data': 'Data do cancelamento',
  'conector.cancelada.profissional': 'Profissional do cancelamento',
  'conector.cancelada.servico': 'Serviço do cancelamento',
  'contexto.tentativa': 'Tentativa',
  'contexto.resposta': 'Última resposta',
  'contexto.resultado': 'Resultado do passo anterior',
  'contexto.resumo': 'Resumo da IA',
}

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function rotuloDaVariavel(chave: string): string {
  if (ROTULOS[chave]) return ROTULOS[chave]
  if (chave.startsWith('contexto.extraido.')) return `Lido pela IA: ${chave.slice('contexto.extraido.'.length).replace(/_/g, ' ')}`
  const ultimo = chave.split('.').pop() ?? chave
  return capitalizar(ultimo.replace(/_/g, ' '))
}

/**
 * Os grupos do seletor de dados (P2, 16/11): do contato, do evento, de passos
 * anteriores (o que a IA extraiu, o resumo, a resposta, o resultado do sistema)
 * e da conversa. O "texto fixo" fica no próprio seletor do modelo.
 */
export const GRUPOS_DE_VARIAVEL = ['Do contato', 'Do agendamento e do sistema', 'Do evento que trouxe a pessoa', 'De passos anteriores', 'Da conversa e da jornada'] as const
export type GrupoDeVariavel = (typeof GRUPOS_DE_VARIAVEL)[number]

const DE_PASSOS_ANTERIORES = new Set(['contexto.resumo', 'contexto.resposta', 'contexto.resultado', 'conector.resultado'])
export function grupoDaVariavel(chave: string): GrupoDeVariavel {
  if (chave.startsWith('contato.')) return 'Do contato'
  if (chave.startsWith('contexto.extraido.') || DE_PASSOS_ANTERIORES.has(chave)) return 'De passos anteriores'
  if (chave.startsWith('conector.')) return 'Do agendamento e do sistema'
  if (chave.startsWith('evento.')) return 'Do evento que trouxe a pessoa'
  return 'Da conversa e da jornada'
}

export function exemploDaVariavel(chave: string): string | undefined {
  return CONTEXTO_DE_TESTE[chave]
}

/** Datas ganham o formato DD/MM ao serem escolhidas. */
const E_DATA = (chave: string) => /(^|\.)(data|vencimento)$/.test(chave)

export interface Variavel { chave: string; rotulo: string; grupo: GrupoDeVariavel; exemplo?: string }

/** As variáveis do catálogo e, se vier, as que os passos do desenho produzem (o que a IA extraiu). */
export function listaDeVariaveis(catalogo: Catalogo, doDesenho: string[] = []): Variavel[] {
  return [...new Set([...variaveisConhecidas(catalogo), ...doDesenho])]
    .filter((v) => !v.includes('*'))
    .map((chave) => ({ chave, rotulo: rotuloDaVariavel(chave), grupo: grupoDaVariavel(chave), exemplo: exemploDaVariavel(chave) }))
    .sort((a, b) => GRUPOS_DE_VARIAVEL.indexOf(a.grupo) - GRUPOS_DE_VARIAVEL.indexOf(b.grupo) || a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
}

/** `{{conector.agenda.data | data:"DD/MM"}}` → partes; texto que não é variável → chave vazia. */
export interface Expressao { chave: string; padrao: string; filtro: string }

export function lerExpressao(texto: string): Expressao {
  const m = texto.match(/^\s*\{\{\s*([a-zA-Z_][\w.*]*)([^}]*)\}\}\s*$/)
  if (!m) return { chave: '', padrao: '', filtro: '' }
  return {
    chave: m[1],
    padrao: m[2].match(/\|\s*"([^"]*)"/)?.[1] ?? '',
    filtro: m[2].match(/\|\s*(data:"[^"]*")/)?.[1] ?? '',
  }
}

export function montarExpressao({ chave, padrao, filtro }: Expressao): string {
  if (!chave) return ''
  return `{{${chave}${padrao ? `|"${padrao}"` : ''}${filtro ? ` | ${filtro}` : ''}}}`
}

/** Escolher outra variável mantém o "se vazio" e põe o formato de data quando for data. */
export function trocarVariavel(atual: Expressao, chave: string): Expressao {
  return { chave, padrao: atual.padrao, filtro: E_DATA(chave) ? (atual.filtro || 'data:"DD/MM"') : '' }
}

/** Um nome de modelo da Meta em português legível: `lembrete_confirmacao_final` → "Lembrete confirmacao final". */
export function nomeLegivelDoModelo(nome: string): string {
  return capitalizar(nome.replace(/_/g, ' '))
}

/**
 * O texto com dados em forma amigável: `{{contato.nome}} chegou` ↔ `[Nome do contato] chegou`.
 * Na volta, cada [Rótulo] reaproveita a expressão original (com o formato e o
 * "se vazio"); rótulo conhecido sem original vira a variável pura; o resto fica como texto.
 */
export function paraTextoAmigavel(texto: string): string {
  return texto.replace(/\{\{[^}]*\}\}/g, (m) => {
    const e = lerExpressao(m)
    return e.chave ? `[${rotuloDaVariavel(e.chave)}]` : m
  })
}

export function deTextoAmigavel(amigavel: string, original: string, variaveis: Variavel[]): string {
  const originais = (original.match(/\{\{[^}]*\}\}/g) ?? []).map((m) => ({ m, rotulo: rotuloDaVariavel(lerExpressao(m).chave), usada: false }))
  return amigavel.replace(/\[([^\]]+)\]/g, (inteiro, rotulo: string) => {
    const daqui = originais.find((o) => !o.usada && o.rotulo === rotulo)
    if (daqui) {
      daqui.usada = true
      return daqui.m
    }
    const v = variaveis.find((x) => x.rotulo === rotulo)
    return v ? `{{${v.chave}}}` : inteiro
  })
}
