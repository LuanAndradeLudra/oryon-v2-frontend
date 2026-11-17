import type { CodigoDePulo } from './tipos'

/**
 * Os motivos PADRONIZADOS de quem não entrou, pulou uma mensagem ou teve a
 * mensagem adiada (P2 do benchmark, 16/11, como o Braze e o Iterable). O motor
 * grava só o código; a tela agrupa, conta e explica com estes textos, iguais em
 * Resultados, Pessoas e no "por que não entrou".
 */
export type EtapaDoPulo = 'entrada' | 'envio' | 'adiado'

export const MOTIVOS_DE_PULO: Record<CodigoDePulo, { rotulo: string; explicacao: string; etapa: EtapaDoPulo }> = {
  filter: { rotulo: 'Não passou no filtro de entrada', explicacao: 'Chegou pela porta, mas não se encaixou em "Quem pode entrar?".', etapa: 'entrada' },
  reentry: { rotulo: 'Já tinha entrado antes', explicacao: 'A regra de entrar de novo não deixou (ex.: só depois de 30 dias).', etapa: 'entrada' },
  other_journey: { rotulo: 'Já estava noutra jornada do mesmo assunto', explicacao: 'Outra jornada já cuidava deste assunto, e esta pula quem já está numa.', etapa: 'entrada' },
  opt_out: { rotulo: 'Pediu para não receber', explicacao: 'O contato pediu para sair das mensagens automáticas.', etapa: 'entrada' },
  invalid_phone: { rotulo: 'Telefone inválido', explicacao: 'O número do cadastro não é um celular válido.', etapa: 'entrada' },
  entry_limit: { rotulo: 'Passou do limite de entradas', explicacao: 'O limite de "Limitar quantos entram" já tinha sido atingido.', etapa: 'entrada' },
  recheck_failed: { rotulo: 'Deixou de se encaixar no filtro', explicacao: 'Com "Conferir de novo antes de cada mensagem", saiu antes do envio.', etapa: 'envio' },
  no_whatsapp: { rotulo: 'O número não tem WhatsApp', explicacao: 'A Meta devolveu que o número não usa WhatsApp.', etapa: 'envio' },
  meta_marketing_limit: { rotulo: 'A Meta segurou (limite de marketing)', explicacao: 'A Meta limita quantas mensagens de marketing cada pessoa recebe.', etapa: 'envio' },
  window_closed: { rotulo: 'A janela de 24 h fechou', explicacao: 'Texto livre só vai até 24 h depois da última mensagem do contato.', etapa: 'envio' },
  frequency_cap: { rotulo: 'Limite de mensagens por pessoa', explicacao: 'O limite de "Horários e limites" segurou o envio.', etapa: 'envio' },
  quiet_hours: { rotulo: 'Fora do horário de envio', explicacao: 'Não foi pulada: ficou para o próximo horário permitido.', etapa: 'adiado' },
  paused: { rotulo: 'Jornada pausada', explicacao: 'Esperou enquanto a jornada estava pausada e seguiu depois.', etapa: 'adiado' },
}

export const ROTULO_DA_ETAPA: Record<EtapaDoPulo, { titulo: string; ajuda: string }> = {
  entrada: { titulo: 'Não entraram', ajuda: 'Chegaram pela porta, mas ficaram de fora.' },
  envio: { titulo: 'Pularam uma mensagem', ajuda: 'Estavam dentro, mas uma mensagem não foi.' },
  adiado: { titulo: 'Mensagem adiada', ajuda: 'Não perderam nada: a mensagem saiu mais tarde.' },
}
