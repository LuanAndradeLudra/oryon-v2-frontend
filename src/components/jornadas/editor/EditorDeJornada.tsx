import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow,
  type Connection, type Edge, type EdgeChange, type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CircleAlert, FlaskConical, Gauge, LayoutGrid, Pause, Play, Redo2, Rocket, TriangleAlert, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { passoDoCatalogo, saidasDoNo } from '@/services/jornadas/catalogo'
import { ID_DA_ENTRADA, organizar, Y_DA_ENTRADA } from '@/services/jornadas/layout'
import { validarDesenho } from '@/services/jornadas/validar'
import type { EstadoDoTeste } from '@/services/jornadas/simulador'
import type { ApoioDoEditor, Catalogo, Jornada, NoDoGrafo, ResultadosDaJornada, VersaoDaJornada } from '@/services/jornadas/tipos'
import { SeloDoStatus } from '../comum'
import { NoDaEntrada, NoDoPasso, type NoDaEntradaRF, type NoDoPassoRF } from './NosDoCanvas'
import { PainelDoPasso } from './PainelDoPasso'
import { Paleta, TIPO_ARRASTADO } from './Paleta'
import { resumoDaPorta, resumoDaReentrada, resumoDoNo } from './resumo'
import { frasesDasCondicoes } from './condicoes'
import { TestarJornada } from '../TestarJornada'
import { SimularJornada } from '../SimularJornada'
import { PublicarJornada } from '../PublicarJornada'

