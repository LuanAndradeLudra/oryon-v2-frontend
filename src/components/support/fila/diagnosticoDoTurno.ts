import type { TurnoGravado } from './LinhaDoTempoDoTurno'

const quantos = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Desfecho do turno (ai_turn_traces.outcome) em português. */
export const DESFECHO: Record<string, string> = {
  reply_created: 'Respondeu ao contato', timeout: 'Tempo esgotado: não respondeu', network: 'Falha de rede: não respondeu',
  invalid_response: 'Resposta inválida: não respondeu', empty_response: 'Resposta vazia: não respondeu',
  discarded_paused: 'Descartada: alguém da equipe assumiu', no_token: 'Linha sem token: não respondeu', internal_error: 'Erro interno ao gravar',
}
const VEREDITO: Record<string, string> = { pass: 'passou', block: 'bloqueou', repair: 'corrigiu o texto', warn: 'alertou' }
/** "Vou pedir/verificar/confirmar… e já te retorno": promessa que só vale com a transferência de fato. */
const PROMESSA = /\b(vou|vamos|irei)\s+(pedir|verificar|confirmar|checar|consultar|encaminhar|repassar)|j[áa] te retorn|te retorno|retorno em breve/i

/** Estado da conversa que o backend junta à fala do contato: não é fala dele. */
const ESTADO_DA_CONVERSA = /<estado_conversa>[\s\S]*?<\/estado_conversa>/g

/** A última fala do contato que a IA recebeu, sem o bloco de estado, curta. */
export function perguntaDoContato(entrada: Array<{ role: string; content: unknown }> | undefined, limite = 240): string | null {
  const ultima = [...(entrada ?? [])].reverse().find((m) => m.role === 'user' && typeof m.content === 'string')
  if (!ultima) return null
  const texto = (ultima.content as string).replace(ESTADO_DA_CONVERSA, ' ').replace(/\s+/g, ' ').trim()
  if (!texto) return null
  return texto.length > limite ? `${texto.slice(0, limite - 1).trimEnd()}…` : texto
}

/** `informativo`: não é conferência (ex.: a pergunta do contato) — sem o ícone de "ok". */
export interface Sinal { rotulo: string; valor: string; alerta: boolean; informativo?: boolean }

/**
 * DIAGNÓSTICO DO TURNO (revisão de UX de 27/10): os sinais que decidem o caso,
 * em português, no topo da evidência — antes estavam espalhados no JSON de
 * "Ver o retrato" (ex.: catálogo vazio e 0 trechos da base = a IA não tinha a
 * informação). O que foge do normal vem marcado; o retrato continua abaixo.
 */
export function sinaisDoTurno(turno: TurnoGravado): Sinal[] {
  const s = turno.secoes ?? {}
  const sinais: Sinal[] = []
  // Reavaliação de UX de 27/10: o que o contato perguntou (já mascarado), sem abrir o JSON do turno.
  const pergunta = perguntaDoContato(s.turno?.entrada)
  if (pergunta) sinais.push({ rotulo: 'Pergunta', valor: pergunta, alerta: false, informativo: true })
  const desfecho = turno.rastro?.desfecho ?? null
  if (desfecho) sinais.push({ rotulo: 'Desfecho', valor: DESFECHO[desfecho] ?? desfecho, alerta: desfecho !== 'reply_created' })
  const resposta = s.turno?.respostaFinal ?? s.turno?.textoDoModelo ?? ''
  const transferiu = turno.rastro?.transferiu
  if (typeof transferiu === 'boolean') {
    const prometeu = !transferiu && PROMESSA.test(resposta)
    sinais.push({
      rotulo: 'Transferência',
      valor: transferiu ? 'Passou para a equipe' : prometeu ? 'Prometeu retorno e NÃO passou para a equipe' : 'Não passou para a equipe',
      alerta: prometeu,
    })
  }
  const fontes = (s.verificacao ?? []).map((v) => v.sources).find((x) => !!x)
  if (fontes) {
    const catalogo = fontes.catalog === 'empty' ? 'catálogo vazio' : fontes.catalog ? `catálogo ${fontes.catalog}` : null
    const partes = [catalogo, quantos(fontes.kbChunks ?? 0, 'trecho da base', 'trechos da base'),
      quantos(fontes.skillOutputs ?? 0, 'resultado de ferramenta', 'resultados de ferramenta')].filter(Boolean)
    const semFonte = (fontes.catalog === 'empty' || !fontes.catalog) && !fontes.kbChunks && !fontes.skillOutputs
    sinais.push({ rotulo: 'Fontes', valor: semFonte ? `Nenhuma fonte: ${partes.join(' · ')}` : partes.join(' · '), alerta: semFonte })
  }
  const ferramentas = s.ferramentas ?? []
  if (ferramentas.length) {
    const falhas = ferramentas.filter((f) => f.status === 'error' || (typeof f.status_code === 'number' && f.status_code >= 400)).length
    sinais.push({ rotulo: 'Ferramentas', valor: `${quantos(ferramentas.length, 'chamada', 'chamadas')}${falhas ? ` · ${quantos(falhas, 'falhou', 'falharam')}` : ''}`, alerta: falhas > 0 })
  }
  const verificacao = s.verificacao ?? []
  if (verificacao.length) {
    const achados = verificacao.reduce((n, v) => n + (v.findings?.length ?? 0), 0)
    const veredito = verificacao.map((v) => VEREDITO[v.verdict ?? ''] ?? v.verdict ?? '—').join(' · ')
    sinais.push({ rotulo: 'Verificação', valor: `${veredito}${achados ? ` · ${quantos(achados, 'achado', 'achados')}` : ''}`, alerta: achados > 0 || verificacao.some((v) => v.verdict && v.verdict !== 'pass') })
  }
  const erro = s.execucao?.erro
  if (erro) sinais.push({ rotulo: 'Erro', valor: erro.mensagem ?? erro.codigo ?? 'erro na execução', alerta: true })
  return sinais
}
