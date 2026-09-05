// ─── Catálogo das 10 seções do Workspace (A2 / SCRUM-1013) ──────────────────
// Módulo PURO (sem JSX) para poder ser testado sem render — é o alvo do teste
// `sectionNav` nomeado pela rubrica da Onda 1.
//
// Os 10 ids batem exatamente com os 10 valores de `Tab` do AgentDetail (W0.2),
// que por sua vez são os 10 itens do `snav` do mockup (`p2a-agentes.html`
// #a2) — nenhum nome novo foi inventado aqui.

import {
  BarChart3, BookOpen, FileText, GitBranch, LayoutDashboard,
  ListChecks, Package, Plug, Sparkles, Zap,
} from 'lucide-react'
import type { ComponentType, CSSProperties } from 'react'
import type { Accent } from '@/components/ui/accentColor'

export const SECTION_IDS = [
  'overview', 'prompt', 'knowledge', 'catalog',
  'capabilities', 'skills', 'tools',
  'criteria', 'rules', 'metrics',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

/** Os 4 grupos do mockup. "Visão geral" fica FORA de grupo, sozinha no topo —
 *  por isso `group` é opcional e a ordem de render trata esse caso à parte. */
export type SectionGroup = 'Cérebro' | 'Comportamento' | 'Limites' | 'Resultado'

export const SECTION_GROUPS: SectionGroup[] = ['Cérebro', 'Comportamento', 'Limites', 'Resultado']

export interface SectionDef {
  id: SectionId
  label: string
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  /** Ausente = item sem grupo (só "Visão geral", no topo da nav). */
  group?: SectionGroup
  /** Acento categórico do mockup, sempre por token (`--color-accent-*`),
   *  nunca hex — Carta de Padrões §7. `brand` = cor da marca. */
  accent: Accent
}

/** Ordem de declaração = ordem de render dentro de cada grupo. */
export const SECTIONS: SectionDef[] = [
  { id: 'overview',     label: 'Visão geral',  icon: LayoutDashboard, accent: 'brand'                          },
  { id: 'prompt',       label: 'Prompt',       icon: FileText,        accent: 'violet', group: 'Cérebro'       },
  { id: 'knowledge',    label: 'Conhecimento', icon: BookOpen,        accent: 'cyan',   group: 'Cérebro'       },
  { id: 'catalog',      label: 'Catálogo',     icon: Package,         accent: 'green',  group: 'Cérebro'       },
  { id: 'capabilities', label: 'Capacidades',  icon: Zap,             accent: 'green',  group: 'Comportamento' },
  { id: 'skills',       label: 'Habilidades',  icon: Sparkles,        accent: 'amber',  group: 'Comportamento' },
  { id: 'tools',        label: 'Ferramentas',  icon: Plug,            accent: 'blue',   group: 'Comportamento' },
  { id: 'criteria',     label: 'Critérios',    icon: ListChecks,      accent: 'cyan',   group: 'Limites'       },
  { id: 'rules',        label: 'Regras',       icon: GitBranch,       accent: 'rose',   group: 'Limites'       },
  { id: 'metrics',      label: 'Métricas',     icon: BarChart3,       accent: 'blue',   group: 'Resultado'     },
]

export const DEFAULT_SECTION: SectionId = 'overview'

export function isSectionId(value: string | undefined): value is SectionId {
  return !!value && (SECTION_IDS as readonly string[]).includes(value)
}

export function sectionById(id: SectionId): SectionDef {
  // `id` é SectionId, então o find sempre acha — o `!` evita espalhar
  // `| undefined` por toda a UI por causa de um caso impossível.
  return SECTIONS.find(s => s.id === id)!
}

/** Itens sem grupo (hoje só "Visão geral"), na ordem de declaração. */
export function ungroupedSections(): SectionDef[] {
  return SECTIONS.filter(s => !s.group)
}

/** Seções de um grupo, na ordem de declaração. */
export function sectionsInGroup(group: SectionGroup): SectionDef[] {
  return SECTIONS.filter(s => s.group === group)
}

// ─── Contadores ──────────────────────────────────────────────────────────────
// O `.k` do mockup NÃO é sempre número: aparece como número simples (`4`),
// fração (`3/7`), versão (`v3`) e alerta (`!` em âmbar). Modelo os quatro como
// dado, não como ReactNode, para manter este módulo puro e testável.

export type SectionCounter =
  | { kind: 'text'; text: string }
  /** Renderizado em âmbar (`!` de aviso de token, AS.3). */
  | { kind: 'warning'; text: string }

/** Números que alimentam os contadores. Todo campo é opcional e aceita
 *  `null`: quando a fonte não existe (BE.7/AS.2 ainda não no ar), o contador
 *  simplesmente NÃO aparece — nunca renderizo um `0`/`v1` inventado no lugar
 *  de um dado que não tenho. */
export interface SectionCounters {
  promptVersion?: number | null
  knowledgeReady?: number | null
  catalogItems?: number | null
  capabilitiesEnabled?: number | null
  capabilitiesTotal?: number | null
  skillsActive?: number | null
  toolWarnings?: number | null
  criteriaCount?: number | null
  rulesActive?: number | null
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Contador de uma seção, ou `null` quando não há dado para mostrar. */
export function sectionCounter(id: SectionId, c: SectionCounters = {}): SectionCounter | null {
  switch (id) {
    case 'prompt': {
      const v = num(c.promptVersion)
      // Sem AS.2 não existe histórico de versão: o contador some em vez de
      // fingir um `v1` (§5.11 do A2-plano).
      return v === null || v <= 0 ? null : { kind: 'text', text: `v${v}` }
    }
    case 'knowledge': {
      const v = num(c.knowledgeReady)
      return v === null ? null : { kind: 'text', text: String(v) }
    }
    case 'catalog': {
      const v = num(c.catalogItems)
      return v === null ? null : { kind: 'text', text: String(v) }
    }
    case 'capabilities': {
      const on = num(c.capabilitiesEnabled)
      const total = num(c.capabilitiesTotal)
      // Fração só faz sentido inteira: com metade dos números eu não mostro
      // "3/" nem assumo um total.
      return on === null || total === null ? null : { kind: 'text', text: `${on}/${total}` }
    }
    case 'skills': {
      const v = num(c.skillsActive)
      return v === null ? null : { kind: 'text', text: String(v) }
    }
    case 'tools': {
      const v = num(c.toolWarnings)
      // `!` âmbar só quando existe aviso de verdade (AS.3). Zero avisos = sem
      // contador, não um "0" que parece contagem de ferramentas.
      return v === null || v <= 0 ? null : { kind: 'warning', text: '!' }
    }
    case 'criteria': {
      const v = num(c.criteriaCount)
      return v === null ? null : { kind: 'text', text: String(v) }
    }
    case 'rules': {
      const v = num(c.rulesActive)
      return v === null ? null : { kind: 'text', text: String(v) }
    }
    // "Visão geral" e "Métricas" não têm contador no mockup (`<span class="k">`
    // vazio) — e não invento um.
    case 'overview':
    case 'metrics':
      return null
  }
}
