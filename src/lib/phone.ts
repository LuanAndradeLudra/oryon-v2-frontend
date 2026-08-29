/**
 * Telefone — exibição e normalização, num lugar só.
 *
 * `formatPhone` estava copiado **byte a byte** em quatro componentes
 * (`AssignWabaModal`, `DuplicateTemplateModal`, `LineFilterChip`,
 * `WhatsappLineChip`) e reescrito de forma diferente num quinto
 * (`CopilotMessage`). Numa plataforma cujo objeto central é um número de
 * WhatsApp, cinco definições de "como um número se parece" é o começo de
 * cinco comportamentos diferentes.
 *
 * Regra da casa: **exibe formatado, envia só dígitos.** O backend guarda
 * `waId` no formato E.164 sem símbolos (`5511999887766`); a máscara existe
 * para o humano ler e conferir, nunca para viajar na requisição.
 */

/** Só os dígitos — é isto que vai para a API. */
export function phoneDigits(raw?: string | null): string {
  return (raw ?? '').replace(/\D/g, '')
}

/**
 * Formata para leitura: `+55 11 99988-7766` (celular) ou `+55 11 3988-7766`
 * (fixo). Número que não bate com nenhum formato conhecido volta **como veio**
 * — inventar máscara para um internacional seria pior que não formatar.
 */
export function formatPhone(raw?: string | null): string {
  if (!raw) return ''
  const digits = phoneDigits(raw)
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return raw
}

/**
 * Máscara progressiva para o campo de digitação: formata o que já foi digitado
 * sem esperar o número ficar completo. Diferente de `formatPhone`, que só
 * formata número inteiro — aqui o usuário precisa de retorno a cada tecla.
 *
 * **Não adivinha o DDI.** A primeira versão deste código prefixava `55` no que
 * não começasse com `55`; isso ajuda quem digita um número brasileiro e
 * **corrompe em silêncio** quem cola um internacional (`12025550123` viraria
 * `5512025550123`). Com 11 dígitos não há como distinguir os dois casos, e
 * corromper dado do cliente é pior que exigir dois caracteres a mais. Número
 * que não começa com `55` aparece como foi digitado — o hint do campo pede o
 * código do país.
 */
export function maskPhoneInput(raw: string): string {
  // 15 = máximo do E.164.
  const digits = phoneDigits(raw).slice(0, 15)
  if (digits.length === 0) return ''
  if (!digits.startsWith('55') || digits.length > 13) return digits

  const ddd = digits.slice(2, 4)
  const rest = digits.slice(4)
  if (!ddd) return `+${digits}`
  if (!rest) return `+55 ${ddd}`
  // 9 dígitos = celular (5+4); 8 = fixo (4+4). Abaixo disso, ainda digitando.
  const split = rest.length > 8 ? 5 : 4
  if (rest.length <= split) return `+55 ${ddd} ${rest}`
  return `+55 ${ddd} ${rest.slice(0, split)}-${rest.slice(split)}`
}

/**
 * Número brasileiro plausível: DDI 55 + DDD de 2 dígitos (11–99) + 8 ou 9
 * dígitos. Não valida se a linha existe — valida se vale a pena tentar enviar.
 */
export function isValidPhone(raw?: string | null): boolean {
  const digits = phoneDigits(raw)
  if (!digits.startsWith('55')) return false
  const ddd = Number(digits.slice(2, 4))
  const rest = digits.slice(4)
  if (!(ddd >= 11 && ddd <= 99)) return false
  return rest.length === 8 || rest.length === 9
}
