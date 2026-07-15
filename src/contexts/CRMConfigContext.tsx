import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { stagesApi, customFieldsApi, productsApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import type { TenantStage, ContactCustomFieldDef, Product } from '@/types'

interface CRMConfig {
  stages: TenantStage[]
  fieldDefs: ContactCustomFieldDef[]
  products: Product[]
  loadingStages: boolean
  loadingFields: boolean
  loadingProducts: boolean
  refetchStages: () => void
  refetchFieldDefs: () => void
  refetchProducts: () => void
  setStagesOptimistic: (stages: TenantStage[]) => void
}

const CRMConfigContext = createContext<CRMConfig>({
  stages: [],
  fieldDefs: [],
  products: [],
  loadingStages: true,
  loadingFields: true,
  loadingProducts: true,
  refetchStages: () => {},
  setStagesOptimistic: () => {},
  refetchFieldDefs: () => {},
  refetchProducts: () => {},
})

export function CRMConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [stages, setStages] = useState<TenantStage[]>([])
  const [fieldDefs, setFieldDefs] = useState<ContactCustomFieldDef[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingStages, setLoadingStages] = useState(true)
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)

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

  const refetchProducts = useCallback(() => {
    setLoadingProducts(true)
    productsApi.list()
      .then((r) => setProducts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingStages(false)
      setLoadingFields(false)
      setLoadingProducts(false)
      return
    }
    refetchStages()
    refetchFieldDefs()
    refetchProducts()
  }, [isAuthenticated, refetchStages, refetchFieldDefs, refetchProducts])

  return (
    <CRMConfigContext.Provider
      value={{
        stages,
        fieldDefs,
        products,
        loadingStages,
        loadingFields,
        loadingProducts,
        refetchStages,
        refetchFieldDefs,
        refetchProducts,
        setStagesOptimistic: setStages,
      }}
    >
      {children}
    </CRMConfigContext.Provider>
  )
}

export function useCRMConfig() {
  return useContext(CRMConfigContext)
}
