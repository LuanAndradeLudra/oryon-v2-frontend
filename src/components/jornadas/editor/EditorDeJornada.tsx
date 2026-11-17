import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  Background, BackgroundVariant, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, SelectionMode, useNodesInitialized, useReactFlow,
  type Connection, type Edge, type EdgeChange, type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import '../jornadas.css'
import {
  CalendarClock, ChevronDown, ChevronRight, CloudAlert, FlaskConical, GitCompareArrows, Ghost, History, LoaderCircle, Pause, Play, Rocket, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { passoDoCatalogo, saidasDoNo } from '@/services/jornadas/catalogo'
import { codigoDoRotulo } from '@/services/jornadas/padroes'
import { haSobreposicao, ID_DA_ENTRADA, organizar, type Medida } from '@/services/jornadas/layout'
import { validarDesenho } from '@/services/jornadas/validar'
import type { EstadoDoTeste } from '@/services/jornadas/simulador'
import type { ApoioDoEditor, Catalogo, Jornada, NoDoGrafo, PresencaNoEditor, ResultadosDaJornada, VersaoDaJornada, VersaoPublicada } from '@/services/jornadas/tipos'
import { diferencasDoDesenho, nomeDoNo } from '@/services/jornadas/diff'
import { NoDaEntrada, NoDaNota, NoDoPasso, type NoDaEntradaRF, type NoDaNotaRF, type NoDoPassoRF } from './NosDoCanvas'
import { ConfiguracoesDaJornada, GavetaDoPasso, ListaDeProblemas } from './PainelDoPasso'
import { SeletorDePasso, TIPO_ARRASTADO } from './SeletorDePasso'
import { LigacaoComMais } from './LigacaoComMais'
import { ContextoDoCanvas, type AcoesDoCanvas, type DestinoDoPasso } from './contextoDoCanvas'
import { ControlesDoCanvas } from './ControlesDoCanvas'
import { numerarPassos } from './numeracao'
import { preencherPeloCaminho } from './caminho'
import { corDaSaida } from './categorias'
import { IconeDoPasso, ProvedorDoSistema } from './IconeDoPasso'
import { TIPOS_COM_CELULAR } from './PreviaNoCelular'
import { PainelEncaixado } from './PainelEncaixado'
import { EMPURRAO, EMPURRAO_GRANDE, gravarFerramenta, lerFerramenta, rotuloDaSelecao, type FerramentaDoCanvas } from './ferramentaDoCanvas'
import { gravarCelularAberto, LARGURA_DO_CELULAR, lerCelularAberto, lerLargura } from './paineisEncaixados'
import { DURACAO_DO_DESLIZE_MS, useLayoutSuave } from './useLayoutSuave'
import { resumoDaPorta, resumoDaReentrada, resumoDoNo } from './resumo'
import { frasesDasCondicoes } from './condicoes'
import { TestarJornada } from '../TestarJornada'
import { SimularJornada } from '../SimularJornada'
import { QuemEstaNoPasso } from '../QuemEstaNoPasso'
import { MudarComIa } from '../MudarComIa'
import { PublicarJornada } from '../PublicarJornada'
import { VersoesDaJornada } from '../VersoesDaJornada'
import { PausarJornada } from '../PausarJornada'
import { dataHora, useCarregar } from '../apoio'

/**
 * ORY-60 — o editor no "modo foco": só o essencial à vista.
 *
 * - O canvas ocupa a tela toda abaixo da barra única da página.
 * - Passos entram pelo "+ Adicionar passo", pelo "+" de cada ligação (entra no
 *   meio, já ligado) ou pelo "+" de cada saída livre.
 * - A gaveta do passo só aparece com um passo selecionado (Esc fecha).
 * - As ações (conferência, Testar, Publicar ▾, ⋯) e o estado do salvamento vão
 *   para a barra da página, por portal (`slotAcoes`, `slotEstado`).
 *
 * A fonte da verdade é a `VersaoDaJornada` (o rascunho); os nós e as ligações
 * do React Flow são derivados dela a cada mudança. O rascunho salva sozinho.
 */

interface Props {
  jornada: Jornada
  catalogo: Catalogo
  apoio: ApoioDoEditor
  resultados: ResultadosDaJornada | null
  somenteLeitura: boolean
  onJornadaMudou: (j: Jornada) => void
  /** Onde a página quer as ações do editor (barra única). */
  slotAcoes: HTMLElement | null
  /** Onde a página quer o estado do salvamento (ao lado do nome). */
  slotEstado: HTMLElement | null
  configAberta: boolean
  onConfigAberta: (aberta: boolean) => void
  /** "Abrir em Pessoas" a partir de quem está num passo (P2, 16/11). */
  onAbrirPessoas?: (passo: string) => void
  /**
   * Vendo uma versão publicada antiga no desenho, só leitura (P1, 16/11, como o
   * "View" da HubSpot). O desenho vem em `jornada.draft`; nada se edita nem salva.
   */
  versaoAntiga?: { info: VersaoPublicada; onSair: () => void } | null
  /** "Ver no desenho" na lista de versões. */
  onVerVersao?: (v: VersaoPublicada) => void
  /** O caminho de uma pessoa (vindo de Pessoas), aceso no canvas como no teste (P1, 16/11). */
  caminhoExterno?: { titulo: string; nodeIds: string[]; onFechar: () => void } | null
}

export function EditorDeJornada(props: Props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  )
}

const LIMITE_DO_HISTORICO = 50
/** Fora do componente: o React Flow pede o mesmo objeto a cada render. */
const TIPOS_DE_NO = { passo: NoDoPasso, entrada: NoDaEntrada, nota: NoDaNota }
/** As notas adesivas têm id `nota_…` e posição no mesmo `layout` dos passos. */
const ehNota = (id: string) => id.startsWith('nota_')
const semNotas = <T,>(layout: Record<string, T>) => Object.fromEntries(Object.entries(layout).filter(([id]) => !ehNota(id)))
/** A área de transferência das jornadas: copiar numa e colar noutra (P2, 16/11), no navegador. */
const CHAVE_DA_COPIA = 'oryon.jornadas.copia.v1'
const iniciais = (nome: string) => nome.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
const TIPOS_DE_LIGACAO = { comMais: LigacaoComMais }
const idDaLigacao = (origem: string, saida: string) => `${origem}::${saida}`
/** Tamanho estimado de um cartão ainda não medido (passo novo). */
const TAMANHO_ESTIMADO = { w: 260, h: 110 }
const VAO_Y = 72

function paramsPadrao(type: string, catalogo: Catalogo): Record<string, unknown> {
  const passo = passoDoCatalogo(catalogo, type)
  const params: Record<string, unknown> = {}
  for (const c of passo?.params ?? []) if (c.default !== undefined) params[c.key] = Array.isArray(c.default) ? [...c.default] : c.default && typeof c.default === 'object' ? JSON.parse(JSON.stringify(c.default)) : c.default
  // Listas padronizadas (17/11): o rótulo padrão já vem com o código dele.
  for (const c of passo?.params ?? []) {
    if (c.type === 'standard_choice' && c.list && c.codeKey) params[c.codeKey] = codigoDoRotulo(catalogo[c.list], params[c.key])
  }
  if (type === 'wait_event') params.events = [{ key: 'respondeu', label: 'Respondeu', event: 'message.received' }]
  if (type === 'branch') params.branches = [{ key: 'ramo_1', label: 'Caminho 1', group: { mode: 'all', conditions: [{ field: catalogo.conditionFields[0].key, op: 'eq', value: '' }] } }]
  if (type === 'ai_classify') params.categories = [{ key: 'confirmar', label: 'Quer confirmar' }, { key: 'cancelar', label: 'Quer cancelar' }]
  return params
}

