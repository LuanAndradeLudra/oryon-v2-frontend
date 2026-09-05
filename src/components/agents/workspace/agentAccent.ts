// ─── Acento categórico por agente (A2 / SCRUM-1013) ──────────────────────────
// O mockup pinta cada avatar do rail com um hex fixo, cravado inline no
// atributo de estilo de cada item.
// A Carta de Padrões §7 proíbe cor categórica em hex: tem que sair de
// `--color-accent-*` via `accentColor()`. Como não existe "cor do agente" em
// contrato nenhum (`AgentConfig` não tem campo de cor), derivo um acento
// ESTÁVEL do id — o mesmo agente sempre recebe a mesma cor, em qualquer tela e
// entre sessões, que é o que o rail precisa para ser reconhecível.

import { accentColor, tint, type Accent } from '@/components/ui/accentColor'

/** `brand` fica de fora de propósito: é a cor da marca (usada por "Visão
 *  geral" e por ações primárias), não uma cor categórica de agente. */
const AGENT_ACCENTS: Accent[] = ['blue', 'violet', 'green', 'amber', 'rose', 'cyan']

/** Hash determinístico e estável (djb2 xor). Não precisa ser criptográfico —
 *  precisa ser o mesmo número hoje e amanhã para o mesmo id. */
function hash(input: string): number {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i)
  }
  return Math.abs(h)
}

export function agentAccent(agentId: string): Accent {
  if (!agentId) return AGENT_ACCENTS[0]
  return AGENT_ACCENTS[hash(agentId) % AGENT_ACCENTS.length]
}

/** Estilo do avatar `.av.tint` do mockup:
 *  `background: color-mix(--tc 15%)`, `color: --tc`, `border: color-mix(--tc 28%)`.
 *  Devolvido como CSSProperties porque `color-mix` com uma custom property
 *  resolvida em runtime não tem classe utilitária equivalente.
 *
 *  `active` acrescenta o anel duplo do rail
 *  (`0 0 0 2px var(--s950), 0 0 0 4px var(--tc)`) via `box-shadow` em vez de
 *  `ring-*`: o utilitário de ring é usado pelo `focus-visible`, e os dois no
 *  mesmo elemento se sobrescrevem — separando, o item selecionado continua
 *  mostrando o anel de foco por cima quando navegado por teclado. */
export function agentTintStyle(agentId: string, active = false): React.CSSProperties {
  const accent = agentAccent(agentId)
  return {
    backgroundColor: tint(accent, 15),
    borderColor: tint(accent, 28),
    color: accentColor(accent),
    ...(active
      ? { boxShadow: `0 0 0 2px var(--color-surface-950), 0 0 0 4px ${accentColor(accent)}` }
      : null),
  }
}
