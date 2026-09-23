import { useCallback, useEffect, useState } from 'react'

/**
 * Colunas configuráveis da tabela de Contatos (README restyle-2026, 3.2 —
 * "Modal Configurar colunas"). `Nome` é fixa (sempre visível, sempre
 * primeira) — não entra nesta lista, o caller sempre a renderiza à parte.
 * `pipelines` (Funis) só existe com `useMultiPipeline()` — ver `gated` abaixo.
 */
export interface ContactColumnDef {
  key: string
  label: string
  /** Só existe com o módulo de múltiplos funis habilitado (SCRUM-498). */
  gated?: boolean
}

// Ordem = a do modo "Tabela" (Direção B, DECISÕES #33): as colunas visíveis por
// padrão vêm primeiro (Situação · Última interação · Negócios; "Nome" é fixa),
// as demais seguem disponíveis no modal "Configurar colunas". Não há coluna
// "Responsável": o contato não traz dono na API (só o negócio/conversa têm).
export const CONTACT_COLUMN_DEFS: ContactColumnDef[] = [
  { key: 'stage', label: 'Situação' },
  { key: 'lastContactedAt', label: 'Última interação' },
  { key: 'deals', label: 'Negócios' },
  { key: 'phone', label: 'Telefone' },
  { key: 'tags', label: 'Etiquetas' },
  { key: 'score', label: 'Score' },
  { key: 'intent', label: 'Intenção' },
  { key: 'sentiment', label: 'Sentimento' },
  { key: 'pipelines', label: 'Funis', gated: true },
  { key: 'source', label: 'Fonte' },
  { key: 'optIn', label: 'Opt-in' },
  { key: 'email', label: 'E-mail' },
]

const DEFAULT_ORDER = CONTACT_COLUMN_DEFS.map((c) => c.key)
const STORAGE_KEY = 'oryon.contacts.columns.v3'
const LEGACY_STORAGE_KEY = 'oryon.contacts.columns.v2'

interface StoredConfig {
  order: string[]
  hidden: string[]
}

// Padrão (DECISÕES #33, Direção B): Nome · Situação · Última interação ·
// Negócios. Telefone e Etiquetas saem da grade (viram subtítulo e chips DENTRO
// da célula Nome enquanto a coluna própria estiver oculta); Score, Intenção,
// Sentimento, Funis, Fonte, Opt-in e E-mail seguem disponíveis, off por padrão,
// em vez de removidos (decisão de produto, não perda de dado).
const DEFAULT_CONFIG: StoredConfig = {
  order: DEFAULT_ORDER,
  hidden: ['phone', 'tags', 'score', 'intent', 'sentiment', 'pipelines', 'source', 'optIn', 'email'],
}

// Padrão da v2, para reconhecer quem nunca mexeu nas colunas: a v2 era gravada
// a cada montagem (mesmo sem customização), então "existe v2" não diz nada —
// só "v2 idêntica ao padrão antigo" diz que o usuário nunca personalizou.
const LEGACY_V2_DEFAULT: StoredConfig = {
  order: ['phone', 'stage', 'tags', 'lastContactedAt', 'deals', 'score', 'intent', 'sentiment', 'pipelines', 'source', 'optIn', 'email'],
  hidden: ['score', 'intent', 'sentiment', 'pipelines', 'source', 'optIn', 'email'],
}

function isLegacyDefault(stored: Partial<StoredConfig>): boolean {
  const order = stored.order ?? []
  const hidden = new Set(stored.hidden ?? [])
  return order.length === LEGACY_V2_DEFAULT.order.length
    && order.every((k, i) => k === LEGACY_V2_DEFAULT.order[i])
    && hidden.size === LEGACY_V2_DEFAULT.hidden.length
    && LEGACY_V2_DEFAULT.hidden.every((k) => hidden.has(k))
}

/** Reconcilia com STORED contra os defs atuais — colunas removidas do código
 *  desaparecem, colunas novas entram no fim, sem derrubar a preferência salva. */
function sanitize(stored: Partial<StoredConfig> | null): StoredConfig {
  const knownKeys = new Set(DEFAULT_ORDER)
  const storedOrder = (stored?.order ?? []).filter((k) => knownKeys.has(k))
  const missing = DEFAULT_ORDER.filter((k) => !storedOrder.includes(k))
  const order = [...storedOrder, ...missing]
  const hidden = (stored?.hidden ?? []).filter((k) => knownKeys.has(k))
  return { order, hidden }
}

function load(): StoredConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return sanitize(JSON.parse(raw))
    // Migração v2 → v3: quem personalizou mantém a escolha; quem estava no
    // padrão antigo passa para o novo padrão.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<StoredConfig>
      return isLegacyDefault(parsed) ? DEFAULT_CONFIG : sanitize(parsed)
    }
    return DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

export interface ContactColumnsConfig {
  /** Ordem das colunas TOGGLÁVEIS (sem "Nome", que é sempre a primeira). */
  order: string[]
  hiddenKeys: Set<string>
  /** Substitui ordem + visibilidade de uma vez (usado pelo modal ao Salvar). */
  apply: (next: { order: string[]; hidden: string[] }) => void
  restoreDefaults: () => void
}

export function useContactColumnsConfig(): ContactColumnsConfig {
  const [state, setState] = useState<StoredConfig>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Preferência de UI — sem storage disponível (modo privado etc.), a
      // configuração só não sobrevive ao reload. Não é um erro pra reportar.
    }
  }, [state])

  const apply = useCallback((next: { order: string[]; hidden: string[] }) => {
    setState(sanitize(next))
  }, [])

  const restoreDefaults = useCallback(() => setState(DEFAULT_CONFIG), [])

  return { order: state.order, hiddenKeys: new Set(state.hidden), apply, restoreDefaults }
}
