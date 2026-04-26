import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
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
    setLoadingStages(true)
    stagesApi.list()
      .then((r) => setStages(Array.isArray(r.data) ? r.data : []))
      .catch(() => setStages([]))
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

  return (
    <CRMConfigContext.Provider value={{ stages, fieldDefs, loadingStages, loadingFields, refetchStages, refetchFieldDefs, setStagesOptimistic: setStages }}>
      {children}
    </CRMConfigContext.Provider>
  )
}

export function useCRMConfig() {
  return useContext(CRMConfigContext)
}
