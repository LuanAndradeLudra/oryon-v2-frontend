import type { ItemPadrao } from './tipos'

/**
 * ORY-60 (17/11) — as listas padronizadas no lugar do texto livre: o nome da meta, o
 * motivo de saída, o motivo da entrega à equipe, o que a equipe deve fazer com um aviso
 * e as restrições da missão. No produto vêm do catálogo (`GET /v1/journeys/catalog`):
 * o motor grava o CÓDIGO, e Resultados e Pessoas agrupam por ele (como os motivos de
 * pulo). "Outro" (`other`) continua aceitando um nome escrito pela pessoa.
 * Os textos são universais (servem a qualquer segmento).
 */

/** O código do "Outro": o rótulo é o que a pessoa escreveu. */
export const CODIGO_LIVRE = 'other'

export const METAS_PADRAO: ItemPadrao[] = [
  { code: 'attendance_confirmed', label: 'Presença confirmada', event: 'appointment_confirmed' },
  { code: 'scheduled', label: 'Agendamento marcado', event: 'appointment_scheduled' },
  { code: 'rescheduled', label: 'Agendamento remarcado', event: 'appointment_rescheduled' },
  { code: 'replied', label: 'Respondeu' },
  { code: 'came_back', label: 'Voltou a conversar' },
  { code: 'qualified', label: 'Contato qualificado', event: 'deal.stage_changed' },
  { code: 'deal_won', label: 'Venda feita', event: 'deal.won' },
  { code: 'paid', label: 'Pagamento confirmado' },
  { code: 'documents_received', label: 'Documentos recebidos' },
  { code: 'contract_signed', label: 'Contrato assinado' },
  { code: 'rated', label: 'Avaliou o atendimento' },
]

export const MOTIVOS_DE_SAIDA: ItemPadrao[] = [
  { code: 'no_reply', label: 'Sem resposta' },
  { code: 'declined', label: 'Recusou' },
  { code: 'with_team', label: 'Foi para a equipe' },
  { code: 'with_agent', label: 'Ficou com o agente' },
  { code: 'invalid_answer', label: 'A resposta não serviu' },
  { code: 'mission_not_done', label: 'A missão não concluiu' },
  { code: 'not_sent', label: 'A mensagem não chegou' },
  { code: 'not_eligible', label: 'Não se encaixou' },
  { code: 'system_error', label: 'Erro no sistema' },
  { code: 'end', label: 'Fim do caminho' },
]

export const MOTIVOS_DA_EQUIPE: ItemPadrao[] = [
  { code: 'wants_cancel', label: 'Quer cancelar' },
  { code: 'wants_reschedule', label: 'Quer remarcar' },
  { code: 'question', label: 'Dúvida que a IA não resolveu' },
  { code: 'complaint', label: 'Reclamação' },
  { code: 'asked_human', label: 'Pediu para falar com alguém' },
  { code: 'no_reply', label: 'Não respondeu' },
  { code: 'payment', label: 'Assunto financeiro' },
  { code: 'mission_not_done', label: 'A missão não concluiu' },
  { code: 'ai_unsure', label: 'A IA não teve certeza' },
]

export const ACOES_DA_EQUIPE: ItemPadrao[] = [
  { code: 'call', label: 'Ligar para a pessoa', hint: 'O aviso pede que alguém da equipe ligue para a pessoa.' },
  { code: 'reply', label: 'Responder na conversa', hint: 'O aviso pede que alguém responda na conversa do WhatsApp.' },
  { code: 'update_system', label: 'Acertar no sistema', hint: 'O aviso pede que alguém acerte no sistema o que a pessoa pediu (agendamento, pedido, cadastro).' },
  { code: 'check_payment', label: 'Conferir o pagamento', hint: 'O aviso pede que alguém confira se o pagamento entrou.' },
  { code: 'fyi', label: 'Só para saber', hint: 'Nenhuma ação: o aviso só informa a equipe.' },
]

/** O que vai junto do aviso, além do texto (o link da conversa vai sempre). */
export const ANEXOS_DO_AVISO: { value: string; label: string }[] = [
  { value: 'subject', label: 'Os dados do agendamento ou do negócio' },
  { value: 'last_reply', label: 'A última resposta da pessoa' },
  { value: 'ai_summary', label: 'O resumo da IA (de um “Resumir a conversa” antes)' },
]

export const RESTRICOES_DA_MISSAO: ItemPadrao[] = [
  { code: 'no_insist', label: 'Não insistir depois de um “não”' },
  { code: 'no_discount', label: 'Não oferecer desconto' },
  { code: 'no_prices', label: 'Não falar de valores' },
  { code: 'no_same_day', label: 'Não marcar para o mesmo dia' },
  { code: 'handoff_on_complaint', label: 'Passar para a equipe se a pessoa reclamar' },
  { code: 'no_personal_data', label: 'Não pedir documentos nem dados pessoais' },
]

/** O código de um rótulo da lista (sem diferença de maiúsculas e acentos); sem par, "Outro". */
export function codigoDoRotulo(lista: ItemPadrao[], rotulo: unknown): string {
  const alvo = normalizar(String(rotulo ?? ''))
  if (!alvo) return lista[0]?.code ?? CODIGO_LIVRE
  return lista.find((i) => normalizar(i.label) === alvo)?.code ?? CODIGO_LIVRE
}

export function normalizar(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}
