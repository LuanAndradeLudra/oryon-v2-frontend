import type { Message } from '@/types'

/**
 * DE ONDE VEIO A MENSAGEM — decidido ANTES do formulário, a partir do que a
 * plataforma já grava em cada mensagem:
 *  • `senderKind` (client / operator / ai / campaign / rule, ver
 *    backend conversation.entity.ts MessageSenderKind);
 *  • `metadata` (message-metadata.types.ts): `campaignName` em disparos e
 *    automações (`source: 'n8n'` = integração), `ruleKind`/`ruleName` nas
 *    respostas por regra (encaminhamento, FAQ, fora do horário).
 *
 * O formulário usa a origem para perguntar o que faz sentido para aquele tipo
 * de mensagem; a equipe Oryon usa para saber que evidência buscar.
 */
export type OrigemDaMensagem = 'ia' | 'automacao' | 'regra' | 'equipe' | 'contato'

export interface Classificacao {
  origem: OrigemDaMensagem
  /** Nome da automação/disparo/regra, quando a mensagem traz. */
  nome: string | null
}

/** Ordem de "quem é o assunto" quando várias origens são marcadas juntas. */
export const ORDEM_DAS_ORIGENS: OrigemDaMensagem[] = ['ia', 'automacao', 'regra', 'equipe', 'contato']

export const ORIGENS_DA_MENSAGEM: Record<OrigemDaMensagem, { nome: string; plural: string; reportar: string }> = {
  ia: { nome: 'Resposta da IA', plural: 'da IA', reportar: 'Reportar resposta da IA' },
  automacao: { nome: 'Disparo ou automação', plural: 'de automação', reportar: 'Reportar esta automação' },
  regra: { nome: 'Resposta automática por regra', plural: 'de regra', reportar: 'Reportar resposta automática' },
  // Rótulos curtos: o menu da bolha tem 220px e cortava "Reportar problema com esta mens…" (revisão de UX de 27/10).
  equipe: { nome: 'Mensagem da equipe', plural: 'da equipe', reportar: 'Reportar esta mensagem' },
  contato: { nome: 'Mensagem do contato', plural: 'do contato', reportar: 'Reportar esta mensagem' },
}

const RULE_KIND: Record<string, string> = {
  handoff_template: 'encaminhamento',
  handoff_auto_reply: 'encaminhamento',
  handoff_redirect: 'encaminhamento',
  faq: 'resposta rápida',
  failsafe_handoff: 'encaminhamento de segurança',
}

export function classificarMensagem(m: Message): Classificacao {
  const meta = (m.metadata ?? {}) as { kind?: string; campaignName?: string; ruleName?: string; ruleKind?: string; source?: string }
  if (m.direction === 'inbound' || m.senderKind === 'client') return { origem: 'contato', nome: null }
  if (m.senderKind === 'ai') return { origem: 'ia', nome: null }
  if (m.senderKind === 'rule' || meta.kind === 'rule') {
    return { origem: 'regra', nome: meta.ruleName ?? (meta.ruleKind ? RULE_KIND[meta.ruleKind] ?? null : null) }
  }
  if (m.senderKind === 'campaign' || meta.kind === 'campaign_text' || meta.campaignName) {
    return { origem: 'automacao', nome: meta.campaignName ? `${meta.source === 'n8n' ? 'Integração · ' : ''}${meta.campaignName}` : null }
  }
  if (m.senderKind === 'operator' || m.sentByUserId) return { origem: 'equipe', nome: null }
  // Saída sem remetente gravado: mesma regra do app (MessageBubble) — IA.
  return { origem: 'ia', nome: null }
}

/** Resumo do que foi marcado: contagem por origem e a origem "assunto" do chamado. */
export function resumoDasMarcadas(mensagens: readonly Message[]) {
  const porOrigem = new Map<OrigemDaMensagem, { qtd: number; nomes: Set<string> }>()
  for (const m of mensagens) {
    const c = classificarMensagem(m)
    const atual = porOrigem.get(c.origem) ?? { qtd: 0, nomes: new Set<string>() }
    atual.qtd += 1
    if (c.nome) atual.nomes.add(c.nome)
    porOrigem.set(c.origem, atual)
  }
  const presentes = ORDEM_DAS_ORIGENS.filter((o) => porOrigem.has(o))
  return { porOrigem, presentes, principal: presentes[0] ?? null }
}
