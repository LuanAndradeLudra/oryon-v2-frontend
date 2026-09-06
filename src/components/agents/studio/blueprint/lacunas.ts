import type { WizardData } from '../types'

/**
 * O card âmbar "Lacuna" do blueprint: o que ainda vai fazer o agente tropeçar
 * se publicado assim. Regras LOCAIS sobre o `WizardData`, por decisão do
 * Maestro (`coord/A3-decisoes.md` §4) — determinístico, testável sem rede,
 * sem latência e sem custo por token. Uma lacuna que a pessoa vê ao vivo
 * enquanto preenche não pode depender de uma chamada que às vezes demora dois
 * segundos e às vezes falha.
 *
 * Ordem importa: é a ordem de prioridade do mockup, e é a ordem da LISTA.
 * Qual delas o card DESTACA é outra escolha — ver `lacunaPrincipal`.
 */
export interface Lacuna {
  key: string
  texto: string
  /** Etapa do wizard onde esta lacuna se resolve — a mesma citada no `texto`. */
  etapa: number
}

type Regra = {
  key: string
  /** Etapa onde a lacuna se fecha. Tem de bater com a etapa citada no `texto`. */
  etapa: number
  aberta: (d: WizardData) => boolean
  texto: (d: WizardData) => string
}

const REGRAS: Regra[] = [
  {
    // A do mockup: sem base, o agente não tem de onde tirar frete/prazo/política.
    key: 'sem-conhecimento',
    etapa: 6,
    aberta: d => d.knowledge_docs.length === 0,
    texto: () =>
      'Sem base de conhecimento, perguntas sobre frete, prazos e políticas vão cair no "não sei". '
      + 'Adicione as páginas que respondem isso na etapa 6.',
  },
  {
    key: 'sem-limites',
    etapa: 3,
    aberta: d => d.cannot_do.length === 0,
    texto: () =>
      'Nada limita este agente ainda. Sem "não pode", ele vai tentar responder o que não deveria — '
      + 'prazos não confirmados, descontos, promessas. Defina os limites na etapa 3.',
  },
  {
    key: 'sem-handoff',
    etapa: 5,
    aberta: d => d.handoff_rules.filter(r => r.enabled).length === 0,
    texto: () =>
      'Nenhuma regra de transferência: reclamação, reembolso e urgência vão ficar com a IA '
      + 'em vez de chegar a uma pessoa. Configure na etapa 5.',
  },
  {
    // Regra sem palavra-chave nunca dispara — parece configurada e não é.
    key: 'regra-sem-gatilho',
    etapa: 5,
    aberta: d => d.handoff_rules.some(r => r.enabled && r.keywords.length === 0),
    texto: d => {
      const n = d.handoff_rules.filter(r => r.enabled && r.keywords.length === 0).length
      return `${n} regra${n > 1 ? 's' : ''} de transferência sem palavra-chave — `
        + `${n > 1 ? 'elas nunca vão disparar' : 'ela nunca vai disparar'}. Revise na etapa 5.`
    },
  },
  {
    key: 'sem-escopo',
    etapa: 3,
    aberta: d => d.can_do.length === 0,
    texto: () =>
      'O agente ainda não tem nada que ele "pode fazer". Sem escopo, o prompt sai genérico '
      + 'e ele responde qualquer coisa. Marque as capacidades na etapa 3.',
  },
]

/** Todas as lacunas abertas, na ordem de prioridade das regras (a do mockup). */
export function lacunas(data: WizardData): Lacuna[] {
  return REGRAS
    .filter(r => r.aberta(data))
    .map(r => ({ key: r.key, texto: r.texto(data), etapa: r.etapa }))
}

/**
 * A lacuna que o card DESTACA.
 *
 * Sem `etapaAtual`, é a primeira da ordem do mockup — comportamento original.
 *
 * Com `etapaAtual`, é a **alcançável mais próxima**, e a razão é um achado do
 * Lince na revisão do #139: num rascunho novo, todas as regras estão abertas, e
 * a primeira da lista é `sem-conhecimento`, que só fecha na **etapa 6**. Ou
 * seja, a pessoa parada na etapa 1 lia "adicione na etapa 6" — a etapa mais
 * DISTANTE das cinco — durante a jornada inteira, enquanto escopo, limites e
 * transferência (etapas 3 e 5) ficavam invisíveis até ela passar por elas.
 * Um aviso que só aponta para longe é um aviso que a pessoa aprende a ignorar.
 *
 * "Alcançável" = etapa que a pessoa já visitou, porque o acordeão só deixa
 * voltar para etapa concluída: essas ela resolve AGORA. Entre as alcançáveis,
 * ganha a mais próxima de onde ela está (a de maior etapa `<= etapaAtual`).
 * Se nenhuma lacuna estiver para trás, mostra a mais próxima à frente — a
 * primeira que ela vai encontrar seguindo em frente, não a mais distante.
 * Empate de etapa (3 e 3, 5 e 5) desempata pela ordem do mockup, que é a
 * ordem de prioridade e continua mandando na lista.
 */
export function lacunaPrincipal(data: WizardData, etapaAtual?: number): Lacuna | null {
  const abertas = lacunas(data)
  if (abertas.length === 0) return null
  if (etapaAtual === undefined) return abertas[0]

  const atras = abertas.filter(l => l.etapa <= etapaAtual)
  const candidatas = atras.length > 0 ? atras : abertas
  // `reduce` em vez de `sort`: não reordena o array da lista e o desempate por
  // ordem do mockup sai de graça (só troca quando é estritamente melhor).
  return candidatas.reduce((melhor, l) =>
    Math.abs(l.etapa - etapaAtual) < Math.abs(melhor.etapa - etapaAtual) ? l : melhor,
  )
}
