// D2 (SCRUM-935) — destino da entrada "Funis" da navegação: ela não sabe de
// antemão qual funil abrir, então este redirector busca a lista e cai no
// funil padrão do tenant. Mantém a entrada de nav estática (1 clique) sem
// precisar pré-carregar pipelines no NavSidebar/BottomTabBar/MorePage.
//
// PO 02/10: sem nenhum funil, a página NÃO redireciona mais para Contatos —
// mostra o estado vazio com "Criar funil" ali mesmo (admin) ou a orientação
// de pedir a um administrador (demais papéis).
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Milestone, Plus } from 'lucide-react'
import { pipelinesApi } from '@/services/api'
import { getApiErrorMessage, getDefaultPipeline } from '@/lib/utils'
import type { Pipeline } from '@/types'
import { NavegarSePresente } from '@/components/navegacao/NavegarSePresente'
import { Button } from '@/components/ui/Button'
import { CreatePipelineModal, type CreatePipelineData } from '@/components/deals/CreatePipelineModal'
import { useAuth } from '@/contexts/AuthContext'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useToast } from '@/hooks/useToast'
import { isAdminTier } from '@/lib/roleHelpers'

export function PipelinesIndexPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refetchPipelines } = useCRMConfig()
  const { toast } = useToast()
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null)
  const [error, setError] = useState(false)
  const [criando, setCriando] = useState(false)

  const carregar = useCallback(() => {
    let alive = true
    setError(false)
    setPipelines(null)
    pipelinesApi.list()
      .then((res) => { if (alive) setPipelines(res.data ?? []) })
      .catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [])

  useEffect(() => carregar(), [carregar])

  const criar = async (data: CreatePipelineData) => {
    let criado: Pipeline
    try {
      criado = (await pipelinesApi.create({ name: data.name, color: data.color, kind: data.kind, stages: data.stages })).data
    } catch (e: unknown) {
      throw new Error(getApiErrorMessage(e, 'Erro ao criar funil.'))
    }
    refetchPipelines()
    toast('Funil criado. Adicione o primeiro contato para começar.', 'success')
    navigate(`/pipelines/${criado.id}${location.search}`, { replace: true })
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Não foi possível carregar os funis.</p>
        <Button size="sm" variant="neutral" onClick={carregar}>Tentar de novo</Button>
      </div>
    )
  }

  if (pipelines === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const target = getDefaultPipeline(pipelines)
  if (target) {
    // Leva a query junto (?deal=, voltarPara…) — antes ela se perdia aqui.
    return <NavegarSePresente to={`/pipelines/${target.id}${location.search}`} replace />
  }

  const podeCriar = isAdminTier(user?.role)
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md text-center flex flex-col items-center gap-3">
        <span className="w-11 h-11 rounded-lg flex items-center justify-center bg-[linear-gradient(135deg,#0F766E_0%,#134E4A_100%)] text-white">
          <Milestone className="w-5 h-5" />
        </span>
        <h1 className="text-lg font-display font-bold text-surface-50">Nenhum funil ainda</h1>
        <p className="text-sm text-surface-400 leading-relaxed">
          O funil organiza os negócios por etapa — do primeiro contato ao fechamento — e mostra
          quanto está em aberto em cada uma.
          {podeCriar
            ? ' Crie o primeiro escolhendo um modelo de etapas; dá para ajustar depois.'
            : ' Peça a um administrador da empresa para criar o primeiro funil.'}
        </p>
        {podeCriar && (
          <Button size="md" variant="primary" leftIcon={<Plus className="w-4 h-4" strokeWidth={2.2} />} onClick={() => setCriando(true)} className="mt-1">
            Criar funil
          </Button>
        )}
      </div>
      <CreatePipelineModal open={criando} onClose={() => setCriando(false)} onSave={criar} tenantId={user?.tenantId} />
    </div>
  )
}
