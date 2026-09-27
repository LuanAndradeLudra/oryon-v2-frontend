import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Bot } from 'lucide-react'
import { getAgent, type AgentConfig, type AgentConfigWithTools } from '@/services/agentsApi'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useIsMobile } from '@/hooks/useIsMobile'
import { AgentTestModal } from '@/components/agents/AgentTestModal'
import { SecaoInstrucoes } from './secoes/SecaoInstrucoes'
import { SecaoConhecimento } from './secoes/SecaoConhecimento'
import { SecaoCatalogo } from './secoes/SecaoCatalogo'
import { SecaoCapacidades } from './secoes/SecaoCapacidades'
import { SecaoTransferencia } from './secoes/SecaoTransferencia'
import { SecaoComportamento } from './secoes/SecaoComportamento'
import { SecaoDesempenho } from './secoes/SecaoDesempenho'
import { SecaoAlteracoes } from './secoes/SecaoAlteracoes'
import { SalvamentoDoAgenteProvider } from './SalvamentoDoAgente'
import { CabecalhoDoAgente } from './CabecalhoDoAgente'
import { NavegacaoDoAgente } from './NavegacaoDoAgente'
import { useResumoDoAgente } from './useResumoDoAgente'
import type { SecaoId } from './secoesDoAgente'

/**
 * A PÁGINA DO AGENTE (direção D, 27/09): identidade em cima, navegação vertical
 * em três grupos à esquerda, a seção no centro e — a partir da fase 3 — a
 * bancada de teste à direita. Rota `/agents/:agentId/:secao`.
 */
export function PaginaDoAgente({ agentId, secao }: { agentId: string; secao: SecaoId }) {
  const [agent, setAgent] = useState<AgentConfigWithTools | null>(null)
  const [erro, setErro] = useState(false)
  const [testadoNaSessao, setTestadoNaSessao] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const testeAberto = searchParams.get('teste') === '1'
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  useEffect(() => {
    // A página é remontada por agente (key={agentId}), então o estado inicial
    // já está limpo aqui.
    let vivo = true
    getAgent(agentId)
      .then((a) => { if (vivo) setAgent(a) })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [agentId])

  const onAtualizar = useCallback((a: AgentConfig) => {
    setAgent((prev) => (prev ? { ...prev, ...a } : prev))
  }, [])
  const onFerramentas = useCallback((tools: AgentConfigWithTools['tools']) => {
    setAgent((prev) => (prev ? { ...prev, tools } : prev))
  }, [])

  const { resumo, recarregarResumo } = useResumoDoAgente(agent)

  const alternarTeste = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (next.get('teste') === '1') next.delete('teste')
      else next.set('teste', '1')
      return next
    }, { replace: true })
  }, [setSearchParams])

  if (erro) {
    return (
      <div className="flex-1 px-6 pt-8">
        <EmptyState
          icon={AlertCircle}
          title="Não encontramos este agente"
          hint="Ele pode ter sido excluído, ou o link está incompleto."
          action={{ label: 'Ver todos os agentes', onClick: () => navigate('/agents') }}
          className="max-w-md"
        />
      </div>
    )
  }

  if (!agent) return <EsqueletoDaPagina />

  if (isMobile) {
    return (
      <div className="flex-1 px-4 pt-6">
        <EmptyState
          icon={Bot}
          title={`${agent.name} se configura no computador`}
          hint="Instruções longas, regras e o teste lado a lado não cabem numa tela de celular. A lista de agentes e o interruptor de ligar continuam aqui."
          action={{ label: 'Voltar para a lista', onClick: () => navigate('/agents') }}
        />
      </div>
    )
  }

  const testado = testadoNaSessao || (agent.test_count ?? 0) > 0

  return (
    <SalvamentoDoAgenteProvider ultimaAlteracao={agent.updated_at}>
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <CabecalhoDoAgente
          agent={agent}
          onAtualizar={onAtualizar}
          testado={testado}
          testeAberto={testeAberto}
          onAlternarTeste={alternarTeste}
        />
        <div className="flex flex-1 min-h-0">
          <NavegacaoDoAgente
            agentId={agent.id}
            ativa={secao}
            resumo={resumo}
            testeAberto={testeAberto}
            className="w-[220px] flex-shrink-0 border-r border-surface-700 pt-3 pb-3"
          />
          <main className="flex-1 min-w-0 overflow-y-auto" aria-labelledby="titulo-secao">
            <ConteudoDaSecao
              secao={secao}
              agent={agent}
              onAtualizar={onAtualizar}
              onFerramentas={onFerramentas}
              onFontesMudaram={recarregarResumo}
            />
          </main>
        </div>
      </div>

      <AnimatePresence>
        {testeAberto && (
          <AgentTestModal agent={agent} onClose={alternarTeste} onTested={() => setTestadoNaSessao(true)} />
        )}
      </AnimatePresence>
    </SalvamentoDoAgenteProvider>
  )
}

function ConteudoDaSecao({
  secao, agent, onAtualizar, onFerramentas, onFontesMudaram,
}: {
  secao: SecaoId
  agent: AgentConfigWithTools
  onAtualizar: (a: AgentConfig) => void
  onFerramentas: (t: AgentConfigWithTools['tools']) => void
  onFontesMudaram: () => void
}) {
  const semMovimento = useReducedMotion()

  let corpo: ReactNode
  switch (secao) {
    case 'instrucoes': corpo = <SecaoInstrucoes agent={agent} onAtualizar={onAtualizar} />; break
    case 'conhecimento': corpo = <SecaoConhecimento agent={agent} onMudou={onFontesMudaram} />; break
    case 'catalogo': corpo = <SecaoCatalogo agent={agent} onMudou={onFontesMudaram} />; break
    case 'capacidades': corpo = <SecaoCapacidades agent={agent} onAtualizar={onAtualizar} onFerramentas={onFerramentas} />; break
    case 'transferencia': corpo = <SecaoTransferencia agent={agent} onAtualizar={onAtualizar} />; break
    case 'comportamento': corpo = <SecaoComportamento agent={agent} onAtualizar={onAtualizar} />; break
    case 'desempenho': corpo = <SecaoDesempenho agent={agent} />; break
    case 'alteracoes': corpo = <SecaoAlteracoes agent={agent} />; break
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={secao}
        initial={semMovimento ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={semMovimento ? undefined : { opacity: 0 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        className="w-full max-w-[900px] px-8 py-6"
      >
        {corpo}
      </motion.div>
    </AnimatePresence>
  )
}

function EsqueletoDaPagina() {
  return (
    <div className="flex flex-1 flex-col min-h-0" aria-busy="true" aria-label="Carregando agente">
      <div className="flex items-center gap-3.5 px-6 py-4 border-b border-surface-700">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-3 w-72 bg-[var(--sf2)]" />
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-[220px] border-r border-surface-700 p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7 w-full bg-[var(--sf2)]" />)}
        </div>
        <div className="flex-1 px-8 py-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <SkeletonCard lines={5} />
        </div>
      </div>
    </div>
  )
}
