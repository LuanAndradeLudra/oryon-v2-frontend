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

import type { AgentPromptRequest, HandoffRule } from '@/services/agentsApi'

/** Teto de keywords, idêntico ao do `useStudioDraft.generatePrompt()`. */
const MAX_KEYWORDS = 20

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

/** Regras de handoff, com os campos que a derivação usa. O resto do
 *  `HandoffRule` (id, prioridade, ação…) não participa do prompt. */
function listaDeRegras(v: unknown): Array<Pick<HandoffRule, 'name' | 'description' | 'keywords' | 'department'>> {
  if (!Array.isArray(v)) return []
  const out: Array<Pick<HandoffRule, 'name' | 'description' | 'keywords' | 'department'>> = []
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

// ── resultado ──────────────────────────────────────────────────────────────

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

  const regras = listaDeRegras(deployment?.handoff_rules)
  const nome = texto(identity?.name)

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
    // Remapeamento 3: derivação espelhada do generatePrompt.
    deployment: {
      escalation_keywords: regras.flatMap((r) => r.keywords).slice(0, MAX_KEYWORDS),
      escalation_conditions: regras.map((r) => r.description ?? r.name).filter(Boolean),
      escalation_department: regras.find((r) => r.department)?.department ?? '',
      channels: [
        bool(deployment?.channels_whatsapp) && 'WhatsApp',
        bool(deployment?.channels_messenger) && 'Messenger',
        bool(deployment?.channels_instagram) && 'Instagram',
      ].filter(Boolean) as string[],
    },
  }

  return { request, motivo: null }
}
