// D2 (SCRUM-935) — /pipelines/:id com abas Board/Relatórios. O funil ganhou
// uma tela própria (antes vivia dentro de /contacts, atrás de um segmented
// control) para caber os relatórios (D1/934) sem espremer o board.
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, LayoutGrid, BarChart3, ChevronDown, Check, Search, X, Settings2, Plus } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { pipelinesApi } from '@/services/api'
import { getDefaultPipeline, getActivePipelines, getPipelineStages, cn } from '@/lib/utils'
import { pipelineKindOf, pipelineKindOption, pipelineNoun } from '@/lib/pipelineKinds'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
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

  const kindOption = pipelineKindOption(pipelineKindOf(pipeline))
  const isProcess = pipelineKindOf(pipeline) === 'process'
  const noun = pipelineNoun(pipeline)
  // Primeira etapa NÃO-terminal: criar direto num terminal é 400 no backend
  // (fechar exige motivo), então é dela que o negócio parte — a mesma regra do
  // estado vazio do quadro.
  const etapaDePartida = getPipelineStages(pipelines, pipeline.id)[0] ?? null
  const KindIcon = kindOption.icon

  const header = (
    /* O cabeçalho e a faixa de contexto logo abaixo formam a barra do funil, e
       ela usa o token `board-bar` — não um degrau da escala. No CLARO a barra
       sobe: branca sobre o chão cinza, que é o que separa o que informa do que
       é conteúdo. No ESCURO não há o que subir — o chão já é o mais escuro que
       existe, e elevar faria a barra destoar da TopBar logo acima; lá o token é
       o próprio chão e quem separa é a BORDA.

       A borda é `surface-700` (e não a 800 do divisor padrão) porque no claro a
       800 é #FFFFFF, a mesma cor da barra — a linha sumiria. */
    <div className="flex items-center gap-2 px-4 py-2.5 bg-board-bar border-b border-surface-700 flex-shrink-0 flex-wrap">
      {!isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-surface-100 transition-colors mr-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>
      )}
      {/* A IDENTIDADE do funil (cor, nome, tipo) atravessa a mesma troca que o
          conteúdo, então acompanha o mesmo gesto — só que em opacidade pura: um
          deslocamento aqui empurraria os controles ao lado. Sem
          `AnimatePresence`: a chave remonta o bloco e o novo entra em fade, sem
          esperar o antigo sair, para o cabeçalho nunca ficar vazio. */}
      <motion.div
        key={pipeline.id}
        className="flex items-center gap-2 min-w-0"
        initial={semMovimento ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: semMovimento ? 0 : 0.22, ease: 'easeOut' }}
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />
        <h1 className="text-sm font-semibold text-surface-100 truncate">{pipeline.name}</h1>
        {/* O ícone sozinho não ensina qual é qual — alvo e ciclo só dizem algo a
            quem já sabe. A legenda é o que diferencia venda de processo de
            relance; a COR fica por conta do funil (ponto ao lado e gradiente do
            fundo), para os dois eixos não brigarem pelo mesmo recurso. */}
        <span
          className="inline-flex items-center gap-1 flex-shrink-0 rounded-md border border-surface-700 bg-surface-900 px-1.5 py-0.5 text-3xs uppercase tracking-wide text-surface-400"
          data-testid="pipeline-kind-badge"
        >
          <KindIcon className="w-3 h-3" aria-hidden />
          {kindOption.label}
        </span>
      </motion.div>

      {/* Trocar de funil rápido — só quando há mais de um.

          Era um `<select>` nativo, e o problema não era só estético: a LISTA de
          um select é desenhada pelo sistema operacional, fora do alcance dos
          nossos tokens. No tema escuro abria um menu branco do Windows por cima
          da tela inteira escura, e o funil — que em todo o resto do produto se
          apresenta com o ponto colorido dele — virava texto pelado.

          Passa a usar o `Dropdown` do design system, o mesmo do menu de etapas
          e do "adicionar ao funil": cada funil com a cor dele, o atual marcado.
          O gatilho fala a língua dos outros controles do cabeçalho (mesma
          altura, mesma superfície, mesma borda) e mostra o funil corrente em
          vez de um rótulo genérico. */}
      {getActivePipelines(pipelines).length > 1 && (
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
              aria-label={`Trocar de funil — atual: ${pipeline.name}`}
              data-testid="pipeline-switcher"
              className="inline-flex items-center gap-2 h-7 pl-2 pr-1.5 rounded-lg text-xs font-medium bg-surface-900 border border-surface-700 text-surface-200 hover:border-surface-600 hover:text-surface-100 transition-colors"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />
              <span className="truncate max-w-[10rem]">{pipeline.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
            </button>
          }
        >
          <div className="px-1 py-1 flex flex-col gap-0.5">
            {getActivePipelines(pipelines).map((p) => {
              const atual = p.id === pipeline.id
              return (
                <DropdownItem
                  key={p.id}
                  onClick={() => {
                    setSeletorAberto(false)
                    if (!atual) navigate(`/pipelines/${p.id}${tab === 'reports' ? '?tab=reports' : ''}`)
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="flex-1 min-w-0 truncate">{p.name}</span>
                  {/* Só o ✓ marca o atual — sem `active`, que pintaria o item
                      inteiro de teal. A cor no menu é do FUNIL (o ponto), e um
                      segundo uso dela para dizer "selecionado" competiria com
                      isso. */}
                  {atual && <Check className="w-3.5 h-3.5 flex-shrink-0 text-surface-400" />}
                </DropdownItem>
              )
            })}
          </div>
        </Dropdown>
      )}

      {/* Busca — a mesma da tela de Contatos (lupa à esquerda, limpar à
          direita), reduzida à altura desta barra para conviver com o seletor e
          as abas. Superfície `surface-900` e não `surface-800` como lá: aqui a
          barra JÁ é branca no tema claro, e a 800 é branca também — o campo
          desapareceria dentro dela.

          Só no QUADRO: a aba de relatórios agrega por etapa e período, e um
          campo que some ao trocar de aba é mais honesto do que um que fica
          visível sem fazer nada.

          O texto do placeholder é mais curto que o de Contatos de propósito —
          lá a busca também casa etiqueta; aqui o backend casa nome, telefone,
          e-mail e empresa do CONTATO do negócio (deals.service.ts), e prometer
          etiqueta seria mentira. O `title` diz os quatro campos por extenso. */}
      {tab === 'board' && (
        <div className="relative w-56 md:w-72 lg:w-96 flex-shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar contato..."
            title="Busca pelo contato do negócio — nome, telefone, e-mail ou empresa"
            aria-label="Buscar negócio pelo contato"
            data-testid="board-search"
            className="w-full h-7 pl-8 pr-7 rounded-lg text-xs bg-surface-900 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all [&::-webkit-search-cancel-button]:appearance-none"
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

      <div className="flex-1" />

      {/* "Novo negócio" — o MESMO gesto que o estado vazio já oferecia, agora
          permanente. Ele desaparecia assim que o funil ganhava o primeiro card,
          e a partir daí criar outro exigia sair da tela (CRM ou chat) e voltar.

          Em funil de PROCESSO o verbo é outro, como no estado vazio: não se cria
          negócio ali, adiciona-se um contato ao funil. Mesma decisão, mesma
          origem (`isProcess`), para as duas superfícies não divergirem.

          Só na aba do quadro: os diálogos moram nela, e um botão que não pode
          abrir nada é pior que botão nenhum. */}
      {tab === 'board' && (etapaDePartida || isProcess) && (
        <button
          type="button"
          onClick={() => {
            if (isProcess) setNovoContatoAberto(true)
            else if (etapaDePartida) setNovoNegocioEtapa(etapaDePartida.id)
          }}
          data-testid="pipeline-new-deal"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium bg-surface-100 text-surface-950 hover:bg-surface-50 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {isProcess ? 'Adicionar contato' : `Novo ${noun}`}
        </button>
      )}

      <div className="flex items-center gap-1 bg-surface-900 border border-surface-700 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setTab('board')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            tab === 'board' ? 'bg-surface-700 text-surface-100 shadow-sm' : 'text-surface-400 hover:text-surface-200',
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Quadro
        </button>
        <button
          type="button"
          onClick={() => setTab('reports')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            tab === 'reports' ? 'bg-surface-700 text-surface-100 shadow-sm' : 'text-surface-400 hover:text-surface-200',
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Relatórios
        </button>
      </div>

      {/* Configuração do funil em PAINEL, não em outra tela.

          A necessidade nasce olhando o quadro ("falta uma etapa entre Proposta
          e Fechamento"), e sair daqui custa o contexto todo: aba, busca,
          rolagem, o card que se estava lendo. O painel resolve ao lado e
          devolve o quadro intacto.

          `?config=funis` na URL, e não em `useState`: o painel sobrevive ao F5
          e ao voltar do navegador, e o link pode ser passado para um colega
          já aberto. `?pipeline=` acompanha para o painel abrir NESTE funil —
          é o mesmo parâmetro que a tela de Configurações lê. */}
      <button
        type="button"
        onClick={() => abrirConfig(true)}
        title={`Configurar etapas, motivos e acesso de "${pipeline.name}"`}
        aria-label={`Configurar o funil ${pipeline.name}`}
        data-testid="pipeline-settings-link"
        className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-900 transition-colors"
      >
        <Settings2 className="w-4 h-4" />
      </button>
    </div>
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
      {header}
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
              />
            ) : (
              <PipelineReportsTab pipeline={pipeline} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <FunnelsConfigDrawer open={configAberto} onClose={() => abrirConfig(false)} />
    </div>
  )
}
