// ─── Bloqueio do Copilot: o que houve e o que fazer (SCRUM-804 / F9) ─────────
//
// O agent devolve 402 com a causa tipada. Aqui ela vira duas coisas separadas:
//
//   cause     o que aconteceu — vem pronto do agent, que é quem sabe
//   guidance  o que fazer a respeito — depende do PAPEL de quem foi bloqueado,
//             e o papel só existe aqui
//
// A separação importa porque quem recebe o 402 quase nunca é quem pode
// resolver: a aba de billing exige business_admin desde a SCRUM-694, e o
// Copilot é usado pelo time inteiro. Mandar "atualize seu plano" para um
// supervisor é prometer uma ação que ele não consegue executar.

import { isOwnerTier } from './roleHelpers'

export type CopilotBlockKind = 'balance' | 'entitlement'

/** Canal de venda assistida que o produto já usa (ver SkillsTab). */
const CONTACT = 'contato@oryonsolutions.com'

export class CopilotBlockedError extends Error {
  readonly kind?: CopilotBlockKind
  readonly reason?: string

  constructor(message: string, kind?: CopilotBlockKind, reason?: string) {
    super(message)
    this.name = 'CopilotBlockedError'
    this.kind = kind
    this.reason = reason
  }
}

export interface CopilotBlockNotice {
  /** O que aconteceu. Frase do agent, ou fallback se ele não mandou. */
  cause: string
  /** A quem recorrer ou o que fazer — varia por papel. */
  guidance: string
  /** Só para quem consegue agir. Ausente é deliberado: link que não resolve é pior que nenhum. */
  action?: { label: string; href: string }
}

const FALLBACK_CAUSE = 'O Copilot está indisponível para esta conta.'

function mailto(subject: string): string {
  return `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}`
}

/**
 * Traduz o 402 do agent em algo acionável.
 *
 * Ramifica por CLASSE, nunca por motivo — mesma razão do agent: motivo novo do
 * lado entitlement nasce com o comportamento certo em vez de cair num default.
 */
export function describeCopilotBlock(
  err: CopilotBlockedError,
  role: string | undefined | null,
): CopilotBlockNotice {
  const cause = err.message?.trim() || FALLBACK_CAUSE
  const owner = isOwnerTier(role)

  if (!owner) {
    // Não adianta oferecer contato comercial a quem não decide contrato. A
    // ação útil aqui é interna.
    return {
      cause,
      guidance:
        'Avise o responsável pela conta na sua empresa — só quem administra o plano consegue resolver isso.',
    }
  }

  if (err.kind === 'balance') {
    return {
      cause,
      guidance: 'Fale com a gente para ampliar o plano ou liberar créditos adicionais.',
      action: { label: 'Falar com a Oryon', href: mailto('Preciso de mais créditos no meu plano') },
    }
  }

  // entitlement — e também bloqueio sem classe, que é o caso conservador: se o
  // agent não soube classificar, tratar como assinatura é mais seguro do que
  // mandar comprar crédito para um contrato que talvez não exista mais.
  return {
    cause,
    guidance: 'Fale com a gente para regularizar a assinatura e liberar o acesso.',
    action: { label: 'Falar com a Oryon', href: mailto('Preciso regularizar minha assinatura') },
  }
}