function Editor({ jornada, catalogo, apoio, resultados, somenteLeitura: celular, onJornadaMudou, slotAcoes, slotEstado, configAberta, onConfigAberta, versaoAntiga, onVerVersao, caminhoExterno, onAbrirPessoas }: Props) {
  // `celular`: o layout de só leitura do celular (gaveta em tela cheia). `somenteLeitura`:
  // nada se edita — no celular ou vendo uma versão antiga, que mantém o layout do computador.
  const somenteLeitura = celular || !!versaoAntiga
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()
  const rf = useReactFlow()
  const nosMedidos = useNodesInitialized()
  const areaRef = useRef<HTMLDivElement>(null)
  // No computador, o painel do passo e a lista de passos ficam ENCAIXADOS ao lado do desenho (o canvas
  // encolhe; nada fica escondido embaixo, 16/11). No celular (só leitura), o painel abre em tela cheia.
  const encaixado = !celular
  const [larguraDoPainel, setLarguraDoPainel] = useState(lerLargura)
  const [celularAberto, setCelularAberto] = useState(() => lerCelularAberto(lerLargura()))
  /** Seta (arrastar no fundo escolhe vários) ou mão (arrastar move a vista). */
  const [ferramenta, setFerramentaEstado] = useState<FerramentaDoCanvas>(lerFerramenta)
  const setFerramenta = useCallback((f: FerramentaDoCanvas) => { setFerramentaEstado(f); gravarFerramenta(f) }, [])
  /** A caixa de seleção está sendo desenhada: ela só marca os passos, sem abrir o painel de nenhum. */
  const caixaAtiva = useRef(false)
  /** As setas empurram os escolhidos: um passo do histórico por sequência de toques. */
  const ultimoEmpurrao = useRef(0)
  /** O passo acabou de ser inserido e a câmera já está indo até ele. */
  const centrandoPassoNovo = useRef(false)
  /** Conta cada vez que a pessoa termina de ajustar a largura do painel. */
  const [larguraAjustada, setLarguraAjustada] = useState(0)
  const [versao, setVersao] = useState<VersaoDaJornada>(jornada.draft)
  const [nome, setNome] = useState(jornada.name)
  const [descricao, setDescricao] = useState(jornada.description)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [ligacaoEscolhida, setLigacaoEscolhida] = useState<string | null>(null)
  const [passado, setPassado] = useState<VersaoDaJornada[]>([])
  const [futuro, setFuturo] = useState<VersaoDaJornada[]>([])
  const [salvamento, setSalvamento] = useState<'salvo' | 'pendente' | 'salvando' | 'erro'>('salvo')
  const [teste, setTeste] = useState<EstadoDoTeste | null>(null)
  const [testando, setTestando] = useState(false)
  const [simulando, setSimulando] = useState(false)
  const [publicacao, setPublicacao] = useState<{ acao: 'publicar' | 'retomar'; modo?: 'shadow' | 'active'; nota?: string } | null>(null)
  const [pausando, setPausando] = useState(false)
  const [versoesAbertas, setVersoesAbertas] = useState(false)
  /** "Ver números": pessoas por passo e a fatia de cada caminho, como o "Metrics" da HubSpot. */
  const [mostrarNumeros, setMostrarNumeros] = useState(false)
  const [mapa, setMapa] = useState(false)
  const [menu, setMenu] = useState<'publicar' | null>(null)
  const [enviandoTeste, setEnviandoTeste] = useState(false)
  /** Vários passos escolhidos (Shift + arrastar, ou Ctrl + clique): copiar, apagar, mover juntos (P2, 16/11). */
  const [multiplos, setMultiplos] = useState<string[]>([])
  const selecaoRF = useRef(new Set<string>())
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [exportando, setExportando] = useState(false)
  // Quem mais está com a jornada aberta (presença, P2 16/11): consulta a cada 20 s.
  const [presentes, setPresentes] = useState<PresencaNoEditor[]>([])
  const [seletor, setSeletor] = useState<{ destino: DestinoDoPasso; ponto: { x: number; y: number }; area: DOMRect } | null>(null)
  /** Até o primeiro enquadramento, o desenho fica invisível (sem "pulo" de posição na entrada). */
  const [canvasPronto, setCanvasPronto] = useState(false)
  /** Na entrada, os cartões aparecem de cima para baixo; depois, cada passo novo aparece na hora. */
  const [cascata, setCascata] = useState(true)
  /** A pessoa já mexeu na vista (arrastou, deu zoom ou editou): o editor não reenquadra mais sozinho. */
  const vistaTocada = useRef(false)
  /** Tamanho real de cada cartão (o React Flow mede e avisa; nós controlados guardam aqui). */
  const [medidas, setMedidas] = useState<Record<string, { width: number; height: number }>>({})
  const versaoRef = useRef(versao)
  useEffect(() => { versaoRef.current = versao }, [versao])

  const problemas = useMemo(() => validarDesenho(versao, catalogo, apoio), [versao, catalogo, apoio])

  // O que mudou desde a versão no ar (P1, 16/11): na janela de publicar e, com
  // "Ver no desenho", nos cartões ("Novo" / "Mudou") e numa faixa no topo.
  const { dados: publicada } = useCarregar(
    () => (jornada.publishedVersion && !versaoAntiga ? jornadasApi.versao(jornada.id, jornada.publishedVersion) : Promise.resolve(null)),
    [jornada.id, jornada.publishedVersion, !!versaoAntiga],
  )
  const mudancas = useMemo(() => (publicada ? diferencasDoDesenho(publicada, versao, catalogo) : null), [publicada, versao, catalogo])
  const [verMudancas, setVerMudancas] = useState(false)
  // Comentários dos passos (fora da versão): o número no cartão e na aba (P1, 16/11).
  const { dados: comentarios, recarregar: recarregarComentarios } = useCarregar(
    () => (versaoAntiga ? Promise.resolve([]) : jornadasApi.comentarios(jornada.id)),
    [jornada.id, !!versaoAntiga],
  )
  const comentariosPorPasso = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of comentarios ?? []) if (!c.resolved && c.nodeId) m.set(c.nodeId, (m.get(c.nodeId) ?? 0) + 1)
    return m
  }, [comentarios])
  const contarTipo = (t: 'novo' | 'mudou' | 'saiu') => mudancas?.passos.filter((m) => m.tipo === t).length ?? 0
  // A faixa das mudanças cobre o topo do canvas: se a Entrada estiver colada lá em cima, desce a vista.
  useEffect(() => {
    if (!verMudancas) return
    const { x, y, zoom } = rf.getViewport()
    if (y < 72) rf.setViewport({ x, y: y + 56, zoom }, { duration: 250 })
  }, [verMudancas, rf])
  const mudancaPorNo = useMemo(
    () => new Map(verMudancas && mudancas ? mudancas.passos.filter((m) => m.tipo !== 'saiu').map((m) => [m.nodeId, m.tipo as 'novo' | 'mudou']) : []),
    [verMudancas, mudancas],
  )
  const { exibido: layoutExibido, marcar: deslizarNaProxima } = useLayoutSuave(versao.graph.layout)
  const erros = problemas.filter((p) => p.severity === 'error')
  const avisos = problemas.filter((p) => p.severity === 'warning')
  // O minimapa pinta os passos com problema (P2, 16/11, como a HubSpot).
  const nosComErro = useMemo(() => new Set(problemas.filter((p) => p.severity === 'error' && p.nodeId).map((p) => p.nodeId!)), [problemas])
  const nosComAviso = useMemo(() => new Set(problemas.filter((p) => p.severity === 'warning' && p.nodeId && p.code !== 'ai_cost').map((p) => p.nodeId!)), [problemas])

  // ── histórico (desfazer/refazer) ─────────────────────────────────────────
  /** Várias mudanças seguidas que contam como UM passo do histórico (apagar vários de uma vez). */
  const emLote = useRef(false)
  const aplicar = useCallback((nova: VersaoDaJornada, registrar = true) => {
    if (somenteLeitura) return
    vistaTocada.current = true
    if (registrar && !emLote.current) {
      setPassado((p) => [...p.slice(-LIMITE_DO_HISTORICO + 1), versaoRef.current])
      setFuturo([])
    }
    // A referência muda já: o React Flow manda a remoção do nó e das ligações na
    // mesma rodada, e a segunda mudança precisa ver o desenho sem o nó.
    versaoRef.current = nova
    setVersao(nova)
    setSalvamento('pendente')
  }, [somenteLeitura])

  const desfazer = useCallback(() => {
    setPassado((p) => {
      if (!p.length) return p
      setFuturo((f) => [versaoRef.current, ...f])
      deslizarNaProxima()
      versaoRef.current = p[p.length - 1]
      setVersao(p[p.length - 1])
      setSalvamento('pendente')
      return p.slice(0, -1)
    })
  }, [deslizarNaProxima])
  const refazer = useCallback(() => {
    setFuturo((f) => {
      if (!f.length) return f
      setPassado((p) => [...p, versaoRef.current])
      deslizarNaProxima()
      versaoRef.current = f[0]
      setVersao(f[0])
      setSalvamento('pendente')
      return f.slice(1)
    })
  }, [deslizarNaProxima])

  // Abre a lista de passos. Encaixado, a lista SUBSTITUI o painel do passo escolhido: o passo deixa de estar
  // escolhido e, ao fechar a lista, volta-se ao desenho (antes, o painel dele reaparecia por baixo, 16/11).
  // O "logo abaixo do passo escolhido" (+ do menu e atalho A) vira o destino da lista, para não se perder.
  const selecionadoRef = useRef<string | null>(null)
  useEffect(() => { selecionadoRef.current = selecionado }, [selecionado])
  const abrirLista = useCallback((destino: DestinoDoPasso, ponto: { x: number; y: number }) => {
    const area = areaRef.current?.getBoundingClientRect()
    if (!area) return
    let alvo = destino
    if (encaixado) {
      const sel = selecionadoRef.current
      const no = sel && sel !== ID_DA_ENTRADA ? versaoRef.current.graph.nodes[sel] : undefined
      if (alvo.tipo === 'solto' && sel && no) {
        const livre = saidasDoNo(no, catalogo).find((x) => !no.outputs[x.key])
        if (livre) alvo = { tipo: 'saida', origem: sel, saida: livre.key }
      }
      setSelecionado(null)
    }
    setSeletor({ destino: alvo, ponto, area })
  }, [encaixado, catalogo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      const digitando = !!alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)
      if (e.key === 'Escape' && !digitando && !seletor) { setSelecionado(null); setMultiplos([]); return }
      if (somenteLeitura || digitando) return
      const mod = e.ctrlKey || e.metaKey
      // Ferramenta: V seta (escolher vários), H mão (mover a vista).
      if (!mod && !e.altKey && (e.key === 'v' || e.key === 'V')) { setFerramenta('selecionar'); return }
      if (!mod && !e.altKey && (e.key === 'h' || e.key === 'H')) { setFerramenta('mao'); return }
      // Ctrl+A: escolhe tudo o que está no desenho (passos, a Entrada e as notas).
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        const g = versaoRef.current.graph
        const todos = [ID_DA_ENTRADA, ...Object.keys(g.nodes), ...Object.keys(g.notes ?? {})]
        setSeletor(null)
        setSelecionado(null)
        selecaoRF.current = new Set(todos)
        setMultiplos(todos)
        return
      }
      // Setas: empurram os escolhidos (com Shift, o passo grande). Não valem dentro dos painéis e dos cartões.
      const dentro = alvo && typeof alvo.closest === 'function' ? alvo.closest('aside, [role=dialog], [role=listbox], [role=radiogroup], [role=menu], .react-flow__node') : null
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !mod && !e.altKey && !dentro) {
        const ids = multiplos.length ? multiplos : selecionado ? [selecionado] : []
        if (!ids.length) return
        e.preventDefault()
        const d = e.shiftKey ? EMPURRAO_GRANDE : EMPURRAO
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
        const v = versaoRef.current
        const layout = { ...v.graph.layout }
        for (const id of ids) { const p = layout[id]; if (p) layout[id] = { x: p.x + dx, y: p.y + dy } }
        const agora = Date.now()
        aplicar({ ...v, graph: { ...v.graph, layout } }, agora - ultimoEmpurrao.current > 800)
        ultimoEmpurrao.current = agora
        return
      }
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.altKey && !seletor) {
        const r = areaRef.current?.getBoundingClientRect()
        if (r) { e.preventDefault(); abrirLista({ tipo: 'solto' }, { x: r.left + 24, y: r.top + 56 }) }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) refazer(); else desfazer() }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); refazer() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desfazer, refazer, somenteLeitura, seletor, abrirLista, setFerramenta, multiplos, selecionado, aplicar])

  // ── salvamento automático do rascunho ────────────────────────────────────
  useEffect(() => {
    if (salvamento !== 'pendente') return
    const t = setTimeout(async () => {
      setSalvamento('salvando')
      try {
        const j = await jornadasApi.salvarRascunho(jornada.id, versaoRef.current, { name: nome, description: descricao })
        onJornadaMudou(j)
        setSalvamento((s) => (s === 'salvando' ? 'salvo' : s))
      } catch {
        setSalvamento('erro')
      }
    }, 700)
    return () => clearTimeout(t)
  }, [salvamento, versao, nome, descricao, jornada.id, onJornadaMudou])

  const salvarAgora = async (): Promise<Jornada> => {
    const j = await jornadasApi.salvarRascunho(jornada.id, versaoRef.current, { name: nome, description: descricao })
    setSalvamento('salvo')
    return j
  }

  // ── medidas, enquadramento e organização ─────────────────────────────────
  const medida: Medida = useCallback((id) => {
    const n = rf.getNode(id)
    return n?.measured?.width && n.measured.height ? { w: n.measured.width, h: n.measured.height } : TAMANHO_ESTIMADO
  }, [rf])

  /** Vista inicial: legível (entre 75% e 100%), com a Entrada no alto e o desenho centrado. */
  const enquadrarInicio = useCallback(() => {
    const area = areaRef.current
    if (!area) return
    const { width, height } = area.getBoundingClientRect()
    const nos = rf.getNodes()
    if (!nos.length) return
    const b = rf.getNodesBounds(nos)
    const zoomQueCabe = Math.min((width - 96) / Math.max(b.width, 1), (height - 40) / Math.max(b.height, 1))
    const zoom = Math.max(0.75, Math.min(1, zoomQueCabe))
    rf.setViewport({ x: width / 2 - (b.x + b.width / 2) * zoom, y: (versaoAntiga ? 76 : 20) - b.y * zoom, zoom })
  }, [rf, versaoAntiga])

  const arrumar = useCallback((registrar = true) => {
    const v = versaoRef.current
    // Organizar mexe só nos passos: as notas ficam onde a pessoa pôs.
    const notas = Object.fromEntries(Object.keys(v.graph.notes ?? {}).filter((k) => v.graph.layout[k]).map((k) => [k, v.graph.layout[k]]))
    const layout = { ...organizar(v.graph, medida), ...notas }
    if (registrar) { deslizarNaProxima(); aplicar({ ...v, graph: { ...v.graph, layout } }) }
    else {
      const nova = { ...v, graph: { ...v.graph, layout } }
      versaoRef.current = nova
      setVersao(nova)
    }
    // Enquadra depois que os passos assentam (o enquadramento lê as posições da tela).
    if (registrar) setTimeout(() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 300 }), DURACAO_DO_DESLIZE_MS + 20)
    else requestAnimationFrame(enquadrarInicio)
  }, [aplicar, medida, rf, enquadrarInicio, deslizarNaProxima])

  // Primeira vez com os cartões medidos: arruma desenho sem posição ou sobreposto, e enquadra.
  const jaEnquadrou = useRef(false)
  useEffect(() => {
    if (!nosMedidos || jaEnquadrou.current) return
    jaEnquadrou.current = true
    const { layout, nodes: nos } = versaoRef.current.graph
    const faltaPosicao = !layout[ID_DA_ENTRADA] || Object.keys(nos).some((id) => !layout[id])
    if (faltaPosicao || haSobreposicao(semNotas(layout), medida)) arrumar(false)
    else requestAnimationFrame(enquadrarInicio)
    // Dois quadros: o enquadramento já está aplicado quando o desenho aparece.
    requestAnimationFrame(() => requestAnimationFrame(() => setCanvasPronto(true)))
  }, [nosMedidos, medida, arrumar, enquadrarInicio])

  // Garantia: se a medição não chegar, o desenho aparece mesmo assim.
  useEffect(() => {
    const t = setTimeout(() => setCanvasPronto(true), 1500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!canvasPronto) return
    const t = setTimeout(() => setCascata(false), 1200)
    return () => clearTimeout(t)
  }, [canvasPronto])

  // Enquanto a pessoa não mexe na vista, o desenho continua enquadrado quando a
  // área muda de tamanho: o menu do app deslizando para fora ao entrar no modo
  // foco, ou a janela mudando. Mexeu (arrastou, deu zoom, editou), para.
  useEffect(() => {
    const area = areaRef.current
    if (!area || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { if (jaEnquadrou.current && !vistaTocada.current) enquadrarInicio() })
    ro.observe(area)
    return () => ro.disconnect()
  }, [enquadrarInicio])
  useEffect(() => { if (selecionado) vistaTocada.current = true }, [selecionado])
  // A seleção que o canvas guarda acompanha a do editor nos dois sentidos. Antes só acompanhava ao escolher:
  // fechar o painel (X, Esc ou a lista de passos) deixava o passo antigo guardado, e o próximo clique em
  // outro passo virava "dois passos escolhidos", sem painel (16/11).
  useEffect(() => {
    if (selecionado) selecaoRF.current = new Set([selecionado])
    else if (!multiplos.length) selecaoRF.current = new Set()
  }, [selecionado, multiplos])
  useEffect(() => {
    if (versaoAntiga) return
    let vivo = true
    const ler = () => { jornadasApi.presenca(jornada.id, selecionado).then((p) => { if (vivo) setPresentes(p) }).catch(() => {}) }
    ler()
    const t = setInterval(ler, 20_000)
    return () => { vivo = false; clearInterval(t) }
  }, [jornada.id, selecionado, versaoAntiga])

  // O passo escolhido fica à vista no canvas (que já é só a parte ao lado do painel): o desenho anda só o necessário.
  useEffect(() => {
    if (centrandoPassoNovo.current) { centrandoPassoNovo.current = false; return }
    if (!selecionado || celular) return
    const area = areaRef.current?.getBoundingClientRect()
    const n = rf.getNode(selecionado)
    if (!area || !n) return
    const { w } = medida(selecionado)
    const { x, y, zoom } = rf.getViewport()
    const direita = x + (n.position.x + w) * zoom
    const esquerda = x + n.position.x * zoom
    const limite = area.width - 40
    // 64 px: a faixa do menu vertical do canvas, à esquerda.
    if (direita > limite) rf.setViewport({ x: x - Math.max(0, Math.min(direita - limite, esquerda - 64)), y, zoom }, { duration: 260, interpolate: 'linear' })
  }, [selecionado, celular, rf, medida, celularAberto, larguraAjustada])

  // Encaixado: com a lista de passos aberta, o "+" clicado (e o lugar reservado ao lado dele) não fica
  // atrás dela. Como no passo escolhido, o desenho anda só o necessário.
  // Encaixado, abrir a lista encolhe o desenho: ele fica parado (sem reenquadrar), como ao escolher um passo.
  useLayoutEffect(() => { if (encaixado && seletor) vistaTocada.current = true }, [encaixado, seletor])
  useEffect(() => {
    if (!encaixado || !seletor || seletor.destino.tipo === 'solto') return
    const area = areaRef.current?.getBoundingClientRect()
    if (!area) return
    const passou = seletor.ponto.x - (area.right - 150)
    if (passou <= 0) return
    const { x, y, zoom } = rf.getViewport()
    rf.setViewport({ x: x - passou, y, zoom }, { duration: 260, interpolate: 'linear' })
  }, [encaixado, seletor, rf])

  /** Centra o passo; com `gaveta` (px), no meio da parte do canvas que a gaveta à direita não cobre. */
  const irAoPasso = useCallback((id: string, gaveta = 0) => {
    const n = rf.getNode(id)
    if (!n) return
    const { w, h } = medida(id)
    const zoom = Math.max(rf.getZoom(), 0.85)
    rf.setCenter(n.position.x + w / 2 + gaveta / 2 / zoom, n.position.y + h / 2, { zoom, duration: 300 })
  }, [rf, medida])

  // Ao abrir com o caminho de uma pessoa: vai até onde ela está (o último passo).
  useEffect(() => {
    const ultimo = caminhoExterno?.nodeIds[caminhoExterno.nodeIds.length - 1]
    if (!ultimo || !canvasPronto) return
    vistaTocada.current = true
    const t = setTimeout(() => irAoPasso(ultimo), 250)
    return () => clearTimeout(t)
  }, [caminhoExterno, canvasPronto, irAoPasso])

  /** "Enviar um teste para mim": uma mensagem do passo para o WhatsApp de quem edita. */
  const enviarTeste = async (nodeId: string) => {
    setEnviandoTeste(true)
    try {
      const r = await jornadasApi.enviarTeste(jornada.id, nodeId)
      toast(`Teste enviado para ${r.to}. Confira no seu WhatsApp.`, "success")
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível enviar o teste.", "error")
    } finally {
      setEnviandoTeste(false)
    }
  }

  // ── mudanças no desenho ──────────────────────────────────────────────────
  const mudarNos = (nodes: Record<string, NoDoGrafo>, extra: Partial<VersaoDaJornada['graph']> = {}, registrar = true) =>
    aplicar({ ...versaoRef.current, graph: { ...versaoRef.current.graph, nodes, ...extra } }, registrar)

  /**
   * Põe um passo novo no desenho, já ligado ao lugar escolhido:
   * numa saída livre, no meio de uma ligação, abaixo do passo selecionado ou solto.
   */
  const inserirPasso = (type: string, destino: DestinoDoPasso, posicaoSolta?: { x: number; y: number }) => {
    if (somenteLeitura) return
    const passo = passoDoCatalogo(catalogo, type)
    if (!passo || passo.availability === 'soon') return
    const v = versaoRef.current
    const id = `n_${Math.random().toString(36).slice(2, 8)}`
    const params = paramsPadrao(type, catalogo)
    const saidasNovas = saidasDoNo({ type, params }, catalogo)
    const novo: NoDoGrafo = { type, params, outputs: Object.fromEntries(saidasNovas.map((s) => [s.key, null])) }
    const nodes = { ...v.graph.nodes, [id]: novo }
    let start = v.graph.start
    let pos: { x: number; y: number } | null = posicaoSolta ?? null
    let reorganizar = false

    // "Solto" com um passo selecionado vira "na primeira saída livre dele".
    let alvo = destino
    if (alvo.tipo === 'solto' && !posicaoSolta) {
      if (selecionado && selecionado !== ID_DA_ENTRADA && v.graph.nodes[selecionado]) {
        const livre = saidasDoNo(v.graph.nodes[selecionado], catalogo).find((s) => !v.graph.nodes[selecionado].outputs[s.key])
        if (livre) alvo = { tipo: 'saida', origem: selecionado, saida: livre.key }
      } else if (!start) {
        alvo = { tipo: 'saida', origem: ID_DA_ENTRADA, saida: 'next' }
      }
    }

    const posAbaixoDe = (origemId: string, saida: string) => {
      const n = rf.getNode(origemId)
      if (!n) return { x: 0, y: 0 }
      const m = medida(origemId)
      const saidas = origemId === ID_DA_ENTRADA ? [{ key: 'next' }] : saidasDoNo(v.graph.nodes[origemId], catalogo)
      const i = Math.max(0, saidas.findIndex((s) => s.key === saida))
      const centroDaSaida = n.position.x + ((i + 0.5) * m.w) / saidas.length
      return { x: centroDaSaida - TAMANHO_ESTIMADO.w / 2, y: n.position.y + m.h + VAO_Y }
    }

    if (alvo.tipo === 'saida') {
      if (alvo.origem === ID_DA_ENTRADA) start = id
      else nodes[alvo.origem] = { ...v.graph.nodes[alvo.origem], outputs: { ...v.graph.nodes[alvo.origem].outputs, [alvo.saida]: id } }
      pos = posAbaixoDe(alvo.origem, alvo.saida)
    } else if (alvo.tipo === 'entre') {
      if (alvo.origem === ID_DA_ENTRADA) start = id
      else nodes[alvo.origem] = { ...v.graph.nodes[alvo.origem], outputs: { ...v.graph.nodes[alvo.origem].outputs, [alvo.saida]: id } }
      if (saidasNovas[0]) novo.outputs[saidasNovas[0].key] = alvo.destino
      pos = posAbaixoDe(alvo.origem, alvo.saida)
      reorganizar = true // quem estava abaixo precisa descer
    } else if (!pos) {
      // Solto, sem nada selecionado: no centro da vista atual.
      const area = areaRef.current?.getBoundingClientRect()
      pos = area ? rf.screenToFlowPosition({ x: area.left + area.width / 2, y: area.top + area.height / 2 }) : { x: 0, y: 0 }
      pos = { x: pos.x - TAMANHO_ESTIMADO.w / 2, y: pos.y - TAMANHO_ESTIMADO.h / 2 }
    }

    const grafo = { ...v.graph, nodes, start, layout: { ...v.graph.layout, [id]: pos! } }
    // O passo nasce preenchido pelo caminho que chega nele (17/11): o aviso, o motivo, a meta, a missão…
    if (alvo.tipo === 'saida' || alvo.tipo === 'entre') {
      nodes[id] = { ...novo, params: { ...novo.params, ...preencherPeloCaminho({ ...v, graph: grafo }, id, catalogo, apoio) } }
      nodes[id].outputs = Object.fromEntries(saidasDoNo(nodes[id], catalogo).map((s) => [s.key, novo.outputs[s.key] ?? null]))
    }
    const medidaComNovo: Medida = (k) => (k === id ? TAMANHO_ESTIMADO : medida(k))
    if (reorganizar || haSobreposicao(grafo.layout, medidaComNovo)) { grafo.layout = organizar(grafo, medidaComNovo); deslizarNaProxima() }
    aplicar({ ...v, graph: grafo })
    // Encaixado, a câmera centra o passo novo na parte visível e o "não esconder o passo escolhido" fica de
    // fora desta vez (eram duas animações disputando a vista). `linear`: o padrão do React Flow afasta o zoom
    // e volta em trajetos longos.
    centrandoPassoNovo.current = encaixado
    setSelecionado(id)
    setSeletor(null)
    const p = grafo.layout[id]
    requestAnimationFrame(() => rf.setCenter(p.x + TAMANHO_ESTIMADO.w / 2, p.y + TAMANHO_ESTIMADO.h / 2, { zoom: Math.max(Math.min(rf.getZoom(), 1), 0.85), duration: 250, interpolate: 'linear' }))
  }

  const apagar = (id: string) => {
    if (id === ID_DA_ENTRADA || somenteLeitura) return
    const v = versaoRef.current
    // Se o passo apagado seguia para um lugar só, quem chegava nele passa a ir
    // direto para lá: apagar do meio não deixa o resto da jornada solto.
    const seguintes = [...new Set(Object.values(v.graph.nodes[id]?.outputs ?? {}).filter((d): d is string => !!d && d !== id))]
    const religar = seguintes.length === 1 ? seguintes[0] : null
    const nodes: Record<string, NoDoGrafo> = {}
    let religou = false
    for (const [k, n] of Object.entries(v.graph.nodes)) {
      if (k === id) continue
      nodes[k] = { ...n, outputs: Object.fromEntries(Object.entries(n.outputs).map(([s, d]) => {
        if (d !== id) return [s, d]
        if (religar && religar !== k) { religou = true; return [s, religar] }
        return [s, null]
      })) }
    }
    const start = v.graph.start === id ? religar : v.graph.start
    if (v.graph.start === id && religar) religou = true
    const layout = { ...v.graph.layout }
    delete layout[id]
    const grafo = { ...v.graph, nodes, layout, start }
    if (religou) { grafo.layout = organizar(grafo, medida); deslizarNaProxima() }
    aplicar({ ...v, graph: grafo })
    if (selecionado === id) setSelecionado(null)
    toast(religou ? 'Passo apagado e o caminho religado. Ctrl+Z desfaz.' : 'Passo apagado. Ctrl+Z desfaz.', 'info')
  }

  const duplicar = (id: string) => {
    const v = versaoRef.current
    const original = v.graph.nodes[id]
    if (!original) return
    const novoId = `n_${Math.random().toString(36).slice(2, 8)}`
    const copia: NoDoGrafo = { ...JSON.parse(JSON.stringify(original)), outputs: Object.fromEntries(Object.keys(original.outputs).map((k) => [k, null])) }
    const p = v.graph.layout[id] ?? rf.getNode(id)?.position ?? { x: 0, y: 0 }
    aplicar({ ...v, graph: { ...v.graph, nodes: { ...v.graph.nodes, [novoId]: copia }, layout: { ...v.graph.layout, [novoId]: { x: p.x + 48, y: p.y + 48 } } } })
    setSelecionado(novoId)
  }

  // ── vários passos: copiar, colar (até em outra jornada), ramo, apagar ──────
  const copiar = (ids: string[]) => {
    const v = versaoRef.current
    const escolhidos = ids.filter((id) => v.graph.nodes[id])
    if (!escolhidos.length) return
    const copia = {
      origem: jornada.name,
      nodes: Object.fromEntries(escolhidos.map((id) => [id, v.graph.nodes[id]])),
      layout: Object.fromEntries(escolhidos.map((id) => [id, v.graph.layout[id] ?? { x: 0, y: 0 }])),
    }
    try { localStorage.setItem(CHAVE_DA_COPIA, JSON.stringify(copia)) } catch { /* sem armazenamento */ }
    toast(`${escolhidos.length === 1 ? '1 passo copiado' : `${escolhidos.length} passos copiados`}. Cole aqui ou em outra jornada com Ctrl+V.`, 'info')
  }
  const colar = () => {
    if (somenteLeitura) return
    let copia: { origem: string; nodes: Record<string, NoDoGrafo>; layout: Record<string, { x: number; y: number }> } | null = null
    try { copia = JSON.parse(localStorage.getItem(CHAVE_DA_COPIA) ?? 'null') } catch { copia = null }
    if (!copia || !Object.keys(copia.nodes).length) { toast('Nada copiado ainda. Escolha passos e use Ctrl+C.', 'info'); return }
    const v = versaoRef.current
    const novos = Object.fromEntries(Object.keys(copia.nodes).map((id) => [id, `n_${Math.random().toString(36).slice(2, 8)}`]))
    // Ligações entre os copiados continuam; as que saíam deles para fora ficam soltas.
    const nodes = { ...v.graph.nodes }
    for (const [velho, no] of Object.entries(copia.nodes)) {
      nodes[novos[velho]] = { ...JSON.parse(JSON.stringify(no)), outputs: Object.fromEntries(Object.entries(no.outputs).map(([k, d]) => [k, d && novos[d] ? novos[d] : null])) }
    }
    const xs = Object.values(copia.layout).map((p) => p.x)
    const ys = Object.values(copia.layout).map((p) => p.y)
    // Ao lado do desenho, à direita, para não cair em cima dos passos que já existem.
    const ocupadas = Object.entries(v.graph.layout).filter(([id]) => v.graph.nodes[id] || id === ID_DA_ENTRADA).map(([, p]) => p)
    const alvo = ocupadas.length
      ? { x: Math.max(...ocupadas.map((p) => p.x)) + 360, y: Math.min(...ocupadas.map((p) => p.y)) }
      : { x: 0, y: 0 }
    const layout = { ...v.graph.layout }
    for (const [velho, p] of Object.entries(copia.layout)) layout[novos[velho]] = { x: alvo.x + (p.x - Math.min(...xs)), y: alvo.y + (p.y - Math.min(...ys)) }
    aplicar({ ...v, graph: { ...v.graph, nodes, layout } })
    const ids = Object.values(novos)
    setSelecionado(null)
    selecaoRF.current = new Set(ids)
    setMultiplos(ids.length > 1 ? ids : [])
    if (ids.length === 1) setSelecionado(ids[0])
    setTimeout(() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 300 }), 120)
    toast(`${ids.length === 1 ? '1 passo colado' : `${ids.length} passos colados`}${copia.origem !== jornada.name ? ` de “${copia.origem}”` : ''}. Ligue onde quiser.`, 'success')
  }
  /** O passo e tudo o que vem depois dele: para mover ou copiar um ramo inteiro. */
  const selecionarRamo = (id: string) => {
    const g = versaoRef.current.graph
    const vistos = new Set<string>()
    const fila = [id]
    while (fila.length) {
      const atual = fila.shift()!
      if (vistos.has(atual) || !g.nodes[atual]) continue
      vistos.add(atual)
      for (const d of Object.values(g.nodes[atual].outputs)) if (d) fila.push(d)
    }
    const ids = [...vistos]
    setSelecionado(null)
    selecaoRF.current = new Set(ids)
    setMultiplos(ids)
    toast(`${ids.length} passos escolhidos. Arraste um deles para mover o ramo inteiro.`, 'info')
  }
  const apagarVarios = (ids: string[]) => {
    if (somenteLeitura) return
    const alvos = ids.filter((id) => id !== ID_DA_ENTRADA)
    if (!alvos.length) return
    // Um passo só no histórico: Ctrl+Z traz todos de volta de uma vez.
    const antes = versaoRef.current
    setPassado((p) => [...p.slice(-LIMITE_DO_HISTORICO + 1), antes])
    setFuturo([])
    emLote.current = true
    try { for (const id of alvos) { if (ehNota(id)) apagarNota(id); else apagar(id) } } finally { emLote.current = false }
    selecaoRF.current = new Set()
    setMultiplos([])
  }
  /** Baixa o desenho inteiro como PNG (P2, 16/11, como a HubSpot), para documentar ou mandar a alguém. */
  const exportarImagem = async () => {
    const alvo = areaRef.current?.querySelector('.react-flow') as HTMLElement | null
    if (!alvo) return
    setExportando(true)
    const vista = rf.getViewport()
    try {
      rf.fitView({ padding: 0.08, maxZoom: 1 })
      await new Promise((r) => setTimeout(r, 350))
      const html2canvas = (await import('html2canvas')).default
      const fundo = getComputedStyle(document.documentElement).getPropertyValue('--jt-canvas').trim() || getComputedStyle(document.documentElement).getPropertyValue('--color-surface-950').trim() || '#0B1010'
      const canvas = await html2canvas(alvo, {
        backgroundColor: fundo,
        scale: 2,
        logging: false,
        ignoreElements: (el) => el.classList?.contains('react-flow__minimap') || el.classList?.contains('react-flow__panel'),
      })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${(nome || 'jornada').replace(/[^\w\u00C0-\u017F -]+/g, '').trim() || 'jornada'}.png`
      a.click()
      toast('Imagem do desenho baixada.', 'success')
    } catch {
      toast('Não deu para gerar a imagem deste desenho.', 'error')
    } finally {
      rf.setViewport(vista)
      setExportando(false)
    }
  }
  const presencaPorNo = useMemo(() => new Map(presentes.filter((p) => p.nodeId).map((p) => [p.nodeId!, p.name])), [presentes])
  // Atalhos que dependem das funções acima (sempre as da última renderização).
  const atalhos = useRef({ copiar: () => {}, colar: () => {} })
  useEffect(() => {
    atalhos.current = {
      copiar: () => copiar(multiplos.length ? multiplos : selecionado && selecionado !== ID_DA_ENTRADA ? [selecionado] : []),
      colar,
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'c') { atalhos.current.copiar() }
      else if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); atalhos.current.colar() }
      else if (!mod && !e.altKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); setBuscaAberta(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── notas adesivas ───────────────────────────────────────────────────────
  const mudarNota = useCallback((id: string, texto: string) => {
    const v = versaoRef.current
    const nota = v.graph.notes?.[id]
    if (!nota) return
    aplicar({ ...v, graph: { ...v.graph, notes: { ...v.graph.notes, [id]: { ...nota, text: texto } } } })
  }, [aplicar])
  const apagarNota = useCallback((id: string) => {
    const v = versaoRef.current
    const notes = { ...(v.graph.notes ?? {}) }
    delete notes[id]
    const layout = { ...v.graph.layout }
    delete layout[id]
    aplicar({ ...v, graph: { ...v.graph, notes, layout } })
  }, [aplicar])
  const adicionarNota = () => {
    const v = versaoRef.current
    const r = areaRef.current?.getBoundingClientRect()
    // À esquerda da vista, ao lado do menu: o desenho costuma ficar no centro.
    const p = r ? rf.screenToFlowPosition({ x: r.left + 84, y: r.top + 96 }) : { x: 0, y: 0 }
    const id = `nota_${Math.random().toString(36).slice(2, 8)}`
    aplicar({ ...v, graph: { ...v.graph, notes: { ...(v.graph.notes ?? {}), [id]: { text: '', color: 'amarelo', author: 'Você', at: new Date().toISOString() } }, layout: { ...v.graph.layout, [id]: p } } })
  }

  // ── nós e ligações do React Flow (derivados) ─────────────────────────────
  const contadores = useMemo(() => new Map((resultados?.byNode ?? []).map((b) => [b.nodeId, b])), [resultados])
  const numeracao = useMemo(() => numerarPassos(versao.graph), [versao.graph])
  // O caminho aceso: o do teste ou o de uma pessoa (Pessoas → "Ver no desenho").
  const caminhoVisto = !teste && caminhoExterno ? caminhoExterno : null
  const caminho = useMemo(() => new Set(teste?.caminho ?? caminhoVisto?.nodeIds ?? []), [teste, caminhoVisto])

  const nodes = useMemo<(NoDoPassoRF | NoDaEntradaRF | NoDaNotaRF)[]>(() => {
    const errosPorNo = new Map<string, number>()
    for (const p of problemas) if (p.severity === 'error' && p.nodeId) errosPorNo.set(p.nodeId, (errosPorNo.get(p.nodeId) ?? 0) + 1)
    // Ordem de cima para baixo (e da esquerda para a direita) para a cascata da entrada.
    const ordem = new Map(Object.entries(layoutExibido).sort(([, a], [, b]) => a.y - b.y || a.x - b.x).map(([id], i) => [id, i]))
    const atraso = (id: string) => (cascata ? ({ '--jornadas-atraso': `${Math.min(ordem.get(id) ?? 0, 14) * 45}ms` } as CSSProperties) : undefined)
    const entrada: NoDaEntradaRF = {
      id: ID_DA_ENTRADA,
      type: 'entrada',
      style: atraso(ID_DA_ENTRADA),
      position: layoutExibido[ID_DA_ENTRADA] ?? { x: -150, y: 0 },
      selected: selecionado ? selecionado === ID_DA_ENTRADA : multiplos.includes(ID_DA_ENTRADA),
      measured: medidas[ID_DA_ENTRADA],
      deletable: false,
      draggable: !somenteLeitura,
      data: {
        portas: versao.entry.doors.map((d) => resumoDaPorta(d, catalogo)),
        filtro: frasesDasCondicoes(versao.entry.criteria, catalogo),
        reentrada: resumoDaReentrada(versao.entry),
        semInicio: !versao.graph.start,
        erros: problemas.filter((p) => p.code === 'no_door' || p.code === 'no_start').length,
        noCaminhoDoTeste: !!teste || !!caminhoVisto,
      },
    }
    const passos: NoDoPassoRF[] = Object.entries(versao.graph.nodes).map(([id, no]) => {
      const passo = passoDoCatalogo(catalogo, no.type)
      const c = contadores.get(id)
      const saidas = saidasDoNo(no, catalogo)
      return {
        id,
        type: 'passo',
        style: atraso(id),
        position: layoutExibido[id] ?? { x: 0, y: 0 },
        selected: selecionado ? selecionado === id : multiplos.includes(id),
        measured: medidas[id],
        draggable: !somenteLeitura,
        data: {
          numero: numeracao.get(id) ?? 0,
          titulo: no.label || passo?.label || no.type,
          resumo: resumoDoNo(no, catalogo, apoio),
          tipo: no.type,
          icone: passo?.icon ?? 'Workflow',
          grupo: passo?.group ?? 'controle',
          saidas,
          saidasLivres: saidas.filter((s) => !no.outputs[s.key] || !versao.graph.nodes[no.outputs[s.key]!]).map((s) => s.key),
          erros: errosPorNo.get(id) ?? 0,
          custo: passo && passo.cost.credits > 0 ? passo.cost.label : null,
          contador: c && jornada.publishedVersion && !teste && !versaoAntiga && !caminhoVisto ? { now: c.now, reached: c.reached } : null,
          mostrarNumeros,
          noCaminhoDoTeste: caminho.has(id),
          atualNoTeste: teste?.noAtual === id && !teste.terminou,
          emBreve: passo?.availability === 'soon',
          mudanca: mudancaPorNo.get(id) ?? null,
          comentarios: comentariosPorPasso.get(id) ?? 0,
          presenca: presencaPorNo.get(id) ?? null,
        },
      }
    })
    const notas: NoDaNotaRF[] = Object.entries(versao.graph.notes ?? {}).map(([id, n]) => ({
      id,
      type: 'nota',
      position: layoutExibido[id] ?? { x: 0, y: 0 },
      measured: medidas[id],
      draggable: !somenteLeitura,
      selectable: !somenteLeitura,
      selected: multiplos.includes(id),
      data: { texto: n.text, cor: n.color ?? 'amarelo', autor: n.author, somenteLeitura, onMudar: (t: string) => mudarNota(id, t), onApagar: () => apagarNota(id) },
    }))
    return [...notas, entrada, ...passos]
  }, [versao, layoutExibido, cascata, selecionado, medidas, problemas, catalogo, apoio, contadores, caminho, teste, somenteLeitura, jornada.publishedVersion, numeracao, mostrarNumeros, mudancaPorNo, versaoAntiga, caminhoVisto, comentariosPorPasso, mudarNota, apagarNota, multiplos, presencaPorNo])

  const edges = useMemo<Edge[]>(() => {
    const lista: Edge[] = []
    const cor = 'var(--color-surface-500)'
    const destaque = 'var(--color-accent-violet)'
    const porRamo = new Map((resultados?.byBranch ?? []).map((b) => [`${b.nodeId}:${b.output}`, b.count]))
    // Dois caminhos do mesmo passo para o mesmo destino viram uma pílula só ("A ou B").
    const juntos = new Map<string, string[]>()
    for (const [origem, no] of Object.entries(versao.graph.nodes)) {
      const saidas = saidasDoNo(no, catalogo)
      if (saidas.length < 2) continue
      for (const s of saidas) {
        const destino = no.outputs[s.key]
        if (!destino || !versao.graph.nodes[destino]) continue
        const chave = `${origem}>${destino}`
        juntos.set(chave, [...(juntos.get(chave) ?? []), s.key])
      }
    }
    const ligar = (id: string, source: string, sourceHandle: string, target: string, noTeste: boolean) => {
      const escolhida = ligacaoEscolhida === id
      const c = noTeste ? destaque : escolhida ? 'var(--color-brand-500, #2DD4BF)' : cor
      // Quem ramifica ganha o nome do caminho sobre a ligação (e a fatia, com "Ver números").
      const no = versao.graph.nodes[source]
      const saidas = no ? saidasDoNo(no, catalogo) : []
      const posicao = saidas.findIndex((s) => s.key === sourceHandle)
      const ramo = saidas.length > 1 && posicao >= 0 ? saidas[posicao] : null
      const contagem = porRamo.get(`${source}:${sourceHandle}`)
      const alcance = contadores.get(source)?.reached
      const extra = mostrarNumeros && ramo && contagem !== undefined && alcance ? `${Math.round((contagem / alcance) * 100)}%` : undefined
      const grupo = juntos.get(`${source}>${target}`) ?? []
      const primeiro = grupo[0] === sourceHandle
      const rotulo = ramo && primeiro
        ? grupo.map((k) => saidas.find((s) => s.key === k)?.label ?? k).join(' ou ')
        : undefined
      lista.push({
        id, source, sourceHandle, target, type: 'comMais', selected: escolhida,
        data: ramo ? {
          ramo: true, rotulo, cor: corDaSaida(ramo.key, posicao), extra: grupo.length > 1 ? undefined : extra, repetida: grupo.length > 1 && !primeiro,
          irmaos: [...new Set(Object.values(no?.outputs ?? {}).filter((d): d is string => !!d && !!versao.graph.nodes[d]))],
        } : {},
        animated: noTeste && teste?.noAtual === target && !teste.terminou,
        markerEnd: { type: MarkerType.ArrowClosed, color: c, width: 16, height: 16 },
        style: { stroke: c, strokeWidth: noTeste || escolhida ? 2 : 1.5 },
      })
    }
    if (versao.graph.start) ligar(idDaLigacao(ID_DA_ENTRADA, 'next'), ID_DA_ENTRADA, 'next', versao.graph.start, (!!teste || !!caminhoVisto) && caminho.has(versao.graph.start))
    for (const [origem, no] of Object.entries(versao.graph.nodes)) {
      for (const [saida, destino] of Object.entries(no.outputs)) {
        if (!destino || !versao.graph.nodes[destino]) continue
        ligar(idDaLigacao(origem, saida), origem, saida, destino, caminho.has(origem) && caminho.has(destino))
      }
    }
    return lista
  }, [versao, ligacaoEscolhida, caminho, teste, catalogo, resultados, contadores, mostrarNumeros, caminhoVisto])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    let layout: VersaoDaJornada['graph']['layout'] | null = null
    let novasMedidas: Record<string, { width: number; height: number }> | null = null
    let mudouSelecao = false
    const remocoes: string[] = []
    for (const ch of changes) {
      if (ch.type === 'dimensions' && ch.dimensions) {
        novasMedidas = novasMedidas ?? {}
        novasMedidas[ch.id] = ch.dimensions
      } else if (ch.type === 'position' && ch.position) {
        layout = layout ?? { ...versaoRef.current.graph.layout }
        layout[ch.id] = ch.position
      } else if (ch.type === 'select') {
        if (ch.selected) selecaoRF.current.add(ch.id)
        else selecaoRF.current.delete(ch.id)
        mudouSelecao = true
      } else if (ch.type === 'remove') {
        remocoes.push(ch.id)
      }
    }
    // Delete com vários escolhidos: apaga todos como um passo só do histórico.
    if (remocoes.length > 1) apagarVarios(remocoes)
    else if (remocoes.length === 1) { if (ehNota(remocoes[0])) apagarNota(remocoes[0]); else apagar(remocoes[0]) }
    if (novasMedidas) {
      const n = novasMedidas
      setMedidas((m) => ({ ...m, ...n }))
    }
    if (mudouSelecao) {
      const ids = [...selecaoRF.current]
      // Com a caixa, o que ela encosta fica só marcado (até um passo sozinho): o painel abriria e fecharia
      // no meio do gesto, e o desenho encolheria e cresceria junto (16/11).
      if (caixaAtiva.current) { setMultiplos(ids); setSelecionado(null); setLigacaoEscolhida(null) }
      else if (ids.length > 1) { setMultiplos(ids); setSelecionado(null); setLigacaoEscolhida(null) }
      // Uma nota sozinha não abre painel (ela se edita no próprio cartão).
      else { setMultiplos([]); setSelecionado(ids[0] && !ehNota(ids[0]) ? ids[0] : null); if (ids.length) setLigacaoEscolhida(null) }
    }
    if (layout && !somenteLeitura) {
      const nova = { ...versaoRef.current, graph: { ...versaoRef.current.graph, layout } }
      versaoRef.current = nova
      setVersao(nova)
      setSalvamento('pendente')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [somenteLeitura, selecionado])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const ch of changes) {
      if (ch.type === 'select') setLigacaoEscolhida(ch.selected ? ch.id : null)
      if (ch.type === 'remove') {
        const [origem, saida] = ch.id.split('::')
        const v = versaoRef.current
        if (origem === ID_DA_ENTRADA) { if (v.graph.start) aplicar({ ...v, graph: { ...v.graph, start: null } }) }
        else if (v.graph.nodes[origem]?.outputs[saida]) mudarNos({ ...v.graph.nodes, [origem]: { ...v.graph.nodes[origem], outputs: { ...v.graph.nodes[origem].outputs, [saida]: null } } })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplicar])

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target || c.target === ID_DA_ENTRADA) return
    const v = versaoRef.current
    if (c.source === ID_DA_ENTRADA) { aplicar({ ...v, graph: { ...v.graph, start: c.target } }); return }
    const origem = v.graph.nodes[c.source]
    if (!origem) return
    mudarNos({ ...v.graph.nodes, [c.source]: { ...origem, outputs: { ...origem.outputs, [c.sourceHandle ?? 'next']: c.target } } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplicar])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData(TIPO_ARRASTADO)
    if (!type) return
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    inserirPasso(type, { tipo: 'solto' }, { x: p.x - TAMANHO_ESTIMADO.w / 2, y: p.y - 30 })
  }


  // Quem está num passo agora (P2, 16/11): o número do cartão abre a gaveta.
  const [quemEsta, setQuemEsta] = useState<string | null>(null)
  // "Mudar com IA" (P2, 16/11): a proposta só entra no rascunho se a pessoa aplicar.
  const [mudandoComIa, setMudandoComIa] = useState(false)
  const acoesDoCanvas = useMemo<AcoesDoCanvas>(() => ({
    abrirSeletor: abrirLista,
    somenteLeitura,
    verQuemEsta: (id) => { setSelecionado(null); setQuemEsta(id) },
    insercao: encaixado ? seletor?.destino ?? null : null,
  }), [somenteLeitura, encaixado, seletor, abrirLista])

  const vazio = Object.keys(versao.graph.nodes).length === 0
  const tituloDoSeletor = seletor?.destino.tipo === 'entre' ? 'Inserir um passo aqui' : seletor?.destino.tipo === 'saida' ? 'Qual é o próximo passo?' : 'Adicionar passo'
  const nomeDoPasso = (id: string) => (id === ID_DA_ENTRADA ? 'Entrada' : versao.graph.nodes[id]?.label || passoDoCatalogo(catalogo, versao.graph.nodes[id]?.type ?? '')?.label || 'passo')
  const selecionadoComSaidaLivre = !!selecionado && selecionado !== ID_DA_ENTRADA && !!versao.graph.nodes[selecionado]
    && saidasDoNo(versao.graph.nodes[selecionado], catalogo).some((x) => !versao.graph.nodes[selecionado].outputs[x.key])
  const dicaDoSeletor = !seletor ? undefined
    : seletor.destino.tipo === 'entre' ? `Entra entre “${nomeDoPasso(seletor.destino.origem)}” e “${nomeDoPasso(seletor.destino.destino)}”, já ligado.`
    : seletor.destino.tipo === 'saida' ? `Entra logo depois de “${nomeDoPasso(seletor.destino.origem)}”, já ligado.`
    : selecionadoComSaidaLivre ? `Entra logo depois de “${nomeDoPasso(selecionado!)}”, já ligado.`
    : !versao.graph.start ? 'Entra logo depois da Entrada.'
    : 'Entra solto no desenho. Para já sair ligado, use o “+” de um passo ou de uma ligação.'
  // O passo depois do qual o novo entra (para as sugestões do seletor).
  const origemDoSeletor = !seletor ? null
    : seletor.destino.tipo === 'entre' || seletor.destino.tipo === 'saida' ? seletor.destino.origem
    : selecionadoComSaidaLivre ? selecionado
    : !versao.graph.start ? ID_DA_ENTRADA : null
  const depoisDoSeletor = !origemDoSeletor ? undefined : origemDoSeletor === ID_DA_ENTRADA ? 'entrada' : versao.graph.nodes[origemDoSeletor]?.type
  const ativa = jornada.status === 'active' || jornada.status === 'shadow'

  // ── ações da barra da página (por portal) ────────────────────────────────
  // Enxutas em 16/11, a pedido do João: só o Publicar, com o Testar no menu dele
  // (testar e depois publicar). A conferência virou o número no Publicar e a lista
  // dentro da janela de publicar; o ⋯ saiu (configurações, simular e versões
  // estão no resumo do menu do canvas, e o nome da jornada abre as
  // configurações). O Testar chegou a ir para o canvas, mas sumia no meio dos
  // passos: voltou para cá.
  const pendencias = erros.length || avisos.length
  const acoes = versaoAntiga ? null : (
    <>
    {/* Testar fica no menu do Publicar (16/11, pedido do João): é o passo antes de publicar. Sem o Publicar
        (só leitura), ele continua como botão. Cada passo também tem a aba Testar no painel. */}
    {somenteLeitura && <Button variant="secondary" size="sm" leftIcon={<FlaskConical className="w-4 h-4" />} onClick={() => setTestando(true)} title="Simular um contato passando pela jornada, sem enviar nada">Testar</Button>}
    {!somenteLeitura && (
    <div className="relative inline-flex">
      <Button
        size="sm"
        className="rounded-r-none"
        leftIcon={<Rocket className="w-4 h-4" />}
        onClick={() => setPublicacao({ acao: 'publicar' })}
        aria-label={erros.length ? `Publicar. ${erros.length} problema${erros.length > 1 ? 's impedem' : ' impede'} a publicação` : avisos.length ? `Publicar. ${avisos.length} aviso${avisos.length > 1 ? 's' : ''} no desenho` : undefined}
        title={erros.length ? 'Há problemas no desenho. Clique para ver a lista.' : avisos.length ? 'Há avisos no desenho. Clique para ver.' : undefined}
      >
        Publicar
      </Button>
      <Dropdown
        open={menu === 'publicar'}
        onClose={() => setMenu(null)}
        align="right"
        className="w-60"
        anchor={
          <Button size="sm" iconOnly className="rounded-l-none border-l border-[color-mix(in_srgb,var(--color-btn-primary-fg)_25%,transparent)]" aria-label="Testar e mais opções de publicação" aria-expanded={menu === 'publicar'} onClick={() => setMenu((m) => (m === 'publicar' ? null : 'publicar'))}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        }
      >
        <DropdownItem icon={FlaskConical} onClick={() => { setMenu(null); setTestando(true) }}>Testar a jornada (sem enviar)</DropdownItem>
        <DropdownSeparator />
        <DropdownItem icon={Rocket} onClick={() => { setMenu(null); setPublicacao({ acao: 'publicar', modo: 'active' }) }}>Publicar e ativar</DropdownItem>
        <DropdownItem icon={Ghost} onClick={() => { setMenu(null); setPublicacao({ acao: 'publicar', modo: 'shadow' }) }}>Pôr em sombra (sem enviar)</DropdownItem>
        {(ativa || jornada.status === 'paused') && <DropdownSeparator />}
        {ativa && <DropdownItem icon={Pause} onClick={() => { setMenu(null); setPausando(true) }}>Pausar a jornada</DropdownItem>}
        {jornada.status === 'paused' && <DropdownItem icon={Play} onClick={() => { setMenu(null); setPublicacao({ acao: 'retomar' }) }}>Retomar a jornada</DropdownItem>}
      </Dropdown>
      {pendencias > 0 && (
        <span aria-hidden className={cn(
          'pointer-events-none absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums ring-2 ring-[var(--jt-moldura)]',
          erros.length ? 'bg-[var(--color-danger)] text-white' : 'bg-[var(--jt-ambar-no)] text-[#2A1B00]',
        )}>
          {pendencias}
        </span>
      )}
    </div>
    )}
    </>
  )

  const podeSelecionarArrastando = !somenteLeitura && ferramenta === 'selecionar'
  const gavetaAberta = !!selecionado && (selecionado === ID_DA_ENTRADA || !!versao.graph.nodes[selecionado])
  const tipoDoSelecionado = selecionado && selecionado !== ID_DA_ENTRADA ? versao.graph.nodes[selecionado]?.type : undefined
  const gavetaComCelular = gavetaAberta && !!tipoDoSelecionado && TIPOS_COM_CELULAR.has(tipoDoSelecionado) && celularAberto
  // O painel do passo e a lista de passos: na vaga ao lado do desenho (computador) ou por cima dele (celular).
  // O painel do passo e a lista de passos.
  const painelDoPasso = selecionado && (selecionado === ID_DA_ENTRADA || versao.graph.nodes[selecionado]) ? (
    <GavetaDoPasso
      key="gaveta"
      className={celular ? 'top-0 right-0 bottom-0 w-full max-w-none rounded-none' : encaixado ? CLASSE_ENCAIXADA : undefined}
      encaixado={encaixado}
      celularAberto={encaixado ? celularAberto : undefined}
      onCelular={encaixado ? (v) => { setCelularAberto(v); gravarCelularAberto(v) } : undefined}
      versao={versao}
      selecionado={selecionado}
      catalogo={catalogo}
      apoio={apoio}
      problemas={problemas}
      onMudarVersao={(v) => aplicar(v)}
      onMudarEArrumar={(v) => { aplicar(v); setTimeout(() => arrumar(false), 60) }}
      onApagar={apagar}
      onDuplicar={duplicar}
      onFechar={() => setSelecionado(null)}
      onSelecionar={setSelecionado}
      onEscolherProximo={(origem, saida) => { const r = areaRef.current?.getBoundingClientRect(); abrirLista({ tipo: 'saida', origem, saida }, { x: (r?.left ?? 0) + (r?.width ?? 0) / 2, y: (r?.top ?? 0) + 80 }) }}
      somenteLeitura={somenteLeitura}
      numeroDoPasso={numeracao.get(selecionado)}
      resultados={resultados}
      publicada={!!jornada.publishedVersion}
      onTestarJornada={() => setTestando(true)}
      onEnviarTeste={enviarTeste}
      enviandoTeste={enviandoTeste}
      jornadaId={jornada.id}
      comentariosPorPasso={comentariosPorPasso}
      onCopiar={(id) => copiar([id])}
      onSelecionarRamo={(id) => selecionarRamo(id)}
      onComentariosMudaram={() => void recarregarComentarios()}
    />
  ) : null
  const listaDePassos = seletor ? (
    <SeletorDePasso
      key="seletor"
      className={encaixado ? CLASSE_ENCAIXADA : undefined}
      encaixado={encaixado}
      catalogo={catalogo}
      ponto={seletor.ponto}
      area={seletor.area}
      titulo={tituloDoSeletor}
      dica={dicaDoSeletor}
      depoisDe={depoisDoSeletor}
      saida={seletor.destino.tipo === 'saida' || seletor.destino.tipo === 'entre' ? seletor.destino.saida : undefined}
      onEscolher={(type) => inserirPasso(type, seletor.destino)}
      onFechar={() => setSeletor(null)}
    />
  ) : null
  // Encaixado, a vaga mostra UM painel por vez:
  // a lista substitui o painel do passo e ele volta quando ela fecha. Com os dois montados na mesma vaga,
  // o fade de um deixava o outro aparecer por baixo (os textos se misturavam e a tela piscava, 16/11).
  const paineis = encaixado ? (
    <AnimatePresence mode="wait" initial={false}>{listaDePassos ?? painelDoPasso}</AnimatePresence>
  ) : (
    <>
      <AnimatePresence>{painelDoPasso}</AnimatePresence>
      <AnimatePresence>{listaDePassos}</AnimatePresence>
    </>
  )

  return (
    <MotionConfig reducedMotion="user">
    <ProvedorDoSistema sistema={apoio.connector ? { nome: apoio.connector.name, logoUrl: apoio.connector.logoUrl } : null}>
    <ContextoDoCanvas.Provider value={acoesDoCanvas}>
      {slotEstado && createPortal(<EstadoDoSalvamento key={somenteLeitura ? 'leitura' : salvamento} estado={somenteLeitura ? 'leitura' : salvamento} />, slotEstado)}
      {slotAcoes && createPortal(acoes, slotAcoes)}

      <div className={cn('flex h-full min-h-0', encaixado ? 'flex-row' : 'flex-col')}>
      <div ref={areaRef} className={cn('jornadas-canvas relative flex-1 min-h-0 min-w-0 overflow-hidden', !canvasPronto && 'jornadas-canvas--preparando', podeSelecionarArrastando && 'jornadas-canvas--seta')} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={TIPOS_DE_NO}
          edgeTypes={TIPOS_DE_LIGACAO}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={() => !somenteLeitura && setPassado((p) => [...p.slice(-LIMITE_DO_HISTORICO + 1), versaoRef.current])}
          // Clicar no fundo fecha tudo o que está aberto por cima do desenho (painel do passo,
          // lista de passos, busca). Clicar num passo fecha a lista e a busca: o painel dele toma o lugar.
          // O clique tolera um tremido de até 5 px: com 0 (o padrão), qualquer tremido virava "arrastar o
          // desenho" e o painel não fechava (16/11).
          paneClickDistance={5}
          onPaneClick={() => { setSelecionado(null); setLigacaoEscolhida(null); setMultiplos([]); selecaoRF.current = new Set(); setSeletor(null); setBuscaAberta(false) }}
          onNodeClick={(evento, no) => {
            setSeletor(null)
            setBuscaAberta(false)
            // Um passo marcado só pela caixa: o clique nele abre o painel (o React Flow não avisa, porque
            // para ele o passo já estava escolhido). Com Ctrl/Shift, é somar à seleção: não mexe.
            if (!evento.ctrlKey && !evento.metaKey && !evento.shiftKey && multiplos.length === 1 && multiplos[0] === no.id && !ehNota(no.id)) {
              setMultiplos([])
              setSelecionado(no.id)
            }
          }}
          onSelectionStart={() => { caixaAtiva.current = true }}
          onSelectionEnd={() => { caixaAtiva.current = false }}
          onMoveStart={(evento) => { if (evento) vistaTocada.current = true }}
          // Seleção como na área de trabalho do Windows e no n8n (16/11): com a seta, arrastar no fundo desenha
          // a caixa e escolhe o que ela ENCOSTA; a vista anda com a roda (ou dois dedos), Espaço + arrastar ou o
          // botão do meio, e Ctrl + roda (ou pinça) dá zoom. Com a mão, ou só lendo, arrastar move a vista.
          selectionOnDrag={podeSelecionarArrastando}
          panOnDrag={podeSelecionarArrastando ? [1] : true}
          selectionMode={SelectionMode.Partial}
          panOnScroll={!celular}
          isValidConnection={(c) => c.source !== c.target && c.target !== ID_DA_ENTRADA}
          nodesConnectable={!somenteLeitura}
          deleteKeyCode={somenteLeitura ? null : ['Backspace', 'Delete']}
          colorMode={resolvedTheme}
          minZoom={0.25}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'var(--jt-canvas)' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="var(--color-surface-700)" />
          {mapa && (
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              nodeBorderRadius={8}
              className="jornadas-surgir !m-4 !rounded-[10px] !border !border-surface-700 overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.28)]"
              bgColor={resolvedTheme === 'light' ? '#FFFFFF' : '#0E1414'}
              nodeColor={(n) => (n.type === 'nota' ? (resolvedTheme === 'light' ? '#F3D9A4' : '#5A4A22') : nosComErro.has(n.id) ? '#EF4444' : nosComAviso.has(n.id) ? '#F59E0B' : resolvedTheme === 'light' ? '#C9CFDA' : '#3A5050')}
              maskColor={resolvedTheme === 'light' ? 'rgba(237,240,244,0.7)' : 'rgba(6,9,9,0.6)'}
            />
          )}
        </ReactFlow>

        {/* Faixa da versão antiga (só leitura) ou das mudanças desde a versão no ar. */}
        {versaoAntiga ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-16">
            <div role="status" className="jornadas-surgir pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-surface-700 bg-[var(--jt-moldura)] px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
              <History className="h-4 w-4 shrink-0 text-surface-300" aria-hidden />
              <span className="text-[14px] text-surface-100">
                <strong className="font-semibold">Versão {versaoAntiga.info.version}</strong>
                <span className="text-surface-400"> · {dataHora(versaoAntiga.info.publishedAt)} · {versaoAntiga.info.publishedBy} · só leitura</span>
              </span>
              <Button size="sm" variant="secondary" onClick={versaoAntiga.onSair}>Voltar ao rascunho</Button>
            </div>
          </div>
        ) : jornada.pendingApproval && !somenteLeitura ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-16">
            <div role="status" className="jornadas-surgir pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-surface-700 bg-[var(--jt-moldura)] px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
              <Send className="h-4 w-4 shrink-0 text-surface-300" aria-hidden />
              <span className="text-[14px] text-surface-100">
                <strong className="font-semibold">{jornada.pendingApproval.requestedBy} pediu para publicar</strong>
                <span className="text-surface-400"> · {jornada.pendingApproval.mode === 'shadow' ? 'em sombra' : 'ativa'}{jornada.pendingApproval.note ? ` · “${jornada.pendingApproval.note}”` : ''}</span>
              </span>
              <Button size="sm" onClick={() => setPublicacao({ acao: 'publicar', modo: jornada.pendingApproval!.mode, nota: jornada.pendingApproval!.note })}>Ver e publicar</Button>
              <Button size="sm" variant="ghost" onClick={async () => { onJornadaMudou(await jornadasApi.recusarAprovacao(jornada.id)); toast(jornada.pendingApproval?.requestedBy === 'Você' ? 'Pedido retirado.' : 'Pedido recusado. O rascunho continua como está.', 'success') }}>{jornada.pendingApproval.requestedBy === 'Você' ? 'Desistir do pedido' : 'Recusar'}</Button>
            </div>
          </div>
        ) : jornada.scheduledPublish && !somenteLeitura ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-16">
            <div role="status" className="jornadas-surgir pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-surface-700 bg-[var(--jt-moldura)] px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
              <CalendarClock className="h-4 w-4 shrink-0 text-surface-300" aria-hidden />
              <span className="text-[14px] text-surface-100">
                <strong className="font-semibold">Publica sozinha em {dataHora(jornada.scheduledPublish.at)}</strong>
                <span className="text-surface-400"> · {jornada.scheduledPublish.mode === 'shadow' ? 'em sombra' : 'ativa'}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={async () => { onJornadaMudou(await jornadasApi.cancelarAgendamento(jornada.id)); toast('Agendamento cancelado.', 'success') }}>Cancelar</Button>
            </div>
          </div>
        ) : caminhoVisto ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-16">
            <div role="status" className="jornadas-surgir pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-surface-700 bg-[var(--jt-moldura)] px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent-violet)]" aria-hidden />
              <span className="text-[14px] font-semibold text-surface-100">{caminhoVisto.titulo}</span>
              <Button size="sm" variant="ghost" onClick={caminhoVisto.onFechar}>Fechar</Button>
            </div>
          </div>
        ) : verMudancas && mudancas ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-16">
            <div role="status" className="jornadas-surgir pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-surface-700 bg-[var(--jt-moldura)] px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
              <GitCompareArrows className="h-4 w-4 shrink-0 text-surface-300" aria-hidden />
              <span className="text-[14px] text-surface-100">
                <strong className="font-semibold">Mudanças desde a v{jornada.publishedVersion}</strong>
                <span className="text-surface-400">
                  {[
                    contarTipo('novo') && (contarTipo('novo') === 1 ? '1 passo novo' : `${contarTipo('novo')} passos novos`),
                    contarTipo('mudou') && (contarTipo('mudou') === 1 ? '1 passo mudou' : `${contarTipo('mudou')} passos mudaram`),
                    mudancas.passos.filter((m) => m.tipo === 'saiu').length && `saiu: ${mudancas.passos.filter((m) => m.tipo === 'saiu').map((m) => m.nome).join(', ')}`,
                    ...mudancas.outras,
                  ].filter(Boolean).map((t) => ` · ${t}`).join('') || ' · nada mudou'}
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setVerMudancas(false)}>Fechar</Button>
            </div>
          </div>
        ) : null}

        {/* Vários passos escolhidos: copiar, apagar (e arrastar um move todos). */}
        {multiplos.length > 1 && !somenteLeitura && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
            <div role="toolbar" aria-label="Escolhidos no desenho" className="jornadas-surgir pointer-events-auto flex flex-wrap items-center gap-2 rounded-[12px] border border-surface-700 bg-[var(--jt-moldura)] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
              <span className="text-[14px] font-semibold tabular-nums text-surface-100">{rotuloDaSelecao(multiplos.filter((id) => !ehNota(id)).length, multiplos.filter(ehNota).length)}</span>
              <span className="text-[12px] text-surface-400">arraste um para mover todos</span>
              <Button size="sm" variant="secondary" onClick={() => copiar(multiplos)}>Copiar</Button>
              <Button size="sm" variant="ghost" onClick={() => apagarVarios(multiplos)}>Apagar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setMultiplos([]); selecaoRF.current = new Set() }}>Limpar</Button>
            </div>
          </div>
        )}

        {/* Quem mais está com a jornada aberta (presença). */}
        {presentes.length > 0 && (encaixado || (!selecionado && !seletor)) && (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-surface-700 bg-[var(--jt-moldura)] py-1 pl-1 pr-3 shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
            title={presentes.map((p) => `${p.name}${p.nodeId ? ` está em “${versao.graph.nodes[p.nodeId]?.label || 'um passo'}”` : ''}`).join('\n')}>
            <span className="flex -space-x-1.5">
              {presentes.map((p) => <span key={p.name} className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--jt-violeta-no)] text-[10px] font-bold text-white ring-2 ring-[var(--jt-moldura)]">{iniciais(p.name)}</span>)}
            </span>
            <span className="text-[12px] text-surface-300">{presentes.length === 1 ? `${presentes[0].name.replace(/ \(.*\)/, '')} também está aqui` : `${presentes.length} pessoas também estão aqui`}</span>
          </div>
        )}

        {/* O menu do desenho: vertical, no canto superior esquerdo (como o do HubSpot). */}
        <ControlesDoCanvas
          somenteLeitura={somenteLeitura}
          ferramenta={ferramenta}
          onFerramenta={setFerramenta}
          podeDesfazer={passado.length > 0}
          podeRefazer={futuro.length > 0}
          onDesfazer={desfazer}
          onRefazer={refazer}
          onOrganizar={() => arrumar(true)}
          mapa={mapa}
          onMapa={() => setMapa((m) => !m)}
          onAdicionar={(e) => acoesDoCanvas.abrirSeletor({ tipo: 'solto' }, { x: e.clientX, y: e.clientY })}
          onNota={adicionarNota}
          onExportar={exportarImagem}
          exportando={exportando}
          buscaAberta={buscaAberta}
          onBuscaAberta={setBuscaAberta}
          passos={Object.entries(versao.graph.nodes).map(([id, no]) => ({ id, numero: numeracao.get(id) ?? 0, nome: no.label || passoDoCatalogo(catalogo, no.type)?.label || no.type, tipo: passoDoCatalogo(catalogo, no.type)?.label ?? no.type }))}
          onIrAoPasso={(id) => { setBuscaAberta(false); setSelecionado(id); irAoPasso(id) }}
          tituloDoAdicionar={selecionadoComSaidaLivre ? 'Adicionar logo abaixo do passo selecionado (A)' : 'Adicionar passo (A)'}
          mostrarNumeros={mostrarNumeros}
          onMostrarNumeros={jornada.publishedVersion ? () => setMostrarNumeros((m) => !m) : undefined}
          jornada={jornada}
          versao={versao}
          catalogo={catalogo}
          onConfig={() => onConfigAberta(true)}
          onSimular={() => setSimulando(true)}
          onMudarComIa={() => setMudandoComIa(true)}
          onVersoes={() => setVersoesAbertas(true)}
        />


        {vazio && !somenteLeitura && (
          <ComecoDoDesenho
            catalogo={catalogo}
            onEscolher={(type) => inserirPasso(type, { tipo: 'saida', origem: ID_DA_ENTRADA, saida: 'next' })}
            onVerTodos={(e) => acoesDoCanvas.abrirSeletor({ tipo: 'saida', origem: ID_DA_ENTRADA, saida: 'next' }, { x: e.clientX, y: e.clientY })}
          />
        )}

        {!encaixado && paineis}
      </div>
      {encaixado && (
        <AnimatePresence>
          {(gavetaAberta || seletor) && (
            <PainelEncaixado key="painel" largura={larguraDoPainel} extra={gavetaComCelular ? LARGURA_DO_CELULAR : 0} onLargura={setLarguraDoPainel} onSoltar={() => setLarguraAjustada((n) => n + 1)}>
              {paineis}
            </PainelEncaixado>
          )}
        </AnimatePresence>
      )}
      </div>

      <ConfiguracoesDaJornada
        open={configAberta}
        apoio={apoio}
        onJornadaMudou={onJornadaMudou}
        onClose={() => onConfigAberta(false)}
        jornada={jornada}
        versao={versao}
        catalogo={catalogo}
        nome={nome}
        descricao={descricao}
        onMudarVersao={(v) => aplicar(v)}
        onMudarNome={(n, d) => { setNome(n); setDescricao(d); setSalvamento('pendente') }}
        somenteLeitura={somenteLeitura}
      />
      <TestarJornada
        open={testando}
        jornadaId={jornada.id}
        onClose={() => { setTestando(false); setTeste(null) }}
        versao={versao}
        catalogo={catalogo}
        apoio={apoio}
        onEstado={setTeste}
        onIrAoPasso={irAoPasso}
      />
      <SimularJornada open={simulando} onClose={() => setSimulando(false)} jornadaId={jornada.id} versao={versao} apoio={apoio} />
      <MudarComIa
        open={mudandoComIa}
        onClose={() => setMudandoComIa(false)}
        jornadaId={jornada.id}
        versao={versao}
        catalogo={catalogo}
        onAplicar={(nova) => {
          setMudandoComIa(false)
          aplicar(nova)
          // Os passos novos entram no lugar certo; Ctrl+Z volta tudo.
          setTimeout(() => arrumar(false), 60)
          toast('A mudança foi para o rascunho. Ctrl+Z desfaz.', 'success')
        }}
      />
      <QuemEstaNoPasso
        open={!!quemEsta}
        onClose={() => setQuemEsta(null)}
        jornadaId={jornada.id}
        nodeId={quemEsta}
        nomeDoPasso={quemEsta && versao.graph.nodes[quemEsta] ? nomeDoNo(versao.graph.nodes[quemEsta], catalogo) : ''}
        esperaResposta={!!quemEsta && ['wait_event', 'send_and_wait', 'ask_question'].includes(versao.graph.nodes[quemEsta]?.type ?? '')}
        onAbrirEmPessoas={onAbrirPessoas ? (id) => { setQuemEsta(null); onAbrirPessoas(id) } : undefined}
      />
      <PublicarJornada
        open={publicacao !== null}
        acao={publicacao?.acao ?? 'publicar'}
        modoInicial={publicacao?.modo}
        notaInicial={publicacao?.nota}
        onClose={() => setPublicacao(null)}
        jornada={jornada}
        erros={erros.length}
        mudancas={mudancas}
        onVerMudancas={() => { setPublicacao(null); setSelecionado(null); setVerMudancas(true) }}
        conferencia={problemas.length > 0 ? <ListaDeProblemas problemas={problemas} onIrAoPasso={(id) => { setPublicacao(null); setSelecionado(id); irAoPasso(id) }} /> : undefined}
        salvarAntes={salvarAgora}
        onPronto={(j) => { onJornadaMudou(j); setPublicacao(null) }}
      />
      <VersoesDaJornada open={versoesAbertas} onClose={() => setVersoesAbertas(false)} jornada={jornada} somenteLeitura={somenteLeitura} onPronto={(j) => onJornadaMudou(j)}
        onVerNoDesenho={onVerVersao && !versaoAntiga ? (v) => { setVersoesAbertas(false); onVerVersao(v) } : undefined}
        onRascunhoRestaurado={(j) => {
          // O desenho da versão vira o rascunho: o editor troca o que está na tela.
          onJornadaMudou(j)
          versaoRef.current = j.draft
          setVersao(j.draft)
          setPassado([])
          setFuturo([])
          setSalvamento('salvo')
          setVersoesAbertas(false)
        }} />
      <PausarJornada
        open={pausando}
        jornada={jornada}
        onClose={() => setPausando(false)}
        onPronto={(j) => {
          onJornadaMudou(j)
          setPausando(false)
          toast(j.pauseMode === 'hold' ? 'Jornada pausada. Quem está dentro ficou parado até retomar.' : j.pauseMode === 'exit' ? 'Jornada pausada e todos saíram.' : 'Jornada pausada. Ninguém novo entra; quem está dentro termina o caminho.', 'success')
        }}
      />
    </ContextoDoCanvas.Provider>
    </ProvedorDoSistema>
    </MotionConfig>
  )
}

/** Encaixado, o painel ocupa a vaga inteira, sem moldura própria (a vaga tem a borda). */
const CLASSE_ENCAIXADA = 'inset-0 w-full max-w-none rounded-none border-0 shadow-none'

function EstadoDoSalvamento({ estado }: { estado: 'salvo' | 'pendente' | 'salvando' | 'erro' | 'leitura' }) {
  if (estado === 'leitura') return <span className="jornadas-surgir text-[12px] text-surface-400">Só leitura</span>
  if (estado === 'erro') return <span className="jornadas-surgir inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-danger)]" aria-live="polite" title="Não foi possível salvar o rascunho"><CloudAlert className="w-4 h-4" aria-hidden />Não salvou</span>
  // 16/11: o rascunho se salva sozinho, então "Salvo" parado não diz nada (como no Notion). Só aparece o que pede atenção.
  if (estado === 'salvo') return null
  return <span className="jornadas-surgir inline-flex items-center text-surface-500" aria-live="polite" title="Salvando o rascunho…"><LoaderCircle className="w-4 h-4 animate-spin" aria-hidden /><span className="sr-only">Salvando…</span></span>
}

/** Desenho vazio: como os builders de mercado, o começo fica no próprio canvas (os primeiros passos mais comuns). */
const PRIMEIROS_PASSOS = ['send_template', 'wait', 'branch', 'connector_call']

function ComecoDoDesenho({ catalogo, onEscolher, onVerTodos }: { catalogo: Catalogo; onEscolher: (type: string) => void; onVerTodos: (e: React.MouseEvent) => void }) {
  const passos = PRIMEIROS_PASSOS.map((t) => passoDoCatalogo(catalogo, t)).filter((p): p is NonNullable<typeof p> => !!p && p.availability === 'available')
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-4">
      <div className="jornadas-aparecer pointer-events-auto w-full max-w-[560px] rounded-[14px] border border-surface-700 bg-[var(--jt-moldura)] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
        <p className="text-[16px] font-semibold text-surface-50">Qual é o primeiro passo?</p>
        <p className="mt-0.5 text-[12px] text-surface-400">Entra logo depois da Entrada, já ligado. Dá para trocar depois.</p>
        <div className="mt-3 grid grid-cols-2 gap-1">
          {passos.map((p) => (
            <button key={p.type} type="button" onClick={() => onEscolher(p.type)} title={p.description}
              className="flex items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors cursor-pointer hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <IconeDoPasso tipo={p.type} grupo={p.group} />
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-surface-50">{p.label}</span>
                <span className="block truncate text-[12px] text-surface-400">{p.description}</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onVerTodos} className="mt-2 inline-flex items-center gap-1 px-2.5 text-[14px] font-medium jt-texto-azul hover:underline cursor-pointer">
          Ver todos os passos<ChevronRight className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
