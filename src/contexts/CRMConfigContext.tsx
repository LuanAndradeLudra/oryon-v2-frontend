import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { stagesApi, customFieldsApi, productsApi, practitionersApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import type { TenantStage, ContactCustomFieldDef, Product, Practitioner } from '@/types'

interface CRMConfig {
  stages: TenantStage[]
  fieldDefs: ContactCustomFieldDef[]
  products: Product[]
  practitioners: Practitioner[]
  loadingStages: boolean
  loadingFields: boolean
  loadingProducts: boolean
  loadingPractitioners: boolean
  refetchStages: () => void
  refetchFieldDefs: () => void
  refetchProducts: () => void
  refetchPractitioners: () => void
  setStagesOptimistic: (stages: TenantStage[]) => void
}

const CRMConfigContext = createContext<CRMConfig>({
  stages: [],
  fieldDefs: [],
  products: [],
  practitioners: [],
  loadingStages: true,
  loadingFields: true,
  loadingProducts: true,
  loadingPractitioners: true,
  refetchStages: () => {},
  setStagesOptimistic: () => {},
  refetchFieldDefs: () => {},
  refetchProducts: () => {},
  refetchPractitioners: () => {},
})

export function CRMConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [stages, setStages] = useState<TenantStage[]>([])
  const [fieldDefs, setFieldDefs] = useState<ContactCustomFieldDef[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [loadingStages, setLoadingStages] = useState(true)
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingPractitioners, setLoadingPractitioners] = useState(true)

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

  const refetchPractitioners = useCallback(() => {
    setLoadingPractitioners(true)
    practitionersApi.list()
      .then((r) => setPractitioners(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPractitioners([]))
      .finally(() => setLoadingPractitioners(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingStages(false)
      setLoadingFields(false)
      setLoadingProducts(false)
      setLoadingPractitioners(false)
      return
    }
    refetchStages()
    refetchFieldDefs()
    refetchProducts()
    refetchPractitioners()
  }, [isAuthenticated, refetchStages, refetchFieldDefs, refetchProducts, refetchPractitioners])

  return (
    <CRMConfigContext.Provider
      value={{
        stages,
        fieldDefs,
        products,
        practitioners,
        loadingStages,
        loadingFields,
        loadingProducts,
        loadingPractitioners,
        refetchStages,
        refetchFieldDefs,
        refetchProducts,
        refetchPractitioners,
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
