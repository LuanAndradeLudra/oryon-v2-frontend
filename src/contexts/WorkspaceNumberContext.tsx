// ─── WhatsApp lines cache ────────────────────────────────────────────────
// Centralised read-only cache of the tenant's active WhatsApp lines.
// Used by chips, callouts, the assign modal, and the smart-default hook
// to translate an id into a human label without every component doing
// its own fetch.
//
// Earlier iterations included a global "active line" selection that
// doubled as filter and form pre-fill; after the v3 audit we dropped
// it. Canal-per-resource is the industry pattern (Zendesk, HubSpot,
// Intercom, Chatwoot, Kommo, Front) and it's less confusing than a
// workspace-style switcher within the same tenant.
//
// Filtering lives locally on each list via `<LineFilterChip>`.
// Form defaults come from `useSmartLineDefault` (dept → primary → lone).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { whatsappNumbersApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import type { WhatsAppNumber } from '@/types'

interface WorkspaceNumberContextValue {
  /** All active WhatsApp numbers for the current tenant. */
  numbers: WhatsAppNumber[]
  /** Look up a line by id — convenience for label/phone rendering. */
  findById: (id?: string | null) => WhatsAppNumber | null
  /** Reload from the backend (e.g. after connecting a new line or
   *  promoting a different line to primary). */
  refresh: () => Promise<void>
  /** True during the first fetch. */
  loading: boolean
}

const WorkspaceNumberContext = createContext<WorkspaceNumberContextValue | null>(null)

export function WorkspaceNumberProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''

  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const fetchNumbers = useCallback(async () => {
    if (!tenantId) {
      setNumbers([])
      setLoading(false)
      return
    }
    try {
      // Revisão final 04/10: /meta/numbers é só de administrador — para os
      // demais papéis a lista vinha vazia e tudo aparecia como "sem linha".
      // /whatsapp/numbers serve a todos os papéis e traz os mesmos campos.
      const { data } = await whatsappNumbersApi.listDetailed()
      setNumbers((data ?? []).filter((n) => n.isActive !== false))
    } catch {
      // Falha de rede: lista vazia (os chips mostram "sem linha" e os
      // formulários buscam a lista direto como alternativa).
      setNumbers([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    setLoading(true)
    fetchNumbers()
  }, [fetchNumbers])

  const findById = useCallback(
    (id?: string | null) => (id ? numbers.find((n) => n.id === id) ?? null : null),
    [numbers],
  )

  const value = useMemo<WorkspaceNumberContextValue>(
    () => ({ numbers, findById, refresh: fetchNumbers, loading }),
    [numbers, findById, fetchNumbers, loading],
  )

  return (
    <WorkspaceNumberContext.Provider value={value}>
      {children}
    </WorkspaceNumberContext.Provider>
  )
}

export function useWorkspaceNumber(): WorkspaceNumberContextValue {
  const ctx = useContext(WorkspaceNumberContext)
  if (!ctx) {
    throw new Error('useWorkspaceNumber must be used within <WorkspaceNumberProvider>')
  }
  return ctx
}
