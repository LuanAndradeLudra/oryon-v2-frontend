import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getAgent, type AgentConfig, type AgentConfigWithTools } from '@/services/agentsApi'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { BancadaDeTeste } from './bancada/BancadaDeTeste'
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
import { SECOES, rotaDoAgente, type SecaoId } from './secoesDoAgente'
import { SeletorDeSecaoMovel } from './SeletorDeSecaoMovel'
import './agenteMovel.css'

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
  // A partir de 1280 px a bancada divide a tela; abaixo, abre por cima.
  const bancadaAcoplada = useMediaQuery('(min-width: 1280px)')
  const navigate = useNavigate()
  // Celular: trocar de seção volta ao topo do rolo (a barra de seção fica presa).
  const rolo = useRef<HTMLDivElement>(null)
  useEffect(() => { rolo.current?.scrollTo?.({ top: 0 }) }, [secao])

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

  // No celular a bancada ocupa a tela: abrir EMPILHA uma entrada no histórico
  // para que o voltar do aparelho feche o teste em vez de sair da página.
  // No desktop ela é uma coluna ao lado e troca a URL no lugar.
  const empilhou = useRef(false)
  const alternarTeste = useCallback(() => {
    const aberto = searchParams.get('teste') === '1'
    if (aberto && empilhou.current) {
      empilhou.current = false
      navigate(-1)
      return
    }
    empilhou.current = !aberto && isMobile
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (aberto) next.delete('teste')
      else next.set('teste', '1')
      return next
    }, { replace: !empilhou.current })
  }, [searchParams, setSearchParams, isMobile, navigate])

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

  if (!agent) return <EsqueletoDaPagina movel={isMobile} />

  const testado = testadoNaSessao || (agent.test_count ?? 0) > 0

  // CELULAR: um rolo só — o cabeçalho e a barra de seção ficam presos; a faixa
  // de identidade rola junto com o conteúdo para não roubar altura da tela.
  // A bancada de teste abre em tela cheia.
  if (isMobile) {
    return (
      <SalvamentoDoAgenteProvider ultimaAlteracao={agent.updated_at}>
        <div ref={rolo} className="pagina-agente min-w-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <CabecalhoDoAgente
            agent={agent}
            onAtualizar={onAtualizar}
            testado={testado}
            testeAberto={testeAberto}
            onAlternarTeste={alternarTeste}
            movel
          />
          <SeletorDeSecaoMovel agentId={agent.id} ativa={secao} resumo={resumo} testeAberto={testeAberto} />
          <main aria-labelledby="titulo-secao">
            <ConteudoDaSecao
              secao={secao}
              agent={agent}
              onAtualizar={onAtualizar}
              onFerramentas={onFerramentas}
              onFontesMudaram={recarregarResumo}
              movel
            />
          </main>
        </div>
        {testeAberto && (
          <BancadaDeTeste agent={agent} onTestou={() => setTestadoNaSessao(true)} onFechar={alternarTeste} movel />
        )}
      </SalvamentoDoAgenteProvider>
    )
  }

  return (
    <SalvamentoDoAgenteProvider ultimaAlteracao={agent.updated_at}>
      <div className="pagina-agente flex flex-1 flex-col min-h-0 overflow-hidden">
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
          {testeAberto && bancadaAcoplada && (
            <BancadaDeTeste agent={agent} onTestou={() => setTestadoNaSessao(true)} onFechar={alternarTeste} />
          )}
        </div>
      </div>

      {testeAberto && !bancadaAcoplada && (
        <>
          <div className="overlay-scrim z-40" aria-hidden onClick={alternarTeste} />
          <BancadaDeTeste agent={agent} onTestou={() => setTestadoNaSessao(true)} onFechar={alternarTeste} flutuante />
        </>
      )}
    </SalvamentoDoAgenteProvider>
  )
}

function ConteudoDaSecao({
  secao, agent, onAtualizar, onFerramentas, onFontesMudaram, movel = false,
}: {
  secao: SecaoId
  agent: AgentConfigWithTools
  onAtualizar: (a: AgentConfig) => void
  onFerramentas: (t: AgentConfigWithTools['tools']) => void
  onFontesMudaram: () => void
  movel?: boolean
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
        className={movel ? 'w-full px-4 pt-5 pb-8' : 'w-full max-w-[900px] px-8 py-6'}
      >
        {corpo}
        {movel && <AnteriorProxima agentId={agent.id} secao={secao} />}
      </motion.div>
    </AnimatePresence>
  )
}

/** Celular: percorrer as seções em ordem sem abrir o menu. */
function AnteriorProxima({ agentId, secao }: { agentId: string; secao: SecaoId }) {
  const i = SECOES.findIndex((s) => s.id === secao)
  const antes = SECOES[i - 1]
  const depois = SECOES[i + 1]
  const classe = 'flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-md border border-surface-700 bg-[var(--sf2)] px-3 text-sm hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
  return (
    <nav aria-label="Outras seções" className="mt-10 flex gap-2 border-t border-surface-700 pt-5">
      {antes ? (
        <Link to={rotaDoAgente(agentId, antes.id)} replace className={classe}>
          <ChevronLeft className="h-4 w-4 flex-shrink-0 text-surface-500" aria-hidden />
          <span className="min-w-0"><span className="block text-3xs uppercase tracking-[.12em] text-surface-500">Anterior</span><span className="block truncate font-semibold text-surface-100">{antes.rotulo}</span></span>
        </Link>
      ) : <span className="flex-1" />}
      {depois ? (
        <Link to={rotaDoAgente(agentId, depois.id)} replace className={`${classe} justify-end text-right`}>
          <span className="min-w-0"><span className="block text-3xs uppercase tracking-[.12em] text-surface-500">Próxima</span><span className="block truncate font-semibold text-surface-100">{depois.rotulo}</span></span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-surface-500" aria-hidden />
        </Link>
      ) : <span className="flex-1" />}
    </nav>
  )
}

function EsqueletoDaPagina({ movel = false }: { movel?: boolean }) {
  if (movel) {
    return (
      <div className="flex-1 space-y-4 px-4 pt-4" aria-busy="true" aria-label="Carregando agente">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-12 w-full bg-[var(--sf2)]" />
        <SkeletonCard lines={5} />
      </div>
    )
  }
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
