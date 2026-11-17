import { useMemo, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArchiveRestore, Bot, Briefcase, CircleCheck, Copy, Ellipsis, Gauge, Pause, Plug, Plus, Route, Search, Siren, Sparkles, Tag, Trash2, TriangleAlert, UsersRound, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { useToast } from '@/hooks/useToast'
import { Tabs } from '@/components/ui/Tabs'
import { Tooltip } from '@/components/ui/Tooltip'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { CanalDaJornada, ResumoDaJornada, StatusDaJornada } from '@/services/jornadas/tipos'
import { ROTULO_DO_CANAL } from '@/services/jornadas/canais'
import { TARIFA_MEDIA_DA_META_BRL } from '@/services/jornadas/custos'
import { IconeDoPasso } from '@/components/jornadas/editor/IconeDoPasso'
import { TIPO_DA_PORTA } from '@/components/jornadas/editor/categorias'
import { SaudeDasJornadas } from '@/components/jornadas/SaudeDasJornadas'
import { ConexoesDasJornadas } from '@/components/jornadas/ConexoesDasJornadas'
import { SeloDoStatus } from '@/components/jornadas/comum'
import { numero, quandoFoi, useCarregar } from '@/components/jornadas/apoio'
import { GaleriaDeReceitas } from '@/components/jornadas/GaleriaDeReceitas'
import '@/components/jornadas/jornadas.css'

/**
 * ORY-60 — Jornadas (no lugar do módulo de Automações): a lista, em tabela com
 * colunas alinhadas e um cabeçalho só, e a galeria de receitas.
 *
 * P1 do benchmark (16/11), como HubSpot, Customer.io e Braze: busca e ordenação,
 * as visões "Precisa de atenção", "Sem uso há 90 dias" e "Apagadas" (lixeira de
 * 90 dias, com restaurar), etiquetas, "Duplicar" na própria linha e ações em
 * massa (pausar, etiquetar, apagar).
 *
 * P2 (16/11): a porta, os canais e "editada por … há …" em cada linha; o custo
 * do mês em R$ com a conta no balão; o alerta e o erro abrem direto no
 * problema; as abas "Saúde" (o semáforo de todas, como a HubSpot) e
 * "Conexões" (eventos e linhas que ligam uma jornada à outra).
 */

type Filtro = 'todas' | 'active' | 'shadow' | 'draft' | 'paused'
type Visao = 'nenhuma' | 'atencao' | 'sem_uso' | 'apagadas'
type Ordem = 'recentes' | 'nome' | 'dentro' | 'atividade'
type Aba = 'minhas' | 'saude' | 'conexoes' | 'receitas'

/** As colunas da tabela (cabeçalho e linhas usam a mesma grade). */
const GRADE = 'md:grid md:grid-cols-[20px_minmax(0,1fr)_96px_96px_136px_128px_104px_32px] md:items-center md:gap-x-5'
const NOVENTA_DIAS = 90 * 86_400_000

const alertasAbertos = (j: ResumoDaJornada) => (j.alerts ?? []).filter((a) => !a.snoozedUntil || Date.parse(a.snoozedUntil) < Date.now())
const precisaDeAtencao = (j: ResumoDaJornada) => alertasAbertos(j).length > 0 || j.errors24h > 0
const semUso = (j: ResumoDaJornada) => j.status !== 'draft' && (!j.lastActivityAt || Date.now() - Date.parse(j.lastActivityAt) > NOVENTA_DIAS)
const sem = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function JornadasPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [aba, setAba] = useState<Aba>('minhas')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [visao, setVisao] = useState<Visao>('nenhuma')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [busca, setBusca] = useState('')
  const [etiqueta, setEtiqueta] = useState<string | null>(null)
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [etiquetando, setEtiquetando] = useState<string[] | null>(null)
  const [gateAberto, setGateAberto] = useState(false)
  const { dados: jornadas, erro, recarregar } = useCarregar(() => jornadasApi.listar(), [])
  const { dados: apagadas, recarregar: recarregarApagadas } = useCarregar(() => jornadasApi.listar({ apagadas: true }), [])
  const { dados: limites } = useCarregar(() => jornadasApi.limites(), [])
  const recarregarTudo = () => { void recarregar(); void recarregarApagadas(); setMarcadas(new Set()) }

  const base = visao === 'apagadas' ? apagadas : jornadas
  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: jornadas?.length ?? 0 }
    for (const j of jornadas ?? []) c[j.status] = (c[j.status] ?? 0) + 1
    return c
  }, [jornadas])
  const todasEtiquetas = useMemo(() => [...new Set((jornadas ?? []).flatMap((j) => j.labels ?? []))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [jornadas])
  const visiveis = useMemo(() => {
    const b = sem(busca.trim())
    const lista = (base ?? []).filter((j) =>
      (visao === 'apagadas' || filtro === 'todas' || j.status === filtro)
      && (visao !== 'atencao' || precisaDeAtencao(j))
      && (visao !== 'sem_uso' || semUso(j))
      && (!etiqueta || (j.labels ?? []).includes(etiqueta))
      && (!b || sem(j.name).includes(b) || sem(j.description).includes(b) || (j.labels ?? []).some((l) => sem(l).includes(b))))
    const quando = (x: string | null | undefined) => (x ? Date.parse(x) : 0)
    return [...lista].sort((a, b2) =>
      ordem === 'nome' ? a.name.localeCompare(b2.name, 'pt-BR')
        : ordem === 'dentro' ? b2.enrolledNow - a.enrolledNow
          : ordem === 'atividade' ? quando(b2.lastActivityAt) - quando(a.lastActivityAt)
            : quando(b2.updatedAt) - quando(a.updatedAt))
  }, [base, busca, filtro, visao, etiqueta, ordem])
  const marcadasVisiveis = visiveis.filter((j) => marcadas.has(j.id))
  const comFiltro = !!(busca.trim() || etiqueta || visao !== 'nenhuma' || filtro !== 'todas')

  const duplicar = async (j: ResumoDaJornada) => {
    try {
      const nova = await jornadasApi.duplicar(j.id)
      toast(`"${nova.name}" criada como rascunho.`, 'success')
      navigate(`/jornadas/${nova.id}`)
    } catch (e) { toast(e instanceof Error ? e.message : 'Não deu para duplicar.', 'error') }
  }
  const apagar = async (ids: string[]) => {
    try {
      const r = await jornadasApi.apagar(ids)
      if (r.deleted) toast(`${r.deleted === 1 ? '1 jornada foi' : `${r.deleted} jornadas foram`} para a lixeira. Dá para restaurar por 90 dias.`, 'success')
      for (const b of r.blocked) toast(b.reason, 'error')
      recarregarTudo()
    } catch (e) { toast(e instanceof Error ? e.message : 'Não deu para apagar.', 'error') }
  }
  const restaurar = async (j: ResumoDaJornada) => {
    try { await jornadasApi.restaurar(j.id); toast(`"${j.name}" voltou para a lista.`, 'success'); recarregarTudo() }
    catch (e) { toast(e instanceof Error ? e.message : 'Não deu para restaurar.', 'error') }
  }
  const pausarVarias = async (ids: string[]) => {
    const rodando = (jornadas ?? []).filter((j) => ids.includes(j.id) && (j.status === 'active' || j.status === 'shadow'))
    for (const j of rodando) await jornadasApi.pausar(j.id, { inFlight: 'continue' })
    toast(rodando.length ? `${rodando.length === 1 ? '1 jornada pausada' : `${rodando.length} jornadas pausadas`}. Quem está dentro termina o caminho.` : 'Nenhuma das escolhidas estava rodando.', rodando.length ? 'success' : 'info')
    recarregarTudo()
  }

  return (
    <div className="flex flex-col h-full w-full bg-surface-950 overflow-y-auto">
      {isMobile && <MobilePageHeader title="Jornadas" />}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-8 pt-5 md:pt-7 pb-10 space-y-5 min-w-0">
        {/* O título "Jornadas" já está na barra do topo do app, como nas outras telas. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="min-w-0 max-w-[680px] text-[14px] leading-relaxed text-surface-400">
            Automações em etapas: mandar, esperar a resposta, decidir, avisar alguém e parar quando o objetivo for atingido.
          </p>
          <Button leftIcon={<Plus className="w-4 h-4" aria-hidden />} onClick={() => (isMobile ? setGateAberto(true) : setAba('receitas'))}>
            Nova jornada
          </Button>
        </div>

        <Tabs
          label="Jornadas"
          value={aba}
          onChange={setAba}
          tabs={[
            { id: 'minhas', label: 'Minhas jornadas', count: jornadas?.length },
            { id: 'saude', label: 'Saúde', count: jornadas ? jornadas.filter(precisaDeAtencao).length || undefined : undefined },
            { id: 'conexoes', label: 'Conexões' },
            { id: 'receitas', label: 'Nova: em branco ou por uma receita' },
          ]}
        />

        <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait" initial={false}>
        <motion.div key={aba} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
        {aba === 'saude' ? <SaudeDasJornadas /> : aba === 'conexoes' ? <ConexoesDasJornadas /> : aba === 'receitas' ? (
          isMobile ? (
            <p className="text-sm text-surface-400">No celular, as jornadas são só para acompanhar. Monte no computador.</p>
          ) : (
            <GaleriaDeReceitas />
          )
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-[260px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" aria-hidden />
                <Input size="sm" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, descrição ou etiqueta" aria-label="Buscar jornada" />
              </div>
              {visao !== 'apagadas' && (
                <SegmentedControl
                  label="Filtrar jornadas"
                  value={filtro}
                  onChange={setFiltro}
                  options={[
                    { value: 'todas', label: 'Todas', count: contagem.todas },
                    { value: 'active', label: 'Ativas', count: contagem.active ?? 0 },
                    { value: 'shadow', label: 'Em sombra', count: contagem.shadow ?? 0 },
                    { value: 'draft', label: 'Rascunhos', count: contagem.draft ?? 0 },
                    { value: 'paused', label: 'Pausadas', count: contagem.paused ?? 0 },
                  ]}
                />
              )}
              <span className="flex-1" />
              <Select size="sm" className="w-auto" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
                <option value="recentes">Editadas por último</option>
                <option value="atividade">Com atividade recente</option>
                <option value="dentro">Mais pessoas dentro</option>
                <option value="nome">Nome (A–Z)</option>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Visões e etiquetas">
              {([
                ['atencao', 'Precisa de atenção', (jornadas ?? []).filter(precisaDeAtencao).length, TriangleAlert],
                ['sem_uso', 'Sem uso há 90 dias', (jornadas ?? []).filter(semUso).length, Gauge],
                ['apagadas', 'Apagadas', apagadas?.length ?? 0, Trash2],
              ] as const).map(([v, rotulo, n, Icone]) => (
                <button key={v} type="button" aria-pressed={visao === v} onClick={() => { setVisao((x) => (x === v ? 'nenhuma' : v)); setMarcadas(new Set()) }}
                  className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors cursor-pointer', visao === v ? 'jt-azul' : 'bg-surface-800 text-surface-300 hover:text-surface-100')}>
                  <Icone className="h-3.5 w-3.5" aria-hidden />{rotulo}<span className="tabular-nums opacity-70">{n}</span>
                </button>
              ))}
              {todasEtiquetas.length > 0 && <span className="mx-1 h-4 w-px bg-surface-700" aria-hidden />}
              {todasEtiquetas.map((l) => (
                <button key={l} type="button" aria-pressed={etiqueta === l} onClick={() => setEtiqueta((x) => (x === l ? null : l))}
                  className={cn('inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium transition-colors cursor-pointer', etiqueta === l ? 'jt-verde' : 'bg-surface-800 text-surface-400 hover:text-surface-100')}>
                  <Tag className="h-3 w-3" aria-hidden />{l}
                </button>
              ))}
              {comFiltro && <Button variant="ghost" size="sm" leftIcon={<X className="w-3.5 h-3.5" />} onClick={() => { setBusca(''); setEtiqueta(null); setVisao('nenhuma'); setFiltro('todas') }}>Limpar</Button>}
              {limites && (
                <p className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-surface-400" title={`Até ${limites.maxStepsPerJourney} passos por jornada e ${limites.maxTtlDays} dias por inscrição. IA: ${numero(limites.aiCreditsThisMonth.used)} de ${numero(limites.aiCreditsThisMonth.max)} créditos no mês.`}>
                  <Gauge className="w-3.5 h-3.5" aria-hidden />
                  {limites.activeJourneys.used} de {limites.activeJourneys.max} jornadas ligadas no seu plano
                </p>
              )}
            </div>

            {marcadasVisiveis.length > 0 && visao !== 'apagadas' && (
              <div className="jornadas-aparecer flex flex-wrap items-center gap-2 rounded-[10px] bg-surface-800 px-3 py-2 text-[14px] text-surface-100">
                <span className="mr-1 font-semibold tabular-nums">{marcadasVisiveis.length} selecionada{marcadasVisiveis.length > 1 ? 's' : ''}</span>
                <Button variant="secondary" size="sm" leftIcon={<Pause className="w-3.5 h-3.5" />} onClick={() => pausarVarias(marcadasVisiveis.map((j) => j.id))}>Pausar</Button>
                <Button variant="secondary" size="sm" leftIcon={<Tag className="w-3.5 h-3.5" />} onClick={() => setEtiquetando(marcadasVisiveis.map((j) => j.id))}>Etiquetar</Button>
                <Button variant="secondary" size="sm" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => apagar(marcadasVisiveis.map((j) => j.id))}>Apagar</Button>
                <Button variant="ghost" size="sm" onClick={() => setMarcadas(new Set())}>Desmarcar</Button>
              </div>
            )}

            {erro && !jornadas && <ErrorState onRetry={recarregar} />}
            {!erro && !base && (
              <div className="space-y-2" aria-busy="true" aria-label="Carregando as jornadas">
                {[0, 1, 2].map((i) => <SkeletonCard key={i} lines={2} />)}
              </div>
            )}
            {base && visiveis.length === 0 && (
              visao === 'apagadas'
                ? <EmptyState icon={Trash2} title="A lixeira está vazia" hint="Jornadas apagadas ficam aqui por 90 dias, e dá para restaurar." />
                : <EmptyState
                    icon={Route}
                    title={comFiltro ? 'Nenhuma jornada com esses filtros' : 'Nenhuma jornada ainda'}
                    hint={comFiltro ? 'Mude ou limpe os filtros.' : 'Comece em branco, pela porta de entrada, ou por uma receita pronta para o seu segmento.'}
                    action={comFiltro ? undefined : { label: 'Criar uma jornada', onClick: () => setAba('receitas') }}
                  />
            )}
            {base && visiveis.length > 0 && (
              <div className="rounded-[12px] border border-surface-700 overflow-hidden" role="table" aria-label="Jornadas">
                <div role="row" className={cn('hidden px-5 h-10 bg-surface-900 text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500', GRADE)}>
                  <span role="columnheader">
                    {visao !== 'apagadas' && (
                      <Checkbox aria-label="Marcar todas" checked={visiveis.every((j) => marcadas.has(j.id))}
                        onChange={(e) => { const v = e.target.checked; setMarcadas(v ? new Set(visiveis.map((j) => j.id)) : new Set()) }} />
                    )}
                  </span>
                  <span role="columnheader">Jornada</span>
                  <span role="columnheader" className="text-right" title="Pessoas andando ou esperando num passo">Dentro agora</span>
                  <span role="columnheader" className="text-right" title="Das inscrições encerradas nos últimos 30 dias">Bateu a meta</span>
                  <span role="columnheader" className="text-right" title="Mensagens enviadas (tarifa da Meta) e créditos de IA no mês">Custo do mês</span>
                  <span role="columnheader">Saúde (24 h)</span>
                  <span role="columnheader">Atividade</span>
                  <span aria-hidden />
                </div>
                {visiveis.map((j, i) => (
                  <LinhaDaJornada
                    key={j.id}
                    j={j}
                    ordem={i}
                    apagada={visao === 'apagadas'}
                    marcada={marcadas.has(j.id)}
                    onMarcar={(v) => setMarcadas((m) => { const n = new Set(m); if (v) n.add(j.id); else n.delete(j.id); return n })}
                    onAbrir={() => navigate(`/jornadas/${j.id}`)}
                    onDuplicar={() => duplicar(j)}
                    onEtiquetar={() => setEtiquetando([j.id])}
                    onApagar={() => apagar([j.id])}
                    onRestaurar={() => restaurar(j)}
                    onAbrirProblema={(alvo) => navigate(`/jornadas/${j.id}${alvo === 'alertas' ? '?alertas=1' : '?aba=pessoas&erros=1'}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        </motion.div>
        </AnimatePresence>
        </MotionConfig>
      </main>
      <Etiquetar
        ids={etiquetando}
        jornadas={jornadas ?? []}
        todas={todasEtiquetas}
        onClose={() => setEtiquetando(null)}
        onPronto={() => { setEtiquetando(null); recarregarTudo() }}
      />
      <MobileFeatureGate
        open={gateAberto}
        onClose={() => setGateAberto(false)}
        featureName="Montar jornadas"
        description="O canvas de jornadas é feito para o computador. No celular dá para acompanhar as jornadas e as pessoas."
      />
    </div>
  )
}

/** Pôr e tirar etiquetas de uma ou de várias jornadas. */
function Etiquetar({ ids, jornadas, todas, onClose, onPronto }: { ids: string[] | null; jornadas: ResumoDaJornada[]; todas: string[]; onClose: () => void; onPronto: () => void }) {
  const [nova, setNova] = useState('')
  const [salvando, setSalvando] = useState(false)
  const escolhidas = jornadas.filter((j) => ids?.includes(j.id))
  const emTodas = (l: string) => escolhidas.length > 0 && escolhidas.every((j) => (j.labels ?? []).includes(l))
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({})
  const ligada = (l: string) => marcadas[l] ?? emTodas(l)
  const salvar = async () => {
    if (!ids) return
    setSalvando(true)
    try {
      const add = [...Object.entries(marcadas).filter(([, v]) => v).map(([l]) => l), ...(nova.trim() ? [nova.trim()] : [])]
      const remove = Object.entries(marcadas).filter(([, v]) => !v).map(([l]) => l)
      await jornadasApi.etiquetar(ids, { add, remove })
      setNova(''); setMarcadas({})
      onPronto()
    } finally { setSalvando(false) }
  }
  return (
    <Modal open={!!ids} onClose={() => { setNova(''); setMarcadas({}); onClose() }} title={ids && ids.length > 1 ? `Etiquetas de ${ids.length} jornadas` : 'Etiquetas'}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} loading={salvando}>Salvar</Button></div>}>
      <div className="space-y-3">
        <p className="text-[14px] text-surface-400">Para achar e agrupar na lista: por unidade, por objetivo, por equipe.</p>
        {todas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {todas.map((l) => (
              <button key={l} type="button" aria-pressed={ligada(l)} onClick={() => setMarcadas((m) => ({ ...m, [l]: !ligada(l) }))}
                className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-medium transition-colors cursor-pointer', ligada(l) ? 'jt-verde' : 'bg-surface-800 text-surface-300 hover:text-surface-100')}>
                <Tag className="h-3 w-3" aria-hidden />{l}
              </button>
            ))}
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-[12px] text-surface-400">Etiqueta nova</span>
          <Input size="sm" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Ex.: Itaipava" />
        </label>
      </div>
    </Modal>
  )
}

const FRASE_DO_STATUS: Partial<Record<StatusDaJornada, string>> = {
  shadow: 'Rodando em sombra: nada é enviado.',
  paused: 'Pausada: ninguém novo entra.',
  draft: 'Rascunho: ainda não roda.',
}

/** O ícone de cada canal, pequeno e neutro, na linha da jornada. */
const ICONE_DO_CANAL: Record<CanalDaJornada, React.ComponentType<{ className?: string }>> = {
  whatsapp: ({ className }) => <WhatsAppIcon variant="mono" size={13} className={className} />,
  equipe: UsersRound,
  agente: Bot,
  sistema: Plug,
  crm: Briefcase,
  ia: Sparkles,
}

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function LinhaDaJornada({ j, ordem, apagada, marcada, onMarcar, onAbrir, onDuplicar, onEtiquetar, onApagar, onRestaurar, onAbrirProblema }: {
  j: ResumoDaJornada
  ordem: number
  apagada: boolean
  marcada: boolean
  onMarcar: (v: boolean) => void
  onAbrir: () => void
  onDuplicar: () => void
  onEtiquetar: () => void
  onApagar: () => void
  onRestaurar: () => void
  /** O alerta ou o erro da coluna Saúde abrem a jornada já no problema (P2, 16/11). */
  onAbrirProblema: (alvo: 'alertas' | 'erros') => void
}) {
  const [menu, setMenu] = useState(false)
  const [agora] = useState(() => Date.now())
  const diasNaLixeira = j.deletedAt ? Math.max(0, 90 - Math.floor((agora - Date.parse(j.deletedAt)) / 86_400_000)) : 0
  const alertas = alertasAbertos(j)
  return (
    <div
      role="row"
      tabIndex={apagada ? -1 : 0}
      onClick={apagada ? undefined : onAbrir}
      onKeyDown={(e) => { if (!apagada && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onAbrir() } }}
      style={{ animationDelay: `${Math.min(ordem, 10) * 35}ms` }}
      className={cn(
        'jornadas-aparecer group w-full text-left border-t border-surface-700 first:border-t-0 bg-surface-800 px-5 py-3.5 transition-colors duration-150',
        apagada ? 'opacity-80' : 'hover:bg-[var(--rowhover)] cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
        GRADE,
      )}
    >
      <div role="cell" className="hidden md:block" onClick={(e) => e.stopPropagation()}>
        {!apagada && <Checkbox aria-label={`Marcar ${j.name}`} checked={marcada} onChange={(e) => onMarcar(e.target.checked)} />}
      </div>
      <div role="cell" className="flex min-w-0 items-start gap-3">
        {/* A porta de entrada, no mesmo ícone do canvas. */}
        <span className="mt-0.5 hidden shrink-0 sm:block" title={`Entra por: ${(j.doors ?? []).map((d) => ROTULO_DA_PORTA_CURTO[d] ?? d).join(', ') || '—'}`}>
          <IconeDoPasso tipo={TIPO_DA_PORTA[j.doors?.[0] ?? 'manual'] ?? 'porta_manual'} tamanho="p" />
        </span>
        <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-[14px] font-semibold text-surface-50">{j.name}</span>
          <SeloDoStatus status={j.status} />
          {j.publishedVersion && <span className="shrink-0 text-[12px] text-surface-500">v{j.publishedVersion}</span>}
          {(j.channels ?? []).length > 0 && (
            <span className="ml-0.5 hidden shrink-0 items-center gap-1.5 text-surface-500 lg:inline-flex" aria-label={`Canais: ${(j.channels ?? []).map((c) => ROTULO_DO_CANAL[c]).join(', ')}`}>
              {(j.channels ?? []).map((c) => { const Icone = ICONE_DO_CANAL[c]; return <span key={c} title={ROTULO_DO_CANAL[c]}><Icone className="h-3.5 w-3.5" /></span> })}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[14px] text-surface-400">
          {(j.labels ?? []).length > 0 && <span className="mr-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-surface-300"><Tag className="h-3 w-3" aria-hidden />{(j.labels ?? []).join(', ')} ·</span>}
          {apagada ? `Apagada · some de vez em ${diasNaLixeira} dia${diasNaLixeira === 1 ? '' : 's'} · ` : ''}
          {j.hasDraftChanges && j.publishedVersion ? 'Rascunho com mudanças ainda não publicadas · ' : ''}{j.description || FRASE_DO_STATUS[j.status] || '—'}
          <span className="text-surface-500"> · editada por {j.updatedBy ?? j.createdBy} {quandoFoi(j.updatedAt)}</span>
        </p>
        </div>
      </div>
      {/* No celular, as métricas viram uma linha de rótulo + valor. */}
      <div className="mt-3 grid grid-cols-3 gap-3 md:contents">
        <Celula rotulo="Dentro agora" alinhamento="direita">{numero(j.enrolledNow)}</Celula>
        <Celula rotulo="Bateu a meta" alinhamento="direita">{j.goalRate30d === null ? <span className="text-surface-500">—</span> : `${j.goalRate30d}%`}</Celula>
        <Celula rotulo="Custo do mês" alinhamento="direita">
          {/* Em R$ estimados, com a conta no balão (P2, 16/11). Sem envio nem IA no mês: um traço. */}
          {!j.messagesThisMonth && !j.creditsThisMonth ? <span className="text-surface-500">—</span> : (
          <span className="inline-flex md:justify-end" onClick={(e) => e.stopPropagation()}>
            <Tooltip side="top" wide content={<>
              {numero(j.messagesThisMonth)} mensagens × {reais(TARIFA_MEDIA_DA_META_BRL)} (tarifa média da Meta) ≈ {reais(j.metaCostThisMonthBrl ?? 0)}.
              {j.creditsThisMonth > 0 ? ` IA: ${numero(j.creditsThisMonth)} créditos do plano.` : ' Sem IA.'} A Meta cobra à parte, pela categoria de cada modelo.
            </>}>
              <span className="cursor-help underline decoration-dotted decoration-surface-500 underline-offset-4">
                {reais(j.metaCostThisMonthBrl ?? 0)}{j.creditsThisMonth > 0 && <span className="jt-texto-violeta"> · {numero(j.creditsThisMonth)} cr</span>}
              </span>
            </Tooltip>
          </span>
          )}
        </Celula>
        <Celula rotulo="Saúde (24 h)">
          {alertas.length
            ? <button type="button" onClick={(e) => { e.stopPropagation(); onAbrirProblema('alertas') }} className="inline-flex items-center gap-1.5 jt-texto-vermelho hover:underline cursor-pointer" title={`${alertas.map((a) => a.message).join(' · ')} — clique para abrir`}><Siren className="w-3.5 h-3.5" aria-hidden />{alertas.length} {alertas.length > 1 ? 'alertas' : 'alerta'}</button>
            : j.errors24h > 0
            ? <button type="button" onClick={(e) => { e.stopPropagation(); onAbrirProblema('erros') }} className="inline-flex items-center gap-1.5 text-status-pending hover:underline cursor-pointer" title="Abrir o registro, só com os erros"><TriangleAlert className="w-3.5 h-3.5" aria-hidden />{j.errors24h} {j.errors24h > 1 ? 'erros' : 'erro'}</button>
            : <span className="inline-flex items-center gap-1.5 text-surface-300"><CircleCheck className="w-3.5 h-3.5 text-status-active" aria-hidden />Sem erros</span>}
        </Celula>
        <Celula rotulo="Atividade"><span className="font-normal text-surface-300">{quandoFoi(j.lastActivityAt)}</span></Celula>
      </div>
      <div role="cell" className="hidden md:flex justify-end" onClick={(e) => e.stopPropagation()}>
        {apagada ? (
          <Button variant="ghost" size="sm" iconOnly aria-label={`Restaurar ${j.name}`} title="Restaurar" onClick={onRestaurar}><ArchiveRestore className="w-4 h-4" /></Button>
        ) : (
          <Dropdown open={menu} onClose={() => setMenu(false)} align="right" className="w-52"
            anchor={<Button variant="ghost" size="sm" iconOnly aria-label={`Mais ações de ${j.name}`} aria-expanded={menu} onClick={() => setMenu((m) => !m)}><Ellipsis className="w-4 h-4" /></Button>}>
            <DropdownItem icon={Copy} onClick={() => { setMenu(false); onDuplicar() }}>Duplicar</DropdownItem>
            <DropdownItem icon={Tag} onClick={() => { setMenu(false); onEtiquetar() }}>Etiquetas</DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={Trash2} danger onClick={() => { setMenu(false); onApagar() }}>Apagar</DropdownItem>
          </Dropdown>
        )}
      </div>
    </div>
  )
}

function Celula({ rotulo, alinhamento, children }: { rotulo: string; alinhamento?: 'direita'; children: React.ReactNode }) {
  return (
    <div role="cell" className={cn('min-w-0', alinhamento === 'direita' && 'md:text-right')}>
      <p className="md:hidden text-[12px] text-surface-500">{rotulo}</p>
      <div className="text-[14px] font-semibold text-surface-100 tabular-nums whitespace-nowrap">{children}</div>
    </div>
  )
}

const ROTULO_DA_PORTA_CURTO: Record<string, string> = {
  schedule_list: 'agenda do sistema', event: 'um evento', segment: 'um segmento', webhook: 'outro sistema (webhook)', manual: 'manual ou API',
}
