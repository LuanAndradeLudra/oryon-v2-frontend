import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background, BackgroundVariant, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useNodesInitialized, useReactFlow,
  type Connection, type Edge, type EdgeChange, type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CircleAlert, CircleCheck, CloudAlert, CloudCheck, FlaskConical, Gauge, LoaderCircle, MousePointerClick, PanelRightClose, PanelRightOpen, Pause, Play, Rocket, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { passoDoCatalogo, saidasDoNo } from '@/services/jornadas/catalogo'
import { haSobreposicao, ID_DA_ENTRADA, organizar, type Medida } from '@/services/jornadas/layout'
import { validarDesenho } from '@/services/jornadas/validar'
import type { EstadoDoTeste } from '@/services/jornadas/simulador'
import type { ApoioDoEditor, Catalogo, Jornada, NoDoGrafo, ResultadosDaJornada, VersaoDaJornada } from '@/services/jornadas/tipos'
import { NoDaEntrada, NoDoPasso, type NoDaEntradaRF, type NoDoPassoRF } from './NosDoCanvas'
import { PainelDoPasso } from './PainelDoPasso'
import { Paleta, TIPO_ARRASTADO } from './Paleta'
import { ControlesDoCanvas } from './ControlesDoCanvas'
import { resumoDaPorta, resumoDaReentrada, resumoDoNo } from './resumo'
import { frasesDasCondicoes } from './condicoes'
import { TestarJornada } from '../TestarJornada'
import { SimularJornada } from '../SimularJornada'
import { PublicarJornada } from '../PublicarJornada'

/**
 * ORY-60 — o canvas livre (decisão 11: React Flow). A fonte da verdade é a
 * `VersaoDaJornada` (o rascunho); os nós e as ligações do React Flow são
 * derivados dela a cada mudança. O rascunho salva sozinho.
 *
 * Estrutura: uma barra fina de ações em cima; abaixo, paleta | canvas | painel.
 * O canvas ocupa todo o espaço que sobra e nunca passa da tela; os controles
 * ficam flutuando no canto, com margem.
 */

interface Props {
  jornada: Jornada
  catalogo: Catalogo
  apoio: ApoioDoEditor
  resultados: ResultadosDaJornada | null
  somenteLeitura: boolean
  onJornadaMudou: (j: Jornada) => void
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
const TIPOS_DE_NO = { passo: NoDoPasso, entrada: NoDaEntrada }
const idDaLigacao = (origem: string, saida: string) => `${origem}::${saida}`
/** Tamanho estimado de um cartão ainda não medido (passo novo). */
const TAMANHO_ESTIMADO = { w: 260, h: 110 }

function paramsPadrao(type: string, catalogo: Catalogo): Record<string, unknown> {
  const passo = passoDoCatalogo(catalogo, type)
  const params: Record<string, unknown> = {}
  for (const c of passo?.params ?? []) if (c.default !== undefined) params[c.key] = c.default
  if (type === 'wait_event') params.events = [{ key: 'respondeu', label: 'Respondeu', event: 'message.received' }]
  if (type === 'branch') params.branches = [{ key: 'ramo_1', label: 'Ramo 1', group: { mode: 'all', conditions: [{ field: catalogo.conditionFields[0].key, op: 'eq', value: '' }] } }]
  if (type === 'ai_classify') params.categories = [{ key: 'confirmar', label: 'Quer confirmar' }, { key: 'cancelar', label: 'Quer cancelar' }]
  return params
}

function Editor({ jornada, catalogo, apoio, resultados, somenteLeitura, onJornadaMudou }: Props) {
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()
  const rf = useReactFlow()
  const nosMedidos = useNodesInitialized()
  const areaRef = useRef<HTMLDivElement>(null)
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
  const [publicacao, setPublicacao] = useState<'publicar' | 'retomar' | null>(null)
  const [pausando, setPausando] = useState(false)
  const [painelAberto, setPainelAberto] = useState(!somenteLeitura)
  const [mapa, setMapa] = useState(false)
  /** Tamanho real de cada cartão (o React Flow mede e avisa; nós controlados guardam aqui). */
  const [medidas, setMedidas] = useState<Record<string, { width: number; height: number }>>({})
  const versaoRef = useRef(versao)
  useEffect(() => { versaoRef.current = versao }, [versao])

  const problemas = useMemo(() => validarDesenho(versao, catalogo, apoio), [versao, catalogo, apoio])
  const erros = problemas.filter((p) => p.severity === 'error')
  const avisos = problemas.filter((p) => p.severity === 'warning')

  // ── histórico (desfazer/refazer) ─────────────────────────────────────────
  const aplicar = useCallback((nova: VersaoDaJornada, registrar = true) => {
    if (somenteLeitura) return
    if (registrar) {
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
      versaoRef.current = p[p.length - 1]
      setVersao(p[p.length - 1])
      setSalvamento('pendente')
      return p.slice(0, -1)
    })
  }, [])
  const refazer = useCallback(() => {
    setFuturo((f) => {
      if (!f.length) return f
      setPassado((p) => [...p, versaoRef.current])
      versaoRef.current = f[0]
      setVersao(f[0])
      setSalvamento('pendente')
      return f.slice(1)
    })
  }, [])

