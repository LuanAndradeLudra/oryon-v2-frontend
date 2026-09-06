// ─── wizard_config → AgentPromptRequest ────────────────────────────────────
// Alimenta o "Regenerar" da A2 (Workspace), que precisa remontar o pedido de
// prompt a partir de um agente JÁ PUBLICADO — onde a única fonte é o
// `wizard_config` gravado, e não o `WizardData` vivo do wizard.
//
// As duas estruturas têm as mesmas cinco seções, mas os shapes NÃO batem 1:1.
// São três remapeamentos, e nenhum deles é invenção:
//
//   · `identity.emoji`     ← `identity.icon`      (nome diferente, mesmo dado)
//   · `business.faqs`      ← `scope.faqs`         (mora em outra seção)
//   · `deployment.*`       ← `channels_*` + `handoff_rules`  (derivação)
//
// E um cuidado que só aparece de quem CONSOME (achado da Tecelã): o
// `wizard_config` é um RETRATO do momento do wizard, mas regras de handoff e
// canais têm coluna própria no agente vivo, editada pelo workspace. O retrato
// serve o que só existe nele; o que tem fonte viva vem da fonte viva — ver
// `EstadoVivoDoAgente`.
//
// A terceira é ESPELHO de `useStudioDraft.generatePrompt()`: mesmo `flatMap`
// das keywords com o mesmo corte em 20, mesmo `map` das descrições com queda
// para o nome da regra, mesmo `find` do primeiro departamento, mesma montagem
// do array de canais na mesma ordem. Partir do `wizard_config` em vez do
// `WizardData` não muda a regra — se aquela mudar, esta muda junto, e é por
// isso que o teste compara as duas.
//
// O `wizard_config` é `Record<string, unknown>`: veio do banco e ninguém
// garante o shape. O estreitamento defensivo aqui é o mesmo que o `deckFormat`
// precisou pela mesma razão — ler campo de um objeto que o TypeScript não
// conhece é a fronteira onde a tipagem para de valer.

import type { AgentChannels, AgentPromptRequest, HandoffRule, HandoffRules } from '@/services/agentsApi'

/** Teto de keywords, idêntico ao do `useStudioDraft.generatePrompt()`. */
const MAX_KEYWORDS = 20

/** Regra de handoff reduzida ao que o prompt usa. O resto do `HandoffRule`
 *  (id, prioridade, ação, template…) não participa da derivação. */
type RegraParaPrompt = Pick<HandoffRule, 'name' | 'description' | 'keywords' | 'department'>

// ── estreitamento ──────────────────────────────────────────────────────────

