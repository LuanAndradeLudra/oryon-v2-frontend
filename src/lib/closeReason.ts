// A4 (SCRUM-926) — lógica pura do motivo de desfecho, compartilhada pelas
// cinco superfícies que fecham um registro (board, ficha, painel da conversa,
// aba do quick-view e "resolver com desfecho"). Sem React, sem API.
//
// D0-8 (SCRUM-923): a lista de motivos é do tenant (B5/SCRUM-931) e, quando o
// admin liga `allowFreeCloseReason`, convive com um CAMPO LIVRE ao lado dela.
// O livre não cria chave nova — grava `outro` + nota estruturada, que é o que
// mantém o relatório de perdas (D1) agregável. Sem o livre, o vendedor escolhe
// "o motivo menos errado" e o relatório mente.

export interface CloseReasonOption {
  key: string
  label: string
}

/** O que o formulário do motivo produz. */
export interface ComposedCloseReason {
  reason: string
  note?: string
}

/**
 * Motivo já escolhido quando a lista não dá escolha: catálogo com UM motivo
 * vem preenchido (menos um clique no caso comum — é o que o painel de
 * "resolver com desfecho" já fazia e o modal do board não).
 */
export function preselectedReason(reasons: CloseReasonOption[]): string {
  return reasons.length === 1 ? reasons[0].key : ''
}

/**
 * Junta lista + campo livre + observação no par (`closeReason`, `closeNote`)
 * que a API espera.
 *
 * O campo livre VENCE a lista quando tem texto: quem digitou um motivo já
 * disse que nenhum item servia. Ele entra como `outro` e o texto vira a nota
 * — na frente da observação, separados por " — ", para que o relatório leia a
 * primeira parte como o motivo declarado.
 */
export function composeCloseReason(input: {
  /** Chave escolhida na lista (vazia = nada escolhido). */
  picked: string
  /** Texto do campo livre; ignorado quando o funil não permite. */
  free?: string
  /** Observação complementar. */
  note?: string
  allowFree?: boolean
}): { value: ComposedCloseReason } | { error: string } {
  const free = (input.allowFree ? (input.free ?? '') : '').trim()
  const note = (input.note ?? '').trim()

  if (free) {
    return { value: { reason: 'outro', note: [free, note].filter(Boolean).join(' — ') } }
  }
  if (!input.picked) {
    return { error: input.allowFree ? 'Escolha um motivo ou descreva o motivo.' : 'Escolha um motivo.' }
  }
  return { value: { reason: input.picked, note: note || undefined } }
}