  useEffect(() => {
    if (somenteLeitura) return
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) refazer(); else desfazer() }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); refazer() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desfazer, refazer, somenteLeitura])

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
    const zoomQueCabe = Math.min((width - 96) / Math.max(b.width, 1), (height - 112) / Math.max(b.height, 1))
    const zoom = Math.max(0.75, Math.min(1, zoomQueCabe))
    rf.setViewport({ x: width / 2 - (b.x + b.width / 2) * zoom, y: 40 - b.y * zoom, zoom })
  }, [rf])

  const arrumar = useCallback((registrar = true) => {
    const v = versaoRef.current
    const layout = organizar(v.graph, medida)
    if (registrar) aplicar({ ...v, graph: { ...v.graph, layout } })
    else {
      const nova = { ...v, graph: { ...v.graph, layout } }
      versaoRef.current = nova
      setVersao(nova)
    }
    requestAnimationFrame(() => (registrar ? rf.fitView({ padding: 0.12, maxZoom: 1, duration: 300 }) : enquadrarInicio()))
  }, [aplicar, medida, rf, enquadrarInicio])

  // Primeira vez com os cartões medidos: arruma desenho antigo que se sobrepõe e enquadra.
  const jaEnquadrou = useRef(false)
  useEffect(() => {
    if (!nosMedidos || jaEnquadrou.current) return
    jaEnquadrou.current = true
    const { layout, nodes: nos } = versaoRef.current.graph
    // Falta a posição de algum cartão (desenho novo, receita, desenho antigo) ou eles se encostam: organiza.
    const faltaPosicao = !layout[ID_DA_ENTRADA] || Object.keys(nos).some((id) => !layout[id])
    if (faltaPosicao || haSobreposicao(layout, medida)) arrumar(false)
    else requestAnimationFrame(enquadrarInicio)
  }, [nosMedidos, medida, arrumar, enquadrarInicio, rf])

  const irAoPasso = useCallback((id: string) => {
    const n = rf.getNode(id)
    if (!n) return
    const { w, h } = medida(id)
    rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: Math.max(rf.getZoom(), 0.85), duration: 300 })
  }, [rf, medida])

  // ── mudanças no desenho ──────────────────────────────────────────────────
  const mudarNos = (nodes: Record<string, NoDoGrafo>, extra: Partial<VersaoDaJornada['graph']> = {}, registrar = true) =>
    aplicar({ ...versaoRef.current, graph: { ...versaoRef.current.graph, nodes, ...extra } }, registrar)

  const selecionar = (id: string | null) => {
    setSelecionado(id)
    if (id) setPainelAberto(true)
  }

  const adicionar = (type: string, posicao?: { x: number; y: number }) => {
    if (somenteLeitura) return
    const passo = passoDoCatalogo(catalogo, type)
    if (!passo || passo.availability === 'soon') return
    const v = versaoRef.current
    const id = `n_${Math.random().toString(36).slice(2, 8)}`
    const params = paramsPadrao(type, catalogo)
    const novo: NoDoGrafo = { type, params, outputs: Object.fromEntries(saidasDoNo({ type, params }, catalogo).map((s) => [s.key, null])) }
    const nodes = { ...v.graph.nodes, [id]: novo }
    let start = v.graph.start
    let pos = posicao
    // Clique na paleta: põe abaixo do passo escolhido e liga na primeira saída livre.
    const ancora = selecionado && selecionado !== ID_DA_ENTRADA ? selecionado : null
    if (!pos) {
      const baseId = ancora ?? (selecionado === ID_DA_ENTRADA || !start ? ID_DA_ENTRADA : null)
      const base = baseId ? rf.getNode(baseId) : null
      pos = base
        ? { x: base.position.x + (medida(base.id).w - TAMANHO_ESTIMADO.w) / 2, y: base.position.y + medida(base.id).h + 72 }
        : { x: 0, y: 240 + Object.keys(v.graph.nodes).length * 40 }
      if (ancora) {
        const livre = saidasDoNo(v.graph.nodes[ancora], catalogo).find((s) => !v.graph.nodes[ancora].outputs[s.key])
        if (livre) nodes[ancora] = { ...v.graph.nodes[ancora], outputs: { ...v.graph.nodes[ancora].outputs, [livre.key]: id } }
      } else if (!start) {
        start = id
      }
    }
    aplicar({ ...v, graph: { ...v.graph, nodes, start, layout: { ...v.graph.layout, [id]: pos } } })
    selecionar(id)
    // Clique na paleta: leva a vista até o passo novo (pode ter nascido fora da tela).
    if (!posicao) {
      const alvo = pos
      requestAnimationFrame(() => rf.setCenter(alvo.x + TAMANHO_ESTIMADO.w / 2, alvo.y + TAMANHO_ESTIMADO.h / 2, { zoom: Math.max(Math.min(rf.getZoom(), 1), 0.8), duration: 250 }))
    }
  }

  const apagar = (id: string) => {
    if (id === ID_DA_ENTRADA || somenteLeitura) return
    const v = versaoRef.current
    const nodes: Record<string, NoDoGrafo> = {}
    for (const [k, n] of Object.entries(v.graph.nodes)) {
      if (k === id) continue
      nodes[k] = { ...n, outputs: Object.fromEntries(Object.entries(n.outputs).map(([s, d]) => [s, d === id ? null : d])) }
    }
    const layout = { ...v.graph.layout }
    delete layout[id]
    aplicar({ ...v, graph: { ...v.graph, nodes, layout, start: v.graph.start === id ? null : v.graph.start } })
    if (selecionado === id) setSelecionado(null)
  }

  const duplicar = (id: string) => {
    const v = versaoRef.current
    const original = v.graph.nodes[id]
    if (!original) return
    const novoId = `n_${Math.random().toString(36).slice(2, 8)}`
    const copia: NoDoGrafo = { ...JSON.parse(JSON.stringify(original)), outputs: Object.fromEntries(Object.keys(original.outputs).map((k) => [k, null])) }
    const p = v.graph.layout[id] ?? rf.getNode(id)?.position ?? { x: 0, y: 0 }
    aplicar({ ...v, graph: { ...v.graph, nodes: { ...v.graph.nodes, [novoId]: copia }, layout: { ...v.graph.layout, [novoId]: { x: p.x + 48, y: p.y + 48 } } } })
    selecionar(novoId)
  }

  // ── nós e ligações do React Flow (derivados) ─────────────────────────────
  const contadores = useMemo(() => new Map((resultados?.byNode ?? []).map((b) => [b.nodeId, b])), [resultados])
  const caminho = useMemo(() => new Set(teste?.caminho ?? []), [teste])

  const nodes = useMemo<(NoDoPassoRF | NoDaEntradaRF)[]>(() => {
    const errosPorNo = new Map<string, number>()
    for (const p of problemas) if (p.severity === 'error' && p.nodeId) errosPorNo.set(p.nodeId, (errosPorNo.get(p.nodeId) ?? 0) + 1)
    const entrada: NoDaEntradaRF = {
      id: ID_DA_ENTRADA,
      type: 'entrada',
      position: versao.graph.layout[ID_DA_ENTRADA] ?? { x: -150, y: 0 },
      selected: selecionado === ID_DA_ENTRADA,
      measured: medidas[ID_DA_ENTRADA],
      deletable: false,
      draggable: !somenteLeitura,
      data: {
        portas: versao.entry.doors.map((d) => resumoDaPorta(d, catalogo)),
        filtro: frasesDasCondicoes(versao.entry.criteria, catalogo),
        reentrada: resumoDaReentrada(versao.entry),
        erros: problemas.filter((p) => p.code === 'no_door' || p.code === 'no_start').length,
        noCaminhoDoTeste: !!teste,
      },
    }
    const passos: NoDoPassoRF[] = Object.entries(versao.graph.nodes).map(([id, no]) => {
      const passo = passoDoCatalogo(catalogo, no.type)
      const c = contadores.get(id)
      return {
        id,
        type: 'passo',
        position: versao.graph.layout[id] ?? { x: 0, y: 0 },
        selected: selecionado === id,
        measured: medidas[id],
        draggable: !somenteLeitura,
        data: {
          titulo: no.label || passo?.label || no.type,
          resumo: resumoDoNo(no, catalogo, apoio),
          icone: passo?.icon ?? 'Workflow',
          grupo: passo?.group ?? 'controle',
          saidas: saidasDoNo(no, catalogo),
          erros: errosPorNo.get(id) ?? 0,
          custo: passo && passo.cost.credits > 0 ? passo.cost.label : null,
          contador: c && jornada.publishedVersion && !teste ? { now: c.now, reached: c.reached } : null,
          noCaminhoDoTeste: caminho.has(id),
          atualNoTeste: teste?.noAtual === id && !teste.terminou,
          emBreve: passo?.availability === 'soon',
        },
      }
    })
    return [entrada, ...passos]
  }, [versao, selecionado, medidas, problemas, catalogo, apoio, contadores, caminho, teste, somenteLeitura, jornada.publishedVersion])

  const edges = useMemo<Edge[]>(() => {
    const lista: Edge[] = []
    const cor = 'var(--color-surface-500)'
    const destaque = 'var(--color-accent-violet)'
    const seta = (c: string) => ({ type: MarkerType.ArrowClosed, color: c, width: 16, height: 16 })
    const ligar = (id: string, source: string, sourceHandle: string, target: string, noTeste: boolean) => {
      const c = noTeste ? destaque : ligacaoEscolhida === id ? 'var(--color-brand-500, #2DD4BF)' : cor
      lista.push({
        id, source, sourceHandle, target, type: 'smoothstep', selected: ligacaoEscolhida === id,
        pathOptions: { borderRadius: 14, offset: 22 },
        animated: noTeste && teste?.noAtual === target && !teste.terminou,
        markerEnd: seta(c),
        style: { stroke: c, strokeWidth: noTeste || ligacaoEscolhida === id ? 2 : 1.5 },
      } as Edge)
    }
    if (versao.graph.start) ligar(idDaLigacao(ID_DA_ENTRADA, 'next'), ID_DA_ENTRADA, 'next', versao.graph.start, !!teste && caminho.has(versao.graph.start))
    for (const [origem, no] of Object.entries(versao.graph.nodes)) {
      for (const [saida, destino] of Object.entries(no.outputs)) {
        if (!destino || !versao.graph.nodes[destino]) continue
        ligar(idDaLigacao(origem, saida), origem, saida, destino, caminho.has(origem) && caminho.has(destino))
      }
    }
    return lista
  }, [versao, ligacaoEscolhida, caminho, teste])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    let layout: VersaoDaJornada['graph']['layout'] | null = null
    let novasMedidas: Record<string, { width: number; height: number }> | null = null
    for (const ch of changes) {
      if (ch.type === 'dimensions' && ch.dimensions) {
        novasMedidas = novasMedidas ?? {}
        novasMedidas[ch.id] = ch.dimensions
      } else if (ch.type === 'position' && ch.position) {
        layout = layout ?? { ...versaoRef.current.graph.layout }
        layout[ch.id] = ch.position
      } else if (ch.type === 'select') {
        if (ch.selected) { setSelecionado(ch.id); setPainelAberto(true); setLigacaoEscolhida(null) }
        else setSelecionado((s) => (s === ch.id ? null : s))
      } else if (ch.type === 'remove') {
        apagar(ch.id)
      }
    }
    if (novasMedidas) {
      const n = novasMedidas
      setMedidas((m) => ({ ...m, ...n }))
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
    adicionar(type, { x: p.x - TAMANHO_ESTIMADO.w / 2, y: p.y - 30 })
  }

  const pausar = async () => {
    try {
      onJornadaMudou(await jornadasApi.pausar(jornada.id))
      toast('Jornada pausada. Ninguém novo entra; quem está dentro continua.', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível pausar.', 'error')
    } finally {
      setPausando(false)
    }
  }

  const vazio = Object.keys(versao.graph.nodes).length === 0

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Barra de ações: uma linha só, sem quebrar. */}
      <div className="shrink-0 flex items-center gap-3 h-12 border-b border-surface-700 bg-surface-900 px-4">
        <EstadoDoSalvamento estado={somenteLeitura ? 'leitura' : salvamento} />
        <span className="h-4 w-px bg-surface-700" aria-hidden />
        <button
          type="button"
          onClick={() => { setSelecionado(null); setPainelAberto(true) }}
          className={cn(
            'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[7px] text-[12px] font-semibold transition-colors cursor-pointer',
            erros.length
              ? 'text-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface-800))] hover:bg-[color-mix(in_srgb,var(--color-danger)_18%,var(--color-surface-800))]'
              : avisos.length ? 'text-surface-200 bg-surface-800 hover:bg-[var(--rowhover)]' : 'text-surface-300 hover:bg-[var(--rowhover)]',
          )}
          title="Ver a conferência do desenho"
        >
          {erros.length ? <CircleAlert className="w-3.5 h-3.5" aria-hidden /> : avisos.length ? <TriangleAlert className="w-3.5 h-3.5 text-status-pending" aria-hidden /> : <CircleCheck className="w-3.5 h-3.5 text-status-active" aria-hidden />}
          {erros.length ? `${erros.length} ${erros.length === 1 ? 'problema' : 'problemas'} para publicar` : avisos.length ? `${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}` : 'Pronta para publicar'}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" leftIcon={<FlaskConical className="w-4 h-4" />} onClick={() => setTestando(true)}>Testar</Button>
          <Button variant="ghost" size="sm" leftIcon={<Gauge className="w-4 h-4" />} onClick={() => setSimulando(true)}>Simular</Button>
          {!somenteLeitura && (jornada.status === 'active' || jornada.status === 'shadow') && (
            <Button variant="secondary" size="sm" leftIcon={<Pause className="w-4 h-4" />} onClick={() => setPausando(true)}>Pausar</Button>
          )}
          {!somenteLeitura && jornada.status === 'paused' && (
            <Button variant="secondary" size="sm" leftIcon={<Play className="w-4 h-4" />} onClick={() => setPublicacao('retomar')}>Retomar</Button>
          )}
          {!somenteLeitura && (
            <Button size="sm" leftIcon={<Rocket className="w-4 h-4" />} onClick={() => setPublicacao('publicar')}>
              {jornada.publishedVersion ? 'Publicar mudanças' : 'Publicar'}
            </Button>
          )}
          {!somenteLeitura && (
            <>
              <span className="h-4 w-px bg-surface-700" aria-hidden />
              <Button variant="ghost" size="sm" iconOnly aria-label={painelAberto ? 'Esconder o painel' : 'Mostrar o painel'} title={painelAberto ? 'Esconder o painel' : 'Mostrar o painel'} onClick={() => setPainelAberto((a) => !a)}>
                {painelAberto ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {!somenteLeitura && <Paleta catalogo={catalogo} onAdicionar={(t) => adicionar(t)} />}
        <div ref={areaRef} className="relative flex-1 min-w-0" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={TIPOS_DE_NO}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={() => !somenteLeitura && setPassado((p) => [...p.slice(-LIMITE_DO_HISTORICO + 1), versaoRef.current])}
            onPaneClick={() => { setSelecionado(null); setLigacaoEscolhida(null) }}
            isValidConnection={(c) => c.source !== c.target && c.target !== ID_DA_ENTRADA}
            nodesConnectable={!somenteLeitura}
            deleteKeyCode={somenteLeitura ? null : ['Backspace', 'Delete']}
            colorMode={resolvedTheme}
            minZoom={0.25}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            style={{ background: 'var(--color-surface-950)' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="var(--color-surface-700)" />
            {mapa && (
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                nodeBorderRadius={8}
                className="!m-4 !rounded-[10px] !border !border-surface-700 overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.28)]"
                bgColor={resolvedTheme === 'light' ? '#FFFFFF' : '#0E1414'}
                nodeColor={resolvedTheme === 'light' ? '#C9CFDA' : '#3A5050'}
                maskColor={resolvedTheme === 'light' ? 'rgba(244,246,249,0.7)' : 'rgba(6,9,9,0.6)'}
              />
            )}
          </ReactFlow>
          <ControlesDoCanvas
            somenteLeitura={somenteLeitura}
            podeDesfazer={passado.length > 0}
            podeRefazer={futuro.length > 0}
            onDesfazer={desfazer}
            onRefazer={refazer}
            onOrganizar={() => arrumar(true)}
            mapa={mapa}
            onMapa={() => setMapa((m) => !m)}
          />
          {vazio && !somenteLeitura && (
            <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center">
              <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-surface-600 bg-surface-900 px-4 py-2.5 text-[13px] text-surface-300">
                <MousePointerClick className="w-4 h-4 text-surface-400" aria-hidden />
                Arraste um passo da paleta até o canvas, ou clique nele para ligar à Entrada.
              </div>
            </div>
          )}
        </div>
        {((!somenteLeitura && painelAberto) || (somenteLeitura && selecionado)) && (
          <PainelDoPasso
            className={somenteLeitura ? 'absolute right-0 top-0 bottom-0 z-10 w-full max-w-[360px] shadow-lg' : undefined}
            jornada={jornada}
            versao={versao}
            selecionado={selecionado}
            catalogo={catalogo}
            apoio={apoio}
            problemas={problemas}
            nome={nome}
            descricao={descricao}
            onMudarVersao={(v) => aplicar(v)}
            onMudarNome={(n, d) => { setNome(n); setDescricao(d); setSalvamento('pendente') }}
            onApagar={apagar}
            onDuplicar={duplicar}
            onIrAoPasso={(id) => { selecionar(id); irAoPasso(id) }}
            onFechar={() => setSelecionado(null)}
            somenteLeitura={somenteLeitura}
          />
        )}
      </div>

      <TestarJornada
        open={testando}
        onClose={() => { setTestando(false); setTeste(null) }}
        versao={versao}
        catalogo={catalogo}
        apoio={apoio}
        onEstado={setTeste}
        onIrAoPasso={irAoPasso}
      />
      <SimularJornada open={simulando} onClose={() => setSimulando(false)} jornadaId={jornada.id} versao={versao} apoio={apoio} />
      <PublicarJornada
        open={publicacao !== null}
        acao={publicacao ?? 'publicar'}
        onClose={() => setPublicacao(null)}
        jornada={jornada}
        erros={erros.length}
        salvarAntes={salvarAgora}
        onPronto={(j) => { onJornadaMudou(j); setPublicacao(null) }}
      />
      <ConfirmModal
        open={pausando}
        onClose={() => setPausando(false)}
        onConfirm={pausar}
        title="Pausar a jornada?"
        description="Ninguém novo entra enquanto estiver pausada. Quem já está dentro continua o caminho. Dá para retomar depois."
        confirmLabel="Pausar"
      />
    </div>
  )
}

function EstadoDoSalvamento({ estado }: { estado: 'salvo' | 'pendente' | 'salvando' | 'erro' | 'leitura' }) {
  if (estado === 'leitura') return <span className="text-[12px] text-surface-400">Só leitura no celular</span>
  if (estado === 'erro') return <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-danger)]" aria-live="polite"><CloudAlert className="w-4 h-4" aria-hidden />Não foi possível salvar</span>
  if (estado === 'salvo') return <span className="inline-flex items-center gap-1.5 text-[12px] text-surface-400" aria-live="polite"><CloudCheck className="w-4 h-4" aria-hidden />Rascunho salvo</span>
  return <span className="inline-flex items-center gap-1.5 text-[12px] text-surface-400" aria-live="polite"><LoaderCircle className="w-4 h-4 animate-spin" aria-hidden />Salvando…</span>
}
