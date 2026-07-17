import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { stagesApi, customFieldsApi, productsApi, pipelinesApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import type { TenantStage, ContactCustomFieldDef, Product, Pipeline } from '@/types'

interface CRMConfig {
  stages: TenantStage[]
  fieldDefs: ContactCustomFieldDef[]
  products: Product[]
  /** Funis de negócio do tenant (nome/cor/estágios) — cache compartilhado
   *  (SCRUM-293). Vários componentes de conversa/contato (ConversationDealIndicator,
   *  ContactPanelDeals, DealsTab) só precisam do NOME/COR pra rótulo, não da
   *  contagem de negócios abertos por funil (essa é responsabilidade só do
   *  `fetchPipelines` local de ContactsPage, que atualiza a cada `deal:changed`)
   *  — por isso este cache NÃO reage a `deal:changed`, só a `refetchPipelines()`
   *  explícito (chamado pelas telas que de fato criam/editam/arquivam funis). */
  pipelines: Pipeline[]
  loadingStages: boolean
  loadingFields: boolean
  loadingProducts: boolean
  loadingPipelines: boolean
  refetchStages: () => void
  refetchFieldDefs: () => void
  refetchProducts: () => void
  refetchPipelines: () => void
  setStagesOptimistic: (stages: TenantStage[]) => void
}

const CRMConfigContext = createContext<CRMConfig>({
  stages: [],
  fieldDefs: [],
  products: [],
  pipelines: [],
  loadingStages: true,
  loadingFields: true,
  loadingProducts: true,
  loadingPipelines: true,
  refetchStages: () => {},
  setStagesOptimistic: () => {},
  refetchFieldDefs: () => {},
  refetchProducts: () => {},
  refetchPipelines: () => {},
})

export function CRMConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [stages, setStages] = useState<TenantStage[]>([])
  const [fieldDefs, setFieldDefs] = useState<ContactCustomFieldDef[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loadingStages, setLoadingStages] = useState(true)
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingPipelines, setLoadingPipelines] = useState(true)

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

  const refetchPipelines = useCallback(() => {
    setLoadingPipelines(true)
    pipelinesApi.list()
      .then((r) => setPipelines(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPipelines([]))
      .finally(() => setLoadingPipelines(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingStages(false)
      setLoadingFields(false)
      setLoadingProducts(false)
      setLoadingPipelines(false)
      return
    }
    refetchStages()
    refetchFieldDefs()
    refetchProducts()
    refetchPipelines()
  }, [isAuthenticated, refetchStages, refetchFieldDefs, refetchProducts, refetchPipelines])

  return (
    <CRMConfigContext.Provider
      value={{
        stages,
        fieldDefs,
        products,
        pipelines,
        loadingStages,
        loadingFields,
        loadingProducts,
        loadingPipelines,
        refetchStages,
        refetchFieldDefs,
        refetchProducts,
        refetchPipelines,
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