function secao(cfg: Record<string, unknown>, nome: string): Record<string, unknown> | null {
  const v = cfg[nome]
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function listaDeTexto(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function bool(v: unknown): boolean {
  return v === true
}

/** FAQs só entram quando o par pergunta/resposta existe de verdade. Um item
 *  meio preenchido viraria contexto vazio no prompt, que é ruído, não dado. */
function listaDeFaqs(v: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(v)) return []
  const out: Array<{ question: string; answer: string }> = []
  for (const item of v) {
    if (item === null || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const question = texto(o.question)
    const answer = texto(o.answer)
    if (question || answer) out.push({ question, answer })
  }
  return out
}

/** Regras de handoff, com os campos que a derivação usa. */
function listaDeRegras(v: unknown): RegraParaPrompt[] {
  if (!Array.isArray(v)) return []
  const out: RegraParaPrompt[] = []
  for (const item of v) {
    if (item === null || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    out.push({
      name: texto(o.name),
      description: typeof o.description === 'string' ? o.description : undefined,
      keywords: listaDeTexto(o.keywords),
      department: typeof o.department === 'string' ? o.department : undefined,
    })
  }
  return out
}

/**
 * A derivação de `deployment`, num lugar só. Espelha
 * `useStudioDraft.generatePrompt()` — mesmo `flatMap` com o mesmo corte, mesmo
 * `map` caindo para o nome da regra, mesmo `find` do PRIMEIRO departamento,
 * mesma ordem de canais.
 *
 * Os dois caminhos (retrato e estado vivo) passam por aqui de propósito: um
 * segundo caminho seria uma segunda regra para manter em sincronia, que é
 * exatamente o problema que o teste de espelho existe para impedir.
 */
function derivarDeployment(
  regras: RegraParaPrompt[],
  canais: { whatsapp: boolean; messenger: boolean; instagram: boolean },
): AgentPromptRequest['deployment'] {
  return {
    escalation_keywords: regras.flatMap((r) => r.keywords).slice(0, MAX_KEYWORDS),
    escalation_conditions: regras.map((r) => r.description ?? r.name).filter(Boolean),
    escalation_department: regras.find((r) => r.department)?.department ?? '',
    channels: [
      canais.whatsapp && 'WhatsApp',
      canais.messenger && 'Messenger',
      canais.instagram && 'Instagram',
    ].filter(Boolean) as string[],
  }
}

// ── resultado ──────────────────────────────────────────────────────────────

/**
 * Estado VIVO do agente, para as partes que têm fonte de verdade fora do
 * retrato do wizard.
 *
 * `wizard_config.deployment` é um **retrato do momento do wizard**. Já as
 * regras de handoff e os canais do agente vivo têm coluna própria
 * (`agent.handoff_rules`, `agent.channels`) e é ela que a seção de Regras do
 * workspace edita. Sem isto, quem cria pelo wizard, adiciona duas regras no
 * workspace e clica em "Regenerar" recebe um prompt remontado com as regras
 * ANTIGAS — as novas somem e nada avisa.
 *
 * É argumento da função, e não sobrescrita no chamador, porque a correção
 * precisa viajar COM o mapeador: quem consumir depois (a Onda 2 religa isto)
 * cairia na mesma armadilha se o conserto morasse num call site.
 *
 * Cada campo presente **manda**, inclusive vazio: `{ rules: [] }` significa
 * "o usuário apagou todas as regras", e isso vence o retrato. Campo ausente
 * cai no retrato.
 */
export interface EstadoVivoDoAgente {
  handoff_rules?: HandoffRules | null
  channels?: AgentChannels | null
}

export interface WizardConfigMapResult {
  /** `null` quando não há entrada suficiente para gerar. */
  request: AgentPromptRequest | null
  /** Frase pronta para o `title`/tooltip do botão desabilitado. `null` quando
   *  o mapeamento deu certo. */
  motivo: string | null
}

/** Motivo padrão do agente sem wizard: existe de verdade no tenant local, e
 *  o botão fica DESABILITADO COM MOTIVO, nunca oculto — a capacidade existe,
 *  o que falta é a entrada DESTE agente. */
export const MOTIVO_SEM_WIZARD =
  'Este agente não tem configuração do wizard salva, então não há de onde regenerar o prompt.'

// ── mapeamento ─────────────────────────────────────────────────────────────

/**
 * Remonta o `AgentPromptRequest` a partir do `wizard_config` de um agente
 * publicado.
 *
 * Devolve `request: null` **com motivo** quando o `wizard_config` está ausente,
 * vazio, ou não tem nenhuma das seções conhecidas. Quem chama desabilita o
 * "Regenerar" e mostra o motivo, em vez de ocultar o botão: a diferença
 * importa porque a capacidade existe no produto — é este agente que não tem
 * entrada.
 *
 * Seções presentes mas incompletas **não** bloqueiam: o wizard também deixa
 * publicar com campo opcional vazio, e um prompt gerado a partir de metade dos
 * dados ainda é melhor que um botão morto.
 */
export function wizardConfigToPromptRequest(
  wizardConfig: Record<string, unknown> | null | undefined,
  estadoVivo?: EstadoVivoDoAgente | null,
): WizardConfigMapResult {
  if (!wizardConfig || typeof wizardConfig !== 'object') {
    return { request: null, motivo: MOTIVO_SEM_WIZARD }
  }

  const identity = secao(wizardConfig, 'identity')
  const personality = secao(wizardConfig, 'personality')
  const scope = secao(wizardConfig, 'scope')
  const business = secao(wizardConfig, 'business')
  const deployment = secao(wizardConfig, 'deployment')

  // Mesmo critério de "shape conhecido" do `draftProgress`: sem NENHUMA das
  // seções, isto não é um wizard_config — é outra coisa, ou está vazio.
  if (!identity && !personality && !scope && !business && !deployment) {
    return { request: null, motivo: MOTIVO_SEM_WIZARD }
  }

  const nome = texto(identity?.name)

  // O retrato serve o que SÓ existe nele; o que tem fonte viva vem da fonte
  // viva. Presença manda, inclusive vazia — `{ rules: [] }` é "apaguei todas".
  const regras = estadoVivo?.handoff_rules
    ? listaDeRegras(estadoVivo.handoff_rules.rules)
    : listaDeRegras(deployment?.handoff_rules)

  const canais = estadoVivo?.channels
    ? {
        whatsapp: bool(estadoVivo.channels.whatsapp?.enabled),
        messenger: bool(estadoVivo.channels.messenger?.enabled),
        instagram: bool(estadoVivo.channels.instagram?.enabled),
      }
    : {
        whatsapp: bool(deployment?.channels_whatsapp),
        messenger: bool(deployment?.channels_messenger),
        instagram: bool(deployment?.channels_instagram),
      }

  const request: AgentPromptRequest = {
    identity: {
      name: nome,
      // Remapeamento 1: o pedido chama de `emoji` o que o wizard_config grava
      // como `icon`.
      emoji: texto(identity?.icon),
      sector: texto(identity?.sector),
      objective: texto(identity?.objective),
    },
    personality: {
      // Espelha o `persona_name || name` do generatePrompt: sem persona, a
      // persona é o próprio nome do agente.
      persona_name: texto(personality?.persona_name) || nome,
      tone: texto(personality?.tone),
      language: texto(personality?.language),
      response_style: listaDeTexto(personality?.response_style),
    },
    scope: {
      can_do: listaDeTexto(scope?.can_do),
      cannot_do: listaDeTexto(scope?.cannot_do),
    },
    business: {
      company_name: texto(business?.company_name),
      company_description: texto(business?.company_description),
      products_services: texto(business?.products_services),
      // Remapeamento 2: no pedido as FAQs são do negócio; no wizard_config
      // elas moram em `scope`.
      faqs: listaDeFaqs(scope?.faqs),
      // Mesma junção do generatePrompt: contexto livre + contexto das marcas,
      // separados por linha em branco, sem deixar vazio no meio.
      extra_context: [texto(business?.extra_context), texto(business?.brand_links_context)]
        .filter(Boolean)
        .join('\n\n'),
    },
    // Remapeamento 3: derivação espelhada do generatePrompt, num lugar só,
    // servida pelo retrato ou pelo estado vivo conforme decidido acima.
    deployment: derivarDeployment(regras, canais),
  }

  return { request, motivo: null }
}
