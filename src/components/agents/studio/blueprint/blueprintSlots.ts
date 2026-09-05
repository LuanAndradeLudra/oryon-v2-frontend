import { Target, Briefcase, CheckCircle2, Ban, GitBranch, BookOpen, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Accent } from '@/components/ui/accentColor'
import type { WizardData } from '../types'

/**
 * O cartão blueprint (A3) é o centro do Studio: sete encaixes que vão sendo
 * preenchidos conforme as etapas fecham. Vazio = borda tracejada e um texto
 * dizendo de qual etapa aquilo vem; preenchido = borda sólida e ícone no
 * acento da categoria.
 *
 * Isto aqui é só a derivação `WizardData -> encaixes`, sem JSX, porque é a
 * parte que tem regra de verdade (o que conta como "preenchido", como um
 * conjunto de regras de handoff vira uma linha legível) e é o que dá para
 * travar em teste. Quem desenha é o `BlueprintCard`.
 */
export interface BlueprintSlot {
  key: string
  label: string
  /** `null` = encaixe neutro, sem cor categórica (Conhecimento e System prompt). */
  accent: Accent | null
  icon: LucideIcon
  filled: boolean
  /** Conteúdo quando preenchido; quando vazio, o "Etapa N — …" que o mockup mostra. */
  value: string
  /** Ocupa a linha inteira do grid de 2 colunas. */
  wide?: boolean
}

const SEP = ' · '

/** "reembolso · estorno · devolver → Setor Financeiro", uma entrada por regra ativa. */
export function formatHandoffRules(data: WizardData): string {
  return data.handoff_rules
    .filter(r => r.enabled && r.keywords.length > 0)
    .map(r => {
      const gatilho = r.keywords.join(SEP)
      // `department` é o destino nomeado; sem ele a regra ainda vale, só não
      // tem para onde apontar — o texto então diz o que a regra faz.
      const destino = r.department?.trim() || rotuloDaAcao(r.action)
      return `${gatilho} → ${destino}`
    })
    .join(SEP + SEP)
}

function rotuloDaAcao(action: string): string {
  switch (action) {
    case 'human_handoff':     return 'Atendimento humano'
    case 'external_redirect': return 'Link externo'
    case 'auto_reply':        return 'Resposta automática'
    case 'pass_to_ai':        return 'Seguir com a IA'
    default:                  return 'Atendimento humano'
  }
}

/** Resumo do negócio: "Nuvem Moda · moda feminina · 3 FAQs" (só as partes que existem). */
function resumoDoNegocio(data: WizardData): string {
  const partes: string[] = []
  if (data.company_name.trim()) partes.push(data.company_name.trim())
  if (data.company_description.trim()) partes.push(primeiraFrase(data.company_description))
  if (data.faqs.length > 0) partes.push(`${data.faqs.length} FAQ${data.faqs.length > 1 ? 's' : ''}`)
  return partes.join(SEP)
}

/** O blueprint mostra uma linha, não um parágrafo — corta na 1ª frase e limita. */
function primeiraFrase(texto: string, max = 80): string {
  const limpo = texto.trim().replace(/\s+/g, ' ')
  const fim = limpo.search(/[.!?](\s|$)/)
  const frase = fim > 0 ? limpo.slice(0, fim) : limpo
  return frase.length > max ? `${frase.slice(0, max - 1).trimEnd()}…` : frase
}

export function blueprintSlots(data: WizardData): BlueprintSlot[] {
  const handoff = formatHandoffRules(data)
  const negocio = resumoDoNegocio(data)
  const objetivo = data.objective.trim()

  return [
    {
      key: 'objetivo',
      label: 'Objetivo',
      accent: 'blue',
      icon: Target,
      filled: objetivo.length > 0,
      value: objetivo || 'Etapa 1 — o que este agente resolve',
    },
    {
      key: 'negocio',
      label: 'Negócio',
      accent: 'green',
      icon: Briefcase,
      filled: negocio.length > 0,
      value: negocio || 'Etapa 4 — de que empresa ele fala',
    },
    {
      key: 'pode',
      label: 'Pode',
      accent: 'green',
      icon: CheckCircle2,
      filled: data.can_do.length > 0,
      value: data.can_do.length > 0 ? data.can_do.join(SEP) : 'Etapa 3 — o que ele pode fazer',
    },
    {
      key: 'nao-pode',
      label: 'Não pode',
      accent: 'rose',
      icon: Ban,
      filled: data.cannot_do.length > 0,
      value: data.cannot_do.length > 0 ? data.cannot_do.join(SEP) : 'Etapa 3 — onde ele para',
    },
    {
      key: 'handoff',
      label: 'Passa para humano',
      accent: 'amber',
      icon: GitBranch,
      filled: handoff.length > 0,
      value: handoff || 'Etapa 5 — quando chamar uma pessoa',
      wide: true,
    },
    {
      key: 'conhecimento',
      label: 'Conhecimento',
      accent: null,
      icon: BookOpen,
      filled: data.knowledge_docs.length > 0,
      value: data.knowledge_docs.length > 0
        ? `${data.knowledge_docs.length} fonte${data.knowledge_docs.length > 1 ? 's' : ''}`
        : 'Etapa 6 — nenhuma fonte ainda',
    },
    {
      key: 'system-prompt',
      label: 'System prompt',
      accent: null,
      icon: Sparkles,
      filled: data.generated_prompt.trim().length > 0,
      value: data.generated_prompt.trim().length > 0
        ? 'Gerado a partir de tudo isso'
        : 'Etapa 7 — gerado a partir de tudo isso',
    },
  ]
}