/**
 * ORY-60 — o canvas livre (decisão 11: React Flow). A fonte da verdade é a
 * `VersaoDaJornada` (o rascunho); os nós e as ligações do React Flow são
 * derivados dela a cada mudança. O rascunho salva sozinho.
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
  const versaoRef = useRef(versao)
  versaoRef.current = versao

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

  // ── mudanças no desenho ──────────────────────────────────────────────────
  const mudarNos = (nodes: Record<string, NoDoGrafo>, extra: Partial<VersaoDaJornada['graph']> = {}, registrar = true) =>
    aplicar({ ...versaoRef.current, graph: { ...versaoRef.current.graph, nodes, ...extra } }, registrar)

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
      const base = ancora ? v.graph.layout[ancora] : selecionado === ID_DA_ENTRADA ? v.graph.layout[ID_DA_ENTRADA] : null
      pos = base ? { x: base.x, y: base.y + 170 } : { x: 360, y: 170 + Object.keys(v.graph.nodes).length * 40 }
      if (ancora) {
        const livre = saidasDoNo(v.graph.nodes[ancora], catalogo).find((s) => !v.graph.nodes[ancora].outputs[s.key])
        if (livre) nodes[ancora] = { ...v.graph.nodes[ancora], outputs: { ...v.graph.nodes[ancora].outputs, [livre.key]: id } }
      } else if (!start) {
        start = id
      }
    }
    aplicar({ ...v, graph: { ...v.graph, nodes, start, layout: { ...v.graph.layout, [id]: pos } } })
    setSelecionado(id)
    // Clique na paleta: leva a vista até o passo novo (pode ter nascido fora da tela).
    if (!posicao) {
      const alvo = pos
      requestAnimationFrame(() => rf.setCenter(alvo.x + 124, alvo.y + 40, { zoom: Math.min(rf.getZoom(), 1), duration: 250 }))
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
    const p = v.graph.layout[id] ?? { x: 0, y: 0 }
    aplicar({ ...v, graph: { ...v.graph, nodes: { ...v.graph.nodes, [novoId]: copia }, layout: { ...v.graph.layout, [novoId]: { x: p.x + 40, y: p.y + 60 } } } })
    setSelecionado(novoId)
  }

  const arrumar = () => {
    const v = versaoRef.current
    aplicar({ ...v, graph: { ...v.graph, layout: organizar(v.graph) } })
    requestAnimationFrame(() => rf.fitView({ padding: 0.15, maxZoom: 1, duration: 300 }))
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
      position: versao.graph.layout[ID_DA_ENTRADA] ?? { x: 334, y: Y_DA_ENTRADA },
      selected: selecionado === ID_DA_ENTRADA,
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
  }, [versao, selecionado, problemas, catalogo, apoio, contadores, caminho, teste, somenteLeitura, jornada.publishedVersion])

  const edges = useMemo<Edge[]>(() => {
    const lista: Edge[] = []
    const cor = 'var(--color-surface-500)'
    const destaque = 'var(--color-accent-violet)'
    if (versao.graph.start) {
      const id = idDaLigacao(ID_DA_ENTRADA, 'next')
      lista.push({ id, source: ID_DA_ENTRADA, sourceHandle: 'next', target: versao.graph.start, type: 'smoothstep', selected: ligacaoEscolhida === id, style: { stroke: teste && caminho.has(versao.graph.start) ? destaque : cor, strokeWidth: 1.5 } })
    }
    for (const [origem, no] of Object.entries(versao.graph.nodes)) {
      for (const [saida, destino] of Object.entries(no.outputs)) {
        if (!destino || !versao.graph.nodes[destino]) continue
        const id = idDaLigacao(origem, saida)
        const noTeste = caminho.has(origem) && caminho.has(destino)
        lista.push({
          id, source: origem, sourceHandle: saida, target: destino, type: 'smoothstep', selected: ligacaoEscolhida === id,
          animated: noTeste && teste?.noAtual === destino && !teste.terminou,
          style: { stroke: noTeste ? destaque : cor, strokeWidth: noTeste ? 2 : 1.5 },
        })
      }
    }
    return lista
  }, [versao, ligacaoEscolhida, caminho, teste])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    let layout: VersaoDaJornada['graph']['layout'] | null = null
    for (const ch of changes) {
      if (ch.type === 'position' && ch.position) {
        layout = layout ?? { ...versaoRef.current.graph.layout }
        layout[ch.id] = ch.position
      } else if (ch.type === 'select') {
        if (ch.selected) { setSelecionado(ch.id); setLigacaoEscolhida(null) }
        else setSelecionado((s) => (s === ch.id ? null : s))
      } else if (ch.type === 'remove') {
        apagar(ch.id)
      }
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
    adicionar(type, { x: p.x - 124, y: p.y - 30 })
  }

  // ── barra do topo ────────────────────────────────────────────────────────
  const metaTexto = versao.goals.goals[0]?.label ?? (Object.values(versao.graph.nodes).find((n) => n.type === 'goal')?.params.label as string | undefined) ?? 'sem meta'
  const creditosPorInscricao = Object.values(versao.graph.nodes).reduce((s, n) => s + (passoDoCatalogo(catalogo, n.type)?.cost.credits ?? 0), 0)
  const versoes = jornada.enrolledByVersion.filter((v) => v.count > 0)

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

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-surface-700 bg-surface-900 px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-400 min-w-0">
          <SeloDoStatus status={jornada.status} />
          {jornada.publishedVersion ? <span>v{jornada.publishedVersion} publicada{versoes.length > 1 ? ` · ${versoes.map((v) => `${v.count} na v${v.version}`).join(' · ')}` : ''}</span> : <span>Nunca publicada</span>}
          <span aria-live="polite" className={cn(salvamento === 'erro' && 'text-[var(--color-danger)]')}>
            {somenteLeitura ? 'Só leitura' : salvamento === 'salvo' ? 'Rascunho salvo' : salvamento === 'erro' ? 'Não salvou: tente de novo' : 'Salvando…'}
          </span>
          <span className="hidden lg:inline">Meta: <strong className="font-semibold text-surface-200">{metaTexto}</strong></span>
          <span className="hidden xl:inline" title="Mensagens da Meta são cobradas à parte, pela tarifa dela.">
            IA por inscrição: <strong className="font-semibold text-surface-200">{creditosPorInscricao ? `${creditosPorInscricao.toLocaleString('pt-BR')} crédito(s)` : 'zero'}</strong>
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelecionado(null)}
            className={cn('inline-flex items-center gap-1 h-7 px-2 rounded-[7px] text-xs font-semibold', erros.length ? 'text-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface-800))]' : 'text-surface-300 bg-surface-800')}
            title="Ver a conferência do desenho"
          >
            {erros.length ? <CircleAlert className="w-3.5 h-3.5" aria-hidden /> : <TriangleAlert className="w-3.5 h-3.5" aria-hidden />}
            {erros.length ? `${erros.length} problema(s)` : avisos.length ? `${avisos.length} aviso(s)` : 'Tudo certo'}
          </button>
          {!somenteLeitura && (
            <>
              <Button variant="ghost" size="sm" iconOnly aria-label="Desfazer (Ctrl+Z)" title="Desfazer (Ctrl+Z)" disabled={!passado.length} onClick={desfazer}><Undo2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" iconOnly aria-label="Refazer (Ctrl+Shift+Z)" title="Refazer" disabled={!futuro.length} onClick={refazer}><Redo2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" leftIcon={<LayoutGrid className="w-4 h-4" />} onClick={arrumar}>Organizar</Button>
            </>
          )}
          <Button variant="secondary" size="sm" leftIcon={<FlaskConical className="w-4 h-4" />} onClick={() => setTestando(true)}>Testar</Button>
          <Button variant="secondary" size="sm" leftIcon={<Gauge className="w-4 h-4" />} onClick={() => setSimulando(true)}>Simular</Button>
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
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0">
        {!somenteLeitura && <Paleta catalogo={catalogo} onAdicionar={(t) => adicionar(t)} />}
        <div className="relative flex-1 min-w-0" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }} onDrop={onDrop}>
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
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            style={{ background: 'var(--color-surface-950)' }}
          >
            <Background gap={22} size={1} color="var(--color-surface-700)" />
            <Controls showInteractive={false} position="bottom-left" />
            {!somenteLeitura && <MiniMap
              pannable
              zoomable
              position="bottom-right"
              nodeBorderRadius={6}
              style={{ width: 168, height: 112 }}
              bgColor={resolvedTheme === 'light' ? '#FFFFFF' : '#0E1414'}
              nodeColor={resolvedTheme === 'light' ? '#C9CFDA' : '#3A5050'}
              maskColor={resolvedTheme === 'light' ? 'rgba(244,246,249,0.65)' : 'rgba(6,9,9,0.6)'}
            />}
          </ReactFlow>
          {Object.keys(versao.graph.nodes).length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-surface-400">
              Arraste um passo da paleta para começar, ou clique nele.
            </div>
          )}
        </div>
        {(!somenteLeitura || selecionado) && <PainelDoPasso
          className={somenteLeitura ? 'absolute right-0 top-0 bottom-0 z-10 w-full max-w-[360px] shadow-lg' : undefined}
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
          onFechar={() => setSelecionado(null)}
          somenteLeitura={somenteLeitura}
        />}
      </div>

      <TestarJornada
        open={testando}
        onClose={() => { setTestando(false); setTeste(null) }}
        versao={versao}
        catalogo={catalogo}
        apoio={apoio}
        onEstado={setTeste}
        onIrAoPasso={(id) => { setSelecionado(id); const p = versao.graph.layout[id]; if (p) rf.setCenter(p.x + 124, p.y + 60, { zoom: 1, duration: 300 }) }}
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

