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
  { key: 'tags', label: 'Etiquetas' },
  { key: 'lastContactedAt', label: 'Último contato' },
  { key: 'deals', label: 'Negócios' },
  { key: 'score', label: 'Score' },
  { key: 'intent', label: 'Intenção' },
  { key: 'sentiment', label: 'Sentimento' },
  { key: 'pipelines', label: 'Funis', gated: true },
  { key: 'source', label: 'Fonte' },
  { key: 'optIn', label: 'Opt-in' },
  { key: 'email', label: 'E-mail' },
]

const DEFAULT_ORDER = CONTACT_COLUMN_DEFS.map((c) => c.key)
const STORAGE_KEY = 'oryon.contacts.columns.v2'

interface StoredConfig {
  order: string[]
  hidden: string[]
}

// spec/1c-contatos.GAPS.md CONT-TABLE-02/COLS-12: a referência só mostra
// Telefone·Situação·Etiquetas·Último contato·Negócios por padrão — as demais
// (Score, Intenção, Sentimento, Funis, Fonte, Opt-in, E-mail) são feature já
// existente no produto e continuam disponíveis aqui, só que off por padrão
// em vez de removidas (opção (a) do bloco "fora da referência" do mapa de
// gaps — decisão de produto, não perda de dado).
const DEFAULT_CONFIG: StoredConfig = {
  order: DEFAULT_ORDER,
  hidden: ['score', 'intent', 'sentiment', 'pipelines', 'source', 'optIn', 'email'],
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
