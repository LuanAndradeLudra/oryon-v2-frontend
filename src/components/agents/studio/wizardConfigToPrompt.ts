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
// A terceira é COMPARTILHADA com `useStudioDraft.generatePrompt()`: os dois
// chamam a mesma `derivarDeployment` exportada daqui. Antes ela era só
// "espelho", com a igualdade mantida por disciplina e conferida por um teste
// que na verdade comparava duas cópias novas entre si — ver o docblock de
// `derivarDeployment` para como isso passou verde com uma divergência
// grosseira plantada. Partir do `wizard_config` em vez do `WizardData` não
// muda a regra, e agora não muda o CÓDIGO.
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
export type RegraParaPrompt = Pick<HandoffRule, 'name' | 'description' | 'keywords' | 'department'> & {
  /**
   * Ausente = LIGADA. Só o `false` explícito desqualifica: um retrato gravado
   * antes de a flag existir não pode perder todas as regras em silêncio.
   *
   * PRECEDENTE, corrigido — a versão anterior deste comentário citava os
   * arquétipos, e lá NÃO há filtro nenhum: o `applyArchetype.ts` grava
   * `enabled: true` cravado. A convenção existe, mas nas LINHAS DE WHATSAPP:
   * `onboardingState.ts:45` e `:71`, `WorkspaceNumberContext.tsx:57`, os três
   * com `isActive !== false`.
   *
   * E ela NÃO é universal, o que também vale saber: `CapabilitiesTab.tsx:422`
   * filtra `users.filter((u) => u.isActive)` — truthy, ausente = EXCLUÍDO. A
   * diferença parece ser de risco, não descuido: linha sem a flag ainda dá para
   * usar, mas oferecer como responsável um usuário cujo estado se desconhece é
   * pior que não oferecer. Quem for aplicar a convenção de novo precisa
   * escolher o lado com esse critério, não por analogia.
   */
  enabled?: boolean
}

/** Canais ligados, no formato que a derivação lê. O wizard tem três booleanos
 *  soltos; o agente vivo tem `{ enabled }`. Os dois chegam aqui já reduzidos. */
export interface CanaisLigados {
  whatsapp: boolean
  messenger: boolean
  instagram: boolean
}

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

/**
 * O estado vivo MANDA quando traz conteúdo — e "conteúdo" é a CHAVE presente,
 * não o objeto presente.
 *
 * `agent.handoff_rules` e `agent.channels` NASCEM `{}` no banco, em agente que
 * nunca configurou nem regra nem canal. Como `{}` é truthy, tratar o objeto
 * como sinal fazia o vivo VAZIO apagar o retrato: um agente criado pelo wizard
 * com 3 regras e WhatsApp, nunca tocado no workspace, regenerava com zero
 * regra, zero palavra de escalação, departamento vazio e nenhum canal — em
 * silêncio. O próprio repo já sabia que o banco guarda `{}`:
 * `agentsApi.ts:815` lê `fields.handoff_rules.rules?.length ?? 0`.
 *
 * São duas coisas truthy que significam o OPOSTO, e a chave as separa:
 *   • `{ rules: [] }` → "apaguei todas", decisão do usuário, VENCE o retrato;
 *   • `{}`            → "nunca configurei", que é como nasce, e NÃO apaga nada.
 *
 * A chave presente com lixo dentro continua sendo o vivo mandando: a fonte
 * existe, só não dá para ler — e cair no retrato ali mostraria regra velha
 * como se fosse a de agora.
 */
function temChave(o: object | null | undefined, ...chaves: string[]): boolean {
  if (!o || typeof o !== 'object') return false
  return chaves.some((k) => k in o)
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
      enabled: o.enabled === false ? false : true,
    })
  }
  return out
}

/**
 * A derivação de `deployment`, num lugar só — **para os três caminhos**, não
 * só para os dois daqui. O `useStudioDraft.generatePrompt()` importa e chama
 * esta função; ela não *espelha* aquilo, ela **é** aquilo.
 *
 * POR QUE ISTO É EXPORTADO, e vale ler antes de desfazer: até o
 * `fea894c` existiam TRÊS cópias desta derivação — aqui, no `generatePrompt` e
 * uma terceira escrita à mão dentro do próprio teste de espelho. O comentário
 * deste arquivo prometia que o teste comparava a derivação com a do wizard, e
 * não comparava: comparava as duas cópias NOVAS entre si. O Calibre provou
 * mudando o `slice(0, 20)` para `slice(0, 3)` **no `generatePrompt`** — uma
 * divergência grosseira — e a suíte ficou 25/25 verde, typecheck limpo. O
 * único caminho capaz de produzir o defeito era o único descoberto.
 *
 * Promessa em comentário não é acoplamento. Uma função só é.
 */
export function derivarDeployment(
  regras: RegraParaPrompt[],
  canais: CanaisLigados,
): AgentPromptRequest['deployment'] {
  // REGRA DESLIGADA NÃO ENTRA NO PROMPT, e o filtro mora aqui — na função
  // compartilhada — porque o defeito não era de um caminho só. O
  // `HandoffRuleBuilder` (o mesmo componente no Step 5 do wizard e na seção
  // Regras do workspace) escreve `enabled: !r.enabled` no toggle, então os
  // TRÊS caminhos que chegam nesta função podiam trazer regra desligada:
  // o wizard, o retrato do `wizard_config` e o estado vivo do agente.
  //
  // O que a tela prometia era falso nos três: as keywords e o departamento de
  // uma regra que o operador DESLIGOU iam para o prompt, então o agente
  // escalava por um critério que a tela mostra apagado. É a tela afirmando um
  // comportamento que o agente não tem.
  //
  // Ausente = ligada: só o `false` explícito desqualifica. Retrato gravado
  // antes de a flag existir não pode perder todas as regras em silêncio.
  const ligadas = regras.filter((r) => r.enabled !== false)
  return {
    escalation_keywords: ligadas.flatMap((r) => r.keywords).slice(0, MAX_KEYWORDS),
    escalation_conditions: ligadas.map((r) => r.description ?? r.name).filter(Boolean),
    escalation_department: ligadas.find((r) => r.department)?.department ?? '',
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
 * Cada campo com CONTEÚDO **manda**, inclusive vazio: `{ rules: [] }` significa
 * "o usuário apagou todas as regras", e isso vence o retrato. Campo ausente —
 * e `{}`, que é como o banco NASCE — cai no retrato. Ver `temChave`: objeto
 * presente não é sinal, chave presente é.
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
  const regras = temChave(estadoVivo?.handoff_rules, 'rules')
    ? listaDeRegras(estadoVivo?.handoff_rules?.rules)
    : listaDeRegras(deployment?.handoff_rules)

  const canais = temChave(estadoVivo?.channels, 'whatsapp', 'messenger', 'instagram')
    ? {
        whatsapp: bool(estadoVivo?.channels?.whatsapp?.enabled),
        messenger: bool(estadoVivo?.channels?.messenger?.enabled),
        instagram: bool(estadoVivo?.channels?.instagram?.enabled),
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
