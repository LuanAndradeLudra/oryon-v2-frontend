// D2 (SCRUM-935) — /pipelines/:id com abas Board/Relatórios. O funil ganhou
// uma tela própria (antes vivia dentro de /contacts, atrás de um segmented
// control) para caber os relatórios (D1/934) sem espremer o board.
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { AlertTriangle, ChevronDown, Check, Search, X, Settings2, Plus } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { pipelinesApi } from '@/services/api'
import { getDefaultPipeline, getActivePipelines, getPipelineStages, cn } from '@/lib/utils'
import { pipelineKindOf, pipelineKindOption, pipelineNoun } from '@/lib/pipelineKinds'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'
import { BoardFilterBar } from '@/components/deals/BoardFilterBar'
import { useRegisterTopBarActions, useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { FunnelsConfigDrawer } from '@/components/deals/FunnelsConfigDrawer'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { PipelineBoardTab } from '@/components/deals/PipelineBoardTab'
import { PipelineReportsTab } from '@/components/deals/reports/PipelineReportsTab'
import type { Pipeline } from '@/types'

type Tab = 'board' | 'reports'

export function PipelinePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const semMovimento = useReducedMotion()
  const [seletorAberto, setSeletorAberto] = useState(false)
  /**
   * Criação a partir do CABEÇALHO. Os diálogos vivem na aba do quadro; aqui só
   * mora o gatilho, porque o botão precisa existir com o funil cheio — antes
   * ele só aparecia no estado vazio, e com um negócio já criado o único
   * caminho para criar outro era sair do funil e ir pelo CRM ou pelo chat.
   */
  const [novoNegocioEtapa, setNovoNegocioEtapa] = useState<string | null>(null)
  const [novoContatoAberto, setNovoContatoAberto] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  // `id` da rota, com string vazia como piso: o painel é declarado acima dos
  // early returns e não pode depender do objeto `pipeline`, que só existe
  // depois de carregar a lista.
  const pipelineIdAtual = id ?? ''
  const tab: Tab = searchParams.get('tab') === 'reports' ? 'reports' : 'board'

  /**
   * Busca do quadro — o campo é do CABEÇALHO (ao lado do seletor de funil) e
   * quem consome é a aba do quadro, mas o estado mora na URL, não em memória.
   *
   * Nasceu como `useState` e isso era um vazamento: filtrar por um nome, abrir
   * um card e voltar devolvia o quadro inteiro, sem o filtro — trabalho refeito
   * no meio de um atendimento. Na URL o filtro sobrevive à ida e à volta, ao
   * F5 e ao link colado para um colega.
   *
   * `replace: true` porque digitar não é navegar: sem isso cada tecla viraria
   * uma entrada de histórico e o "voltar" do navegador apagaria a busca letra
   * por letra em vez de sair da tela.
   */
  const busca = searchParams.get('q') ?? ''

  /** Painel de configuração — aberto/fechado e funil escolhido, tudo na URL. */
  const configAberto = searchParams.get('config') === 'funis'
  const abrirConfig = (aberto: boolean) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (aberto) {
        params.set('config', 'funis')
        params.set('pipeline', pipelineIdAtual)
      } else {
        params.delete('config')
        params.delete('pipeline')
      }
      return params
    }, { replace: true })
  }
  const setBusca = (valor: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (valor) params.set('q', valor)
      else params.delete('q')
      return params
    }, { replace: true })
  }

  /**
   * `?deal=<id>` — chegou de outra tela pedindo "mostre onde ele está".
   *
   * Quem manda é o painel do contato na conversa: a ficha responde "o que é
   * este negócio", e o quadro responde "onde ele está no funil". Abrir a ficha
   * POR CIMA do quadro dá as duas de uma vez.
   *
   * O parâmetro é consumido uma única vez e some da URL: sem isso, recarregar
   * ou voltar no histórico reabriria a ficha que o operador já fechou.
   */
  const { openDeal } = useDealPanel()
  const dealParam = searchParams.get('deal')
  useEffect(() => {
    if (!dealParam) return
    openDeal(dealParam)
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.delete('deal')
      return params
    }, { replace: true })
  }, [dealParam, openDeal, setSearchParams])

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchPipelines = useCallback(() => {
    setLoading(true)
    setError(false)
    return pipelinesApi.list()
      .then((res) => setPipelines(res.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void fetchPipelines() }, [fetchPipelines])

  const setTab = (next: Tab) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === 'board') params.delete('tab')
      else params.set('tab', next)
      return params
    }, { replace: true })
  }

  /**
   * R2-1E-BAR-05 (mock 1e): a TopBar carrega "Funis / [seletor do funil]" e o
   * "Novo negócio" primary à direita; o que sobra da página é UMA barra só
   * (visão + busca + filtros + resumo + Etapas). Antes eram duas barras
   * empilhadas — o cabeçalho da página (Voltar, seletor, busca, Novo, abas,
   * engrenagem) e a barra de filtros.
   *
   * No mobile a TopBar não existe (há o MobilePageHeader), então seletor e
   * "Novo negócio" descem para dentro da barra — nada some.
   */
  const pipelineAtual = pipelines.find((p) => p.id === id)
  const pipelineValido = pipelineAtual && !pipelineAtual.isArchived ? pipelineAtual : null
  const ativos = getActivePipelines(pipelines)
  const noTopo = !isMobile
  const etapaInicial = pipelineValido ? getPipelineStages(pipelines, pipelineValido.id)[0] ?? null : null
  const processoAtual = pipelineValido ? pipelineKindOf(pipelineValido) === 'process' : false
  const substantivo = pipelineValido ? pipelineNoun(pipelineValido) : 'negócio'
  const KindIconAtual = pipelineValido ? pipelineKindOption(pipelineKindOf(pipelineValido)).icon : null
  const rotuloTipo = pipelineValido ? pipelineKindOption(pipelineKindOf(pipelineValido)).label : ''

  const seletor = pipelineValido ? (
    ativos.length > 1 ? (
      <Dropdown
        open={seletorAberto}
        onClose={() => setSeletorAberto(false)}
        align="left"
        className="w-60"
        anchor={
          <button
            type="button"
            onClick={() => setSeletorAberto((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={seletorAberto}
            aria-label={`Trocar de funil — atual: ${pipelineValido.name}`}
            data-testid="pipeline-switcher"
            className="inline-flex items-center gap-2 h-7 pl-2 pr-1.5 rounded-sm text-xs font-semibold bg-surface-800 border border-[var(--bd2)] text-surface-100 hover:border-surface-500 transition-colors"
          >
            <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: pipelineValido.color }} />
            <span className="truncate max-w-[10rem]">{pipelineValido.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
          </button>
        }
      >
        <div className="px-1 py-1 flex flex-col gap-0.5">
          {ativos.map((p) => {
            const atual = p.id === pipelineValido.id
            return (
              <DropdownItem
                key={p.id}
                onClick={() => {
                  setSeletorAberto(false)
                  if (!atual) navigate(`/pipelines/${p.id}${tab === 'reports' ? '?tab=reports' : ''}`)
                }}
              >
                <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                {atual && <Check className="w-3.5 h-3.5 flex-shrink-0 text-surface-400" />}
              </DropdownItem>
            )
          })}
        </div>
      </Dropdown>
    ) : (
      <span className="inline-flex items-center gap-2 h-7 px-2 text-xs font-semibold text-surface-100">
        <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: pipelineValido.color }} />
        {pipelineValido.name}
      </span>
    )
  ) : null

  const seletorComTipo = seletor ? (
    <span className="inline-flex items-center gap-2">
      {seletor}
      {/* O ícone sozinho não ensina qual é qual: a legenda diferencia venda de processo de relance. */}
      <span
        className="inline-flex items-center gap-1 flex-shrink-0 rounded-[5px] border border-surface-700 bg-surface-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-surface-400"
        data-testid="pipeline-kind-badge"
      >
        {KindIconAtual && <KindIconAtual className="w-3 h-3" aria-hidden />}
        {rotuloTipo}
      </span>
    </span>
  ) : null

  const novoNegocioBtn = tab === 'board' && pipelineValido && (etapaInicial || processoAtual) ? (
    <Button
      size="sm"
      variant="primary"
      leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2} />}
      data-testid="pipeline-new-deal"
      onClick={() => {
        if (processoAtual) setNovoContatoAberto(true)
        else if (etapaInicial) setNovoNegocioEtapa(etapaInicial.id)
      }}
    >
      {processoAtual ? 'Adicionar contato' : `Novo ${substantivo}`}
    </Button>
  ) : null

  useRegisterTopBarSubtitle(noTopo ? seletorComTipo : null, [
    noTopo, pipelineValido?.id, pipelineValido?.name, pipelineValido?.color, ativos.length, seletorAberto, tab,
  ])
  useRegisterTopBarActions(noTopo ? novoNegocioBtn : null, [
    noTopo, tab, pipelineValido?.id, etapaInicial?.id, processoAtual, substantivo,
  ])

  if (!id) return <Navigate to="/home" replace />

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Não foi possível carregar os funis.</p>
        <button onClick={fetchPipelines} className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2">
          Tentar novamente
        </button>
      </div>
    )
  }

  const pipeline = pipelines.find((p) => p.id === id)

  // Id inválido/arquivado (link antigo, funil excluído desde então) — cai
  // pro funil padrão do tenant, mesmo fallback que o antigo /contacts?pipeline=
  // já fazia. Sem nenhum funil disponível, não há pra onde cair: volta pra Home.
  if (!pipeline || pipeline.isArchived) {
    const fallback = getDefaultPipeline(pipelines)
    if (fallback) return <Navigate to={`/pipelines/${fallback.id}${tab === 'reports' ? '?tab=reports' : ''}`} replace />
    return <Navigate to="/home" replace />
  }

  // Início da barra: [seletor no mobile] · visão (Quadro | Relatórios — as visões
  // que existem; substitui o Kanban/Lista/Previsão do mock) · busca do quadro.
  const toolbarLead = (
    <>
      {isMobile && seletorComTipo}
      <div className="inline-flex items-center gap-0.5 h-7 p-0.5 rounded-sm border border-[var(--bd2)] bg-surface-800 flex-shrink-0" role="group" aria-label="Visão do funil">
        {([['board', 'Quadro'], ['reports', 'Relatórios']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              'h-6 px-2.5 rounded-[5px] text-xs font-semibold transition-colors',
              tab === key ? 'bg-surface-700 text-surface-100' : 'text-surface-400 hover:text-surface-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Busca — casa nome, telefone, e-mail e empresa do CONTATO do negócio
          (deals.service.ts); só no QUADRO: a aba de relatórios agrega por
          etapa e período, e um campo que some ao trocar de aba é mais honesto
          do que um que fica visível sem fazer nada. */}
      {tab === 'board' && (
        <div className="relative w-56 flex-shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar contato..."
            title="Busca pelo contato do negócio — nome, telefone, e-mail ou empresa"
            aria-label="Buscar negócio pelo contato"
            data-testid="board-search"
            className="w-full h-7 pl-8 pr-7 rounded-sm text-xs bg-surface-800 border border-[var(--bd2)] text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-all [&::-webkit-search-cancel-button]:appearance-none"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </>
  )

  // Fim da barra: [Novo negócio no mobile] · Etapas (configuração em PAINEL — a
  // necessidade nasce olhando o quadro; `?config=funis` na URL sobrevive ao F5
  // e ao voltar do navegador).
  const toolbarTrail = (
    <>
      {isMobile && novoNegocioBtn}
      <button
        type="button"
        onClick={() => abrirConfig(true)}
        title={`Configurar etapas, motivos e acesso de "${pipeline.name}"`}
        aria-label={`Configurar o funil ${pipeline.name}`}
        data-testid="pipeline-settings-link"
        className="inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-sm text-xs font-semibold text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors flex-shrink-0"
      >
        <Settings2 className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Etapas</span>
      </button>
    </>
  )

  return (
    /* `flex-1 min-w-0`: o `#main-content` do AppShell é um flex ROW, então a
       página é um item dele — sem `flex-1` ela encolhe até o conteúdo em vez de
       ocupar a linha, e sobra faixa vazia à direita. O tamanho dessa faixa
       variava com a aba (o quadro é largo, os relatórios não), o que denunciava
       a causa: quem mandava na largura era o conteúdo, não a tela. `min-w-0`
       vem junto porque o item precisa poder encolher abaixo do conteúdo — sem
       ele, o quadro empurra a página e quem rola é a tela inteira, não o
       `overflow-x-auto` das colunas. */
    <div className="flex-1 min-w-0 flex flex-col h-full bg-surface-950">
      {isMobile && <MobilePageHeader title={pipeline.name} />}
      <h1 className="sr-only">{pipeline.name}</h1>
      {/* Trocar de funil é uma TROCA DE ASSUNTO, não um recarregamento: sai um
          quadro inteiro e entra outro, com outras etapas, outras cores e outros
          números. Sem transição os dois estados se sobrepunham num quadro só, e
          a leitura ficava por conta do usuário ("isto que estou vendo já é o
          novo funil?"). A saída rápida e a entrada um pouco mais lenta dão a
          ordem: o antigo some primeiro, o novo chega depois.

          A chave é só `pipeline.id` — trocar de ABA não anima. Quadro e
          relatórios são duas leituras do MESMO funil, e piscar entre elas
          sugeriria uma troca de contexto que não houve.

          Os dois lados se SOBREPÕEM (`absolute inset-0`) em vez de esperar a
          vez. Com `mode="wait"` o quadro novo só montava depois da saída do
          antigo, e só então começava a buscar os negócios — o esqueleto de
          carregamento aparecia sozinho no vazio, e os tempos se somavam. Agora
          o novo monta junto: a busca corre POR BAIXO do quadro que ainda está
          saindo, e quando ele termina de esvanecer o que aparece já são os
          cards. Uma passagem só, sem degrau no meio.

          Sem deslocamento também: numa sobreposição, mover é ruído — os dois
          quadros deslizariam um sobre o outro. Opacidade pura é o que lê como
          uma coisa virando outra. O que sai perde o clique (`pointerEvents`)
          para não interceptar o que já é do novo funil. */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <AnimatePresence initial={false}>
          <motion.div
            key={pipeline.id}
            className="absolute inset-0 flex flex-col"
            initial={semMovimento ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={semMovimento ? { opacity: 0 } : { opacity: 0, pointerEvents: "none" }}
            transition={{ duration: semMovimento ? 0 : 0.26, ease: "easeOut" }}
          >
            {tab === 'board' ? (
              <PipelineBoardTab
                pipeline={pipeline}
                pipelines={pipelines}
                onDealsChanged={fetchPipelines}
                search={busca}
                novoNegocioEtapaId={novoNegocioEtapa}
                onNovoNegocioEtapa={setNovoNegocioEtapa}
                novoContatoAberto={novoContatoAberto}
                onNovoContato={setNovoContatoAberto}
                toolbarLead={toolbarLead}
                toolbarTrail={toolbarTrail}
              />
            ) : (
              <>
                <BoardFilterBar lead={toolbarLead} trail={toolbarTrail} />
                <PipelineReportsTab pipeline={pipeline} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <FunnelsConfigDrawer open={configAberto} onClose={() => abrirConfig(false)} />
    </div>
  )
}
