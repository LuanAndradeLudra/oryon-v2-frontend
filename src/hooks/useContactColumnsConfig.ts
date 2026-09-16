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

export const CONTACT_COLUMN_DEFS: ContactColumnDef[] = [
  { key: 'phone', label: 'Telefone' },
  { key: 'stage', label: 'Situação' },
  { key: 'score', label: 'Score' },
  { key: 'intent', label: 'Intenção' },
  { key: 'sentiment', label: 'Sentimento' },
  { key: 'tags', label: 'Etiquetas' },
  { key: 'pipelines', label: 'Funis', gated: true },
  { key: 'source', label: 'Fonte' },
  { key: 'lastContactedAt', label: 'Último contato' },
  { key: 'optIn', label: 'Opt-in' },
]

const DEFAULT_ORDER = CONTACT_COLUMN_DEFS.map((c) => c.key)
const STORAGE_KEY = 'oryon.contacts.columns.v1'

interface StoredConfig {
  order: string[]
  hidden: string[]
}

const DEFAULT_CONFIG: StoredConfig = { order: DEFAULT_ORDER, hidden: [] }

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
    if (!raw) return DEFAULT_CONFIG
    return sanitize(JSON.parse(raw))
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
