import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { stagesApi, customFieldsApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import type { TenantStage, ContactCustomFieldDef } from '@/types'

interface CRMConfig {
  stages: TenantStage[]
  fieldDefs: ContactCustomFieldDef[]
  loadingStages: boolean
  loadingFields: boolean
  refetchStages: () => void
  refetchFieldDefs: () => void
  setStagesOptimistic: (stages: TenantStage[]) => void
}

const CRMConfigContext = createContext<CRMConfig>({
  stages: [],
  fieldDefs: [],
  loadingStages: true,
  loadingFields: true,
  refetchStages: () => {},
  setStagesOptimistic: () => {},
  refetchFieldDefs: () => {},
})

export function CRMConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [stages, setStages] = useState<TenantStage[]>([])
  const [fieldDefs, setFieldDefs] = useState<ContactCustomFieldDef[]>([])
  const [loadingStages, setLoadingStages] = useState(true)
  const [loadingFields, setLoadingFields] = useState(true)

  const refetchStages = useCallback(() => {
    console.log('[CRMConfig] buscando stages...')
    setLoadingStages(true)
    stagesApi.list()
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : []
        console.log('[CRMConfig] stages carregados:', data.length, data.map((s) => s.key))
        setStages(data)
      })
      .catch((err) => {
        console.error('[CRMConfig] falha ao carregar stages:', err?.response?.status, err?.message)
        setStages([])
      })
      .finally(() => setLoadingStages(false))
  }, [])

  const refetchFieldDefs = useCallback(() => {
    setLoadingFields(true)
    customFieldsApi.list()
      .then((r) => setFieldDefs(Array.isArray(r.data) ? r.data : []))
      .catch(() => setFieldDefs([]))
      .finally(() => setLoadingFields(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingStages(false)
      setLoadingFields(false)
      return
    }
    refetchStages()
    refetchFieldDefs()
  }, [isAuthenticated, refetchStages, refetchFieldDefs])

  // Valor memoizado — sem isso, todo render do provider criaria um objeto novo
  // e re-renderizaria os ~26 consumidores de useCRMConfig() desnecessariamente.
  const value = useMemo(
    () => ({ stages, fieldDefs, loadingStages, loadingFields, refetchStages, refetchFieldDefs, setStagesOptimistic: setStages }),
    [stages, fieldDefs, loadingStages, loadingFields, refetchStages, refetchFieldDefs],
  )

  return (
    <CRMConfigContext.Provider value={value}>
      {children}
    </CRMConfigContext.Provider>
  )
}

export function useCRMConfig() {
  return useContext(CRMConfigContext)
}
