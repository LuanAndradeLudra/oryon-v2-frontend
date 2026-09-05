import type { WizardData } from '../types'

/**
 * O card âmbar "Lacuna" do blueprint: o que ainda vai fazer o agente tropeçar
 * se publicado assim. Regras LOCAIS sobre o `WizardData`, por decisão do
 * Maestro (`coord/A3-decisoes.md` §4) — determinístico, testável sem rede,
 * sem latência e sem custo por token. Uma lacuna que a pessoa vê ao vivo
 * enquanto preenche não pode depender de uma chamada que às vezes demora dois
 * segundos e às vezes falha.
 *
 * Ordem importa: a primeira lacuna aberta é a que o card mostra.
 */
export interface Lacuna {
  key: string
  texto: string
}

type Regra = {
  key: string
  aberta: (d: WizardData) => boolean
  texto: (d: WizardData) => string
}

const REGRAS: Regra[] = [
  {
    // A do mockup: sem base, o agente não tem de onde tirar frete/prazo/política.
    key: 'sem-conhecimento',
    aberta: d => d.knowledge_docs.length === 0,
    texto: () =>
      'Sem base de conhecimento, perguntas sobre frete, prazos e políticas vão cair no "não sei". '
      + 'Adicione as páginas que respondem isso na etapa 6.',
  },
  {
    key: 'sem-limites',
    aberta: d => d.cannot_do.length === 0,
    texto: () =>
      'Nada limita este agente ainda. Sem "não pode", ele vai tentar responder o que não deveria — '
      + 'prazos não confirmados, descontos, promessas. Defina os limites na etapa 3.',
  },
  {
    key: 'sem-handoff',
    aberta: d => d.handoff_rules.filter(r => r.enabled).length === 0,
    texto: () =>
      'Nenhuma regra de transferência: reclamação, reembolso e urgência vão ficar com a IA '
      + 'em vez de chegar a uma pessoa. Configure na etapa 5.',
  },
  {
    // Regra sem palavra-chave nunca dispara — parece configurada e não é.
    key: 'regra-sem-gatilho',
    aberta: d => d.handoff_rules.some(r => r.enabled && r.keywords.length === 0),
    texto: d => {
      const n = d.handoff_rules.filter(r => r.enabled && r.keywords.length === 0).length
      return `${n} regra${n > 1 ? 's' : ''} de transferência sem palavra-chave — `
        + `${n > 1 ? 'elas nunca vão disparar' : 'ela nunca vai disparar'}. Revise na etapa 5.`
    },
  },
  {
    key: 'sem-escopo',
    aberta: d => d.can_do.length === 0,
    texto: () =>
      'O agente ainda não tem nada que ele "pode fazer". Sem escopo, o prompt sai genérico '
      + 'e ele responde qualquer coisa. Marque as capacidades na etapa 3.',
  },
]

/** Todas as lacunas abertas, na ordem de prioridade das regras. */
export function lacunas(data: WizardData): Lacuna[] {
  return REGRAS
    .filter(r => r.aberta(data))
    .map(r => ({ key: r.key, texto: r.texto(data) }))
}

/** A lacuna que o card mostra — a primeira aberta, ou `null` se não há nenhuma. */
export function lacunaPrincipal(data: WizardData): Lacuna | null {
  return lacunas(data)[0] ?? null
}
