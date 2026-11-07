// Retomadas (06/11): os PLANOS DE AÇÃO que o gestor da rede manda para a unidade. A equipe vê cada
// caso com o nome e a conversa, retoma e marca o resultado num toque. As ações em lote usam o que o
// app já tem: etiqueta, negócio no funil e disparo em RASCUNHO (nada sai para o paciente sem a
// unidade abrir o rascunho e enviar). Consulta marcada depois do plano vira "Marcou" sozinha.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCheck, ClipboardList, Kanban, Lightbulb, Megaphone, MessageSquareText, Settings2, Sparkles, Tag as TagIcon, Target } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { Tooltip } from '@/components/ui/Tooltip'
import { AcoesDoContato } from '@/components/planos/AcoesDoContato'
import { ComoTrabalhar } from '@/components/planos/ComoTrabalhar'
import { jaViuOComoTrabalhar, reabrirComoTrabalhar } from '@/components/planos/comoTrabalharVisto'
import { CabecalhoComDica, Dica } from '@/components/planos/Dica'
import { EnviarModeloDoPlano } from '@/components/planos/EnviarModeloDoPlano'
import { EscolhaDoResultado } from '@/components/planos/EscolhaDoResultado'
import { HistoricoDoPlano } from '@/components/planos/HistoricoDoPlano'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useToast } from '@/hooks/useToast'
import { useTableSelection } from '@/hooks/useTableSelection'
import { pipelinesApi, tagsApi, whatsappNumbersApi } from '@/services/api'
import { codigoDoErro, followUpsApi, type DesfechoDaEquipe, type DetalheDoPlanoDaUnidade, type ItemDoPlano, type PlanoDaUnidade, type SituacaoDoPlano } from '@/services/followUpsApi'
import { AJUDA, EXPLICA_A_SITUACAO, MOTIVO, MOTIVO_CURTO, ROTULO_DA_SITUACAO, ROTULO_DO_DESFECHO, fraseDaAcao, fraseDaMetaDoPlano, fraseDaSugestao, fraseDoProgresso, fraseDoUltimoPasso, haQuanto, motivoDoErro, pedeTrabalho, prazo } from '@/lib/planosDeAcao'
import type { Pipeline, Tag, WhatsAppNumber } from '@/types'
import { cn } from '@/lib/utils'

/** A unidade relê quando o backend avisa que um plano mudou (caso marcou, plano novo). */
function useAvisoDosPlanos(aoMudar: () => void) {
  useEffect(() => {
    const f = () => aoMudar()
    window.addEventListener('follow-ups:mudou', f)
    return () => window.removeEventListener('follow-ups:mudou', f)
  }, [aoMudar])
}

function Barra({ p }: { p: PlanoDaUnidade['progress'] }) {
  const total = Math.max(1, p.total)
  const marcou = p.booked + p.bookedReported
  const trabalhados = Math.max(0, p.worked - marcou)
  return (
    <span className="flex h-1.5 w-full min-w-0 max-w-[200px] rounded-full overflow-hidden bg-surface-700" role="img" aria-label={fraseDoProgresso(p)}>
      <span className="bg-status-active" style={{ width: `${(marcou / total) * 100}%` }} />
      <span className="bg-surface-500" style={{ width: `${(trabalhados / total) * 100}%` }} />
    </span>
  )
}

// ── a lista ───────────────────────────────────────────────────────────────────

type Filtro = 'ativos' | 'vencidos' | 'concluidos'
const STATUS_DO_FILTRO: Record<Filtro, SituacaoDoPlano[]> = { ativos: ['enviado', 'em_andamento'], vencidos: ['vencido'], concluidos: ['concluido', 'cancelado'] }

export function PlanosDeAcaoPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<Filtro>('ativos')
  const [planos, setPlanos] = useState<PlanoDaUnidade[] | null>(null)
  const [erro, setErro] = useState(false)
  const [configurar, setConfigurar] = useState(false)
  const ler = useCallback(() => {
    // Os urgentes primeiro (o resto na ordem do servidor: em andamento, pelo prazo).
    followUpsApi.planos(STATUS_DO_FILTRO[filtro]).then((r) => {
      setPlanos([...r.data].sort((a, b) => Number(b.priority === 'urgente') - Number(a.priority === 'urgente')))
      setErro(false)
    }).catch(() => setErro(true))
  }, [filtro])
  useEffect(() => { ler() }, [ler])
  useAvisoDosPlanos(ler)

  return (
    <div className="flex flex-col h-full w-full bg-surface-950 overflow-y-auto">
      {isMobile && <MobilePageHeader title="Planos de ação" />}
      <main className="flex-1 px-4 md:px-6 pt-4 md:pt-6 pb-8 space-y-4 w-full min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm text-surface-400">Do gestor da rede. Os casos já vêm com o nome: retome cada pessoa e marque o resultado.</p>
          <Button variant="ghost" size="sm" leftIcon={<Settings2 className="w-4 h-4" aria-hidden />} onClick={() => setConfigurar(true)}>Configurar</Button>
        </div>
        <SegmentedControl label="Quais planos" value={filtro} onChange={setFiltro} options={[
          { value: 'ativos', label: 'Em andamento' },
          { value: 'vencidos', label: 'Vencidos' },
          { value: 'concluidos', label: 'Concluídos' },
        ]} />
        {erro && !planos && <ErrorState onRetry={ler} />}
        {!erro && !planos && <div className="space-y-2" aria-busy="true" aria-label="Carregando os planos">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={2} />)}</div>}
        {planos && planos.length === 0 && (
          <EmptyState icon={ClipboardList} title={filtro === 'ativos' ? 'Nenhum plano em andamento' : filtro === 'vencidos' ? 'Nenhum plano vencido' : 'Nenhum plano concluído'}
            hint="Quando o gestor da rede mandar um plano de retomada, ele aparece aqui e você recebe um aviso." />
        )}
        {planos && planos.length > 0 && (
          <ul className="space-y-2">
            {planos.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => navigate(`/planos/${p.id}`)}
                  className="w-full text-left rounded-[10px] border border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] hover:border-[var(--bd2)] px-4 py-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-8">
                  {/* No computador, o plano à esquerda e o progresso à direita; no celular, um embaixo do outro. */}
                  <span className="block min-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-sm font-semibold text-surface-50">{p.title}</span>
                    <span title={EXPLICA_A_SITUACAO[p.overdue && p.status !== 'concluido' ? 'atrasado' : p.status]} className={cn('flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-[5px]',
                      p.overdue ? 'text-status-pending bg-status-pending-bg' : p.status === 'enviado' ? 'text-white bg-[#0F766E]' : 'text-surface-200 bg-surface-700')}>
                      {p.overdue && p.status !== 'concluido' ? 'Atrasado' : ROTULO_DA_SITUACAO[p.status]}
                    </span>
                    {p.priority === 'urgente' && <span className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-[5px] text-status-pending bg-status-pending-bg">Urgente</span>}
                  </span>
                  <span className="block mt-0.5 text-xs text-surface-400">
                    {p.origin === 'regra' ? 'Sugestão aprovada pelo gestor' : 'Do gestor da rede'} · prazo {prazo(p.dueAt)}
                    {p.goalBooked ? ` · ${fraseDaMetaDoPlano(p.goalBooked, p.progress)}` : ''}
                  </span>
                  {p.orientation && <span className="block mt-1.5 text-sm text-surface-300 line-clamp-2">{p.orientation}</span>}
                  </span>
                  <span className="mt-2 md:mt-0 flex items-center gap-3 md:w-[220px] md:flex-col md:items-end md:gap-1.5">
                    <Barra p={p.progress} />
                    <span className="shrink-0 whitespace-nowrap text-xs text-surface-300 tabular-nums md:order-first">{fraseDoProgresso(p.progress)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      {configurar && <ConfiguracaoDosPlanos onFechar={() => setConfigurar(false)} />}
    </div>
  )
}

/**
 * A configuração da unidade para os planos (07/11): os avisos por e-mail e, sobretudo, se o gestor
 * da rede pode ver TRECHOS das conversas dos casos. Cada unidade é um CNPJ e o que o paciente
 * escreve é dado de saúde: desligado por padrão, e a decisão é da unidade (fica guardado quem
 * ligou e quando).
 */
function ConfiguracaoDosPlanos({ onFechar }: { onFechar: () => void }) {
  const { toast } = useToast()
  const [email, setEmail] = useState<boolean | null>(null)
  const [trechos, setTrechos] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Sem a leitura, não há o que salvar: gravar os padrões por cima trocaria a configuração real
  // sem a pessoa ver (revisão de 07/11, P3-5).
  const [erroAoLer, setErroAoLer] = useState(false)
  useEffect(() => {
    let vivo = true
    followUpsApi.configuracao().then((r) => { if (vivo) { setEmail(r.data.notifyEmail); setTrechos(r.data.shareExcerpts === true) } }).catch(() => { if (vivo) setErroAoLer(true) })
    return () => { vivo = false }
  }, [])
  const salvar = async () => {
    if (erroAoLer || email === null || trechos === null) return
    setSalvando(true)
    try {
      await followUpsApi.salvarConfiguracao({ notifyEmail: email, shareExcerpts: trechos })
      toast('Configuração dos planos salva.', 'success')
      onFechar()
    } catch (e) {
      toast(motivoDoErro(codigoDoErro(e)), 'error')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Modal open onClose={onFechar} title="Configurar os planos de ação"
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onFechar}>Cancelar</Button><Button onClick={() => void salvar()} loading={salvando} disabled={erroAoLer || email === null || trechos === null}>Salvar</Button></div>}>
      <div className="space-y-4 text-sm text-surface-200">
        {erroAoLer && (
          <p role="alert" className="text-sm text-status-pending">
            Não deu para ler a configuração agora. Feche e abra de novo; nada foi alterado.
          </p>
        )}
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={!!email} disabled={email === null} onChange={(e) => setEmail(e.target.checked)} />
          <span>
            <span className="block font-medium text-surface-100">Avisar por e-mail</span>
            <span className="block text-xs text-surface-400">Os admins da unidade recebem por e-mail os planos novos e a véspera do prazo, além do aviso no app.</span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={!!trechos} disabled={trechos === null} onChange={(e) => setTrechos(e.target.checked)} />
          <span>
            <span className="block font-medium text-surface-100">Mostrar trechos das conversas ao gestor da rede</span>
            <span className="block text-xs text-surface-400">
              Para o gestor entender cada caso antes de montar o plano. Vão até 12 mensagens em volta do pedido, com o dia e a hora,
              e com nomes (da pessoa e de quem ela citar), telefone, CPF, RG, e-mail, endereço, datas com ano, links e números
              longos mascarados; localização e contatos compartilhados vão só como “[localização]” e “[contato]”. Contato excluído
              não aparece. A máscara é automática, não é perfeita: o que o paciente escreve sobre a saúde dele pode aparecer.
              Cada leitura do gestor fica no registro da unidade, com o contato, e esta escolha também.
            </span>
          </span>
        </label>
      </div>
    </Modal>
  )
}

// ── o detalhe ─────────────────────────────────────────────────────────────────

type Acao = 'tag' | 'pipeline' | 'campaign_draft'
type Aba = 'contatos' | 'historico'

export function PlanoDeAcaoPage() {
  const { id = '' } = useParams<{ id: string }>()
  const isMobile = useIsMobile()
  // Abaixo de 1024 px os botões da linha não cabem: as ações do contato ficam no ⋯.
  const largo = useMediaQuery('(min-width: 1024px)')
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const aba: Aba = params.get('aba') === 'historico' ? 'historico' : 'contatos'
  const mudarAba = (a: Aba) => setParams((q) => { const n = new URLSearchParams(q); if (a === 'contatos') n.delete('aba'); else n.set('aba', a); return n }, { replace: true })
  const [p, setP] = useState<DetalheDoPlanoDaUnidade | null>(null)
  const [erro, setErro] = useState(false)
  // A ação em lote (etiqueta, funil, disparo) — para os marcados, todos em aberto ou um contato só.
  const [acao, setAcao] = useState<{ kind: Acao; itemIds: string[]; nome?: string; preset?: { tagId?: string; pipelineId?: string; stageId?: string | null } } | null>(null)
  const [modeloPara, setModeloPara] = useState<ItemDoPlano | null>(null)
  const [confirmarConclusao, setConfirmarConclusao] = useState(false)
  const [comoTrabalhar, setComoTrabalhar] = useState(() => !jaViuOComoTrabalhar())
  const [concluindo, setConcluindo] = useState(false)
  const [salvando, setSalvando] = useState<Set<string>>(new Set())
  const ler = useCallback(() => {
    followUpsApi.plano(id).then((r) => { setP(r.data); setErro(false) }).catch(() => setErro(true))
  }, [id])
  useEffect(() => { ler() }, [ler])
  useAvisoDosPlanos(ler)

  const itens = useMemo(() => p?.items ?? [], [p])
  const sel = useTableSelection(itens, (i) => i.id)
  const abertos = itens.filter(pedeTrabalho)
  const ativo = !!p && (p.status === 'enviado' || p.status === 'em_andamento' || p.status === 'vencido')
  const nomeDe = (i: ItemDoPlano) => (i.contactDeleted ? 'o contato excluído' : i.contact?.name || 'o contato')

  const marcar = async (i: ItemDoPlano, outcome: DesfechoDaEquipe) => {
    setSalvando((s) => new Set(s).add(i.id))
    // Otimista: a linha muda na hora; volta se o servidor recusar.
    setP((x) => (x ? { ...x, items: x.items.map((y) => (y.id === i.id ? { ...y, outcome } : y)) } : x))
    try {
      await followUpsApi.desfecho(i.id, outcome, { version: i.version })
      toast(`${nomeDe(i)}: “${ROTULO_DO_DESFECHO[outcome]}”.`, 'success')
      ler()
    } catch (e) {
      toast(motivoDoErro(codigoDoErro(e)), 'error')
      ler()
    } finally {
      setSalvando((s) => { const n = new Set(s); n.delete(i.id); return n })
    }
  }
  const marcarSelecionados = async (outcome: DesfechoDaEquipe) => {
    const ids = sel.selectedItems.filter(pedeTrabalho).map((i) => i.id)
    if (!ids.length || !p) return
    try {
      const r = await followUpsApi.desfechoEmLote(p.id, ids, outcome)
      toast(`${r.data.done} ${r.data.done === 1 ? 'contato marcado' : 'contatos marcados'} como “${ROTULO_DO_DESFECHO[outcome]}”.`, 'success')
      sel.clear()
      ler()
    } catch (e) {
      toast(motivoDoErro(codigoDoErro(e)), 'error')
    }
  }
  const concluir = async () => {
    if (!p) return
    setConcluindo(true)
    try {
      await followUpsApi.concluir(p.id)
      toast('Plano concluído. O gestor vê o resultado no painel.', 'success')
      navigate('/planos')
    } catch (e) {
      toast(motivoDoErro(codigoDoErro(e)), 'error')
    } finally {
      setConcluindo(false)
      setConfirmarConclusao(false)
    }
  }
  // Concluir com gente sem resultado pede confirmação (eles viram "Não trabalhado").
  const pedirConclusao = () => (abertos.some((i) => !i.outcome) ? setConfirmarConclusao(true) : void concluir())
  const emLote = (kind: Acao) => setAcao({ kind, itemIds: sel.selectedItems.map((i) => i.id) })

  /** O resultado do contato: o menu (quando ainda pede trabalho) ou o que ficou marcado. */
  const resultadoDe = (i: ItemDoPlano) => {
    if (i.movedToOtherPlan) return <span className="text-xs text-surface-500">Em outro plano</span>
    if (!ativo || !pedeTrabalho(i)) {
      const marcou = i.outcome?.startsWith('agendou') || (!i.outcome && i.caseStatus === 'resolvido')
      return (
        <span className="flex flex-col">
          <span className={cn('text-sm', marcou ? 'text-status-active font-semibold' : 'text-surface-300')}>{i.outcome ? ROTULO_DO_DESFECHO[i.outcome] : i.caseStatus === 'resolvido' ? 'Marcou' : '—'}</span>
          {(i.outcome === 'agendou' || i.outcome === 'agendou_outra_unidade') && <span className="text-xs text-surface-400">confirmado pela agenda</span>}
        </span>
      )
    }
    const nome = nomeDe(i)
    const atual = i.outcome === 'contato_sem_agendamento' ? i.outcome : null
    return (
      <EscolhaDoResultado pergunta={`O que aconteceu com ${nome}?`} atual={atual} rotulo="Marcar resultado" alinhar={isMobile ? 'left' : 'right'}
        ariaLabel={atual ? `Resultado de ${nome}: ${ROTULO_DO_DESFECHO[atual]}. Mudar` : `Marcar o resultado de ${nome}`}
        ocupado={salvando.has(i.id)} onEscolher={(d) => void marcar(i, d)} />
    )
  }

  const colunas: DataTableColumn<ItemDoPlano>[] = [
    {
      key: 'contato',
      header: <CabecalhoComDica rotulo="Contato" dica={AJUDA.contato} />,
      render: (i) => (
        <span className="flex flex-col min-w-0 max-w-[205px] md:max-w-[300px]">
          <span className={cn('truncate font-medium', i.contactDeleted ? 'text-surface-500 italic' : 'text-surface-100')}>
            {i.contactDeleted ? '(contato excluído)' : i.contact?.name || 'Sem nome'}
          </span>
          {/* Sem a coluna (celular e tablet), o motivo vem embaixo do nome e o resultado cabe inteiro. */}
          <span className="lg:hidden text-xs text-surface-400 truncate">{MOTIVO_CURTO[i.kind]}{i.specialty ? ` · ${i.specialty}` : ''}</span>
          {i.managerNote && (
            <span className="flex items-start gap-1 text-xs text-surface-200" title={`Instrução do gestor: ${i.managerNote}`}>
              <MessageSquareText className="w-3.5 h-3.5 mt-px shrink-0 text-surface-400" aria-hidden />
              <span className="line-clamp-2"><span className="sr-only">Instrução do gestor: </span>{i.managerNote}</span>
            </span>
          )}
          {i.lastAction && <span className="text-xs text-surface-400 truncate" title={fraseDoUltimoPasso(i.lastAction)}>{fraseDoUltimoPasso(i.lastAction)}</span>}
          {i.optedOut && <span className="text-xs text-status-pending">Não quer receber disparo</span>}
          {/* No celular a coluna do resultado não cabe: ele vem aqui, embaixo do nome. */}
          {isMobile && <span className="mt-1.5">{resultadoDe(i)}</span>}
        </span>
      ),
    },
    {
      key: 'motivo',
      header: <CabecalhoComDica rotulo="Motivo" dica={AJUDA.motivo} />,
      responsiveClass: 'hidden lg:table-cell',
      render: (i) => (
        <span className="flex flex-col min-w-[150px]">
          <span className="text-surface-200">{MOTIVO[i.kind]}</span>
          {i.specialty && <span className="text-xs text-surface-400">{i.specialty}</span>}
        </span>
      ),
    },
    {
      key: 'quando',
      header: <CabecalhoComDica rotulo="Último sinal" dica={AJUDA.quando} />,
      responsiveClass: 'hidden xl:table-cell',
      render: (i) => <span className="text-surface-400 tabular-nums whitespace-nowrap">{haQuanto(i.kind === 'cancelou' ? i.lastCancelAt ?? i.lastAskAt : i.lastAskAt ?? i.openedAt)}</span>,
    },
    {
      key: 'resultado',
      header: <CabecalhoComDica rotulo="Resultado" dica={AJUDA.resultado} />,
      responsiveClass: 'hidden md:table-cell',
      render: (i) => resultadoDe(i),
    },
    {
      key: 'acoes',
      header: largo ? <CabecalhoComDica rotulo="Ações" dica={AJUDA.acoes} /> : <span className="sr-only">Ações</span>,
      render: (i) => (
        <AcoesDoContato item={i} ativo={ativo} compacto={!largo}
          onModelo={setModeloPara}
          onEtiqueta={(x) => setAcao({ kind: 'tag', itemIds: [x.id], nome: nomeDe(x) })}
          onFunil={(x) => setAcao({ kind: 'pipeline', itemIds: [x.id], nome: nomeDe(x) })} />
      ),
    },
  ]

  if (erro && !p) return <div className="p-6"><ErrorState onRetry={ler} /></div>
  const voltar = () => navigate('/planos')
  const contexto = p ? `${p.priority === 'urgente' ? 'Urgente · ' : ''}${p.origin === 'regra' ? 'Sugestão aprovada pelo gestor' : 'Do gestor da rede'} · prazo ${prazo(p.dueAt)} · ${fraseDoProgresso(p.progress, abertos.length)}` : undefined
  const sugestao = p?.recommendedAction ?? null
  const aplicarSugestao = () => {
    if (!sugestao || sugestao.kind === 'template') return
    setAcao(sugestao.kind === 'tag'
      ? { kind: 'tag', itemIds: [], preset: { tagId: sugestao.tagId } }
      : { kind: 'pipeline', itemIds: [], preset: { pipelineId: sugestao.pipelineId, stageId: sugestao.stageId ?? null } })
  }
  const botaoComoFunciona = !comoTrabalhar && (
    <Button variant="ghost" size="sm" leftIcon={<Lightbulb className="w-4 h-4" aria-hidden />} onClick={() => { reabrirComoTrabalhar(); setComoTrabalhar(true) }}>Como funciona?</Button>
  )
  const botaoConcluir = ativo && (
    <Tooltip content={AJUDA.concluir} side="bottom" wide>
      <Button variant="neutral" size="sm" loading={concluindo} leftIcon={<CheckCheck className="w-4 h-4" aria-hidden />} onClick={pedirConclusao}>Concluir plano</Button>
    </Tooltip>
  )
  const alvoDoLote = sel.count ? `os ${sel.count} marcados` : `todos em aberto (${abertos.length})`
  return (
    <div className="flex flex-col h-full w-full bg-surface-950 overflow-y-auto">
      {isMobile ? <MobilePageHeader title={p?.title ?? 'Plano de ação'} onBack={voltar} /> : (
        <div className="px-6 pt-4">
          <Link to="/planos" className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-100 rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <ArrowLeft className="w-4 h-4" aria-hidden />Planos de ação
          </Link>
          <PageHeader className="!px-0 !pt-2" title={p?.title ?? 'Plano de ação'} subtitle={contexto}
            actions={(botaoComoFunciona || botaoConcluir) ? <>{botaoComoFunciona}{botaoConcluir}</> : undefined} />
        </div>
      )}
      {!p && !erro && <div className="px-4 md:px-6 pt-4" aria-busy="true" aria-label="Carregando o plano"><SkeletonTable rows={5} cols={4} /></div>}
      {p && (
        <main className="flex-1 px-4 md:px-6 pt-3 md:pt-0 pb-24 space-y-4 w-full min-w-0">
          {/* No celular a barra do topo só tem o título: a origem, o prazo e o progresso vêm aqui. */}
          {isMobile && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-surface-400">{contexto}</p>
              {botaoComoFunciona}
            </div>
          )}
          {(p.orientation || p.goalBooked || sugestao) && (
            <section className="rounded-[10px] border border-surface-700 bg-surface-800 px-4 py-3 space-y-2.5">
              {p.orientation && (
                <div>
                  <h2 className="text-xs font-semibold text-surface-400">Orientação do gestor</h2>
                  <p className="mt-1 text-sm text-surface-100 whitespace-pre-line">{p.orientation}</p>
                </div>
              )}
              {p.goalBooked ? (
                <p className="flex items-center gap-2 text-sm text-surface-200"><Target className="w-4 h-4 shrink-0 text-surface-400" aria-hidden />{fraseDaMetaDoPlano(p.goalBooked, p.progress)}</p>
              ) : null}
              {sugestao && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex items-center gap-2 text-sm text-surface-200"><Sparkles className="w-4 h-4 shrink-0 text-surface-400" aria-hidden />O gestor sugere {fraseDaSugestao(sugestao)}.</p>
                  {ativo && abertos.length > 0 && sugestao.kind !== 'template' && (
                    <Button size="sm" variant="neutral" onClick={aplicarSugestao}>Aplicar aos {abertos.length} em aberto</Button>
                  )}
                  {sugestao.kind === 'template' && <span className="text-xs text-surface-400">Use o botão Modelo de cada contato e escolha esse modelo.</span>}
                </div>
              )}
            </section>
          )}
          {comoTrabalhar && ativo && <ComoTrabalhar onFechar={() => setComoTrabalhar(false)} />}

          <Tabs label="Seções do plano" value={aba} onChange={mudarAba} className="px-0"
            tabs={[
              { id: 'contatos', label: 'Contatos', count: itens.length },
              { id: 'historico', label: 'Histórico' },
            ]} />

          {aba === 'historico' ? <HistoricoDoPlano planId={p.id} versao={p.version} /> : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-surface-300 basis-full">
                  {abertos.length ? <><b className="text-surface-100">{abertos.length}</b> {abertos.length === 1 ? 'pessoa para retomar.' : 'pessoas para retomar.'} Marque o resultado depois de falar com cada uma.</> : 'Todos os contatos já têm resultado.'}
                </span>
                {ativo && abertos.length > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1 mr-1 text-xs text-surface-400">Para {alvoDoLote}:<Dica texto={AJUDA.selecao} rotulo="Para quem valem as ações:" /></span>
                    <Tooltip content={AJUDA.tag} side="top" wide>
                      <Button variant="neutral" size="sm" leftIcon={<TagIcon className="w-4 h-4" aria-hidden />} onClick={() => emLote('tag')}>Etiqueta</Button>
                    </Tooltip>
                    <Tooltip content={AJUDA.pipeline} side="top" wide>
                      <Button variant="neutral" size="sm" leftIcon={<Kanban className="w-4 h-4" aria-hidden />} onClick={() => emLote('pipeline')}>Pôr no funil</Button>
                    </Tooltip>
                    <Tooltip content={p.actions.campaign === 'no_line' ? 'Disparo indisponível: a unidade não tem linha de WhatsApp conectada.' : AJUDA.campaign_draft} side="top" wide>
                      <Button variant="neutral" size="sm" disabled={p.actions.campaign === 'no_line'} aria-describedby={p.actions.campaign === 'no_line' ? 'sem-linha' : undefined}
                        leftIcon={<Megaphone className="w-4 h-4" aria-hidden />} onClick={() => emLote('campaign_draft')}>Disparo em rascunho</Button>
                    </Tooltip>
                  </>
                )}
              </div>
              {ativo && abertos.length > 0 && p.actions.campaign === 'no_line' && (
                <p id="sem-linha" className="-mt-2 text-xs text-surface-400">Disparo indisponível: a unidade não tem linha de WhatsApp conectada.</p>
              )}
              <DataTable columns={colunas} rows={itens} rowKey={(i) => i.id} rowHeight="md"
                selectedKeys={ativo ? sel.selectedIds : undefined}
                onToggleSelect={ativo ? sel.toggle : undefined}
                onToggleSelectAll={ativo ? () => (sel.count === itens.length ? sel.clear() : sel.selectAll(itens.map((i) => i.id))) : undefined}
                emptyIcon={ClipboardList} emptyTitle="Nenhum contato neste plano" />
              {/* No celular, concluir é o último passo: fica no fim da lista, e não entre a orientação e as ações. */}
              {isMobile && ativo && <div className="pt-2 flex justify-end">{botaoConcluir}</div>}
            </>
          )}
        </main>
      )}

      {p && sel.count > 0 && ativo && aba === 'contatos' && (
        <div className="fixed inset-x-0 bottom-0 md:bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-40 flex flex-wrap items-center gap-2 px-4 py-3 md:rounded-[12px] border-t md:border border-[var(--bd2)] bg-surface-800 shadow-xl">
          <span className="text-sm text-surface-100 font-semibold">{sel.count} {sel.count === 1 ? 'marcado' : 'marcados'}</span>
          <EscolhaDoResultado pergunta={`O que aconteceu com ${sel.count === 1 ? 'este contato' : `estes ${sel.count} contatos`}?`} atual={null}
            rotulo="Marcar resultado de todos" ariaLabel={`Marcar o resultado dos ${sel.count} marcados`} alinhar="left"
            onEscolher={(d) => void marcarSelecionados(d)} />
          <Button variant="ghost" size="sm" onClick={sel.clear}>Desmarcar</Button>
        </div>
      )}

      {p && acao && (
        <AcaoDoPlano plano={p} acao={acao.kind} itemIds={acao.itemIds} nome={acao.nome} preset={acao.preset}
          onFechar={() => setAcao(null)} onFeito={(msg) => { setAcao(null); toast(msg, 'success'); ler() }} onErro={(msg) => toast(msg, 'error')} />
      )}
      {p && modeloPara && (
        <EnviarModeloDoPlano planId={p.id} item={modeloPara} onFechar={() => setModeloPara(null)}
          onEnviado={(cid) => {
            const nome = nomeDe(modeloPara)
            setModeloPara(null)
            toast(`Modelo enviado para ${nome}. Está no histórico do plano.`, 'success', cid ? { label: 'Abrir conversa', onClick: () => navigate(`/conversations?id=${encodeURIComponent(cid)}`) } : undefined)
            ler()
          }} />
      )}
      {p && confirmarConclusao && (
        <Modal open onClose={() => setConfirmarConclusao(false)} title="Concluir o plano?"
          footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmarConclusao(false)}>Voltar</Button><Button onClick={() => void concluir()} loading={concluindo}>Concluir mesmo assim</Button></div>}>
          <p className="text-sm text-surface-200">
            {abertos.filter((i) => !i.outcome).length === 1 ? 'Ainda há 1 contato sem resultado. Ao concluir, ele fica como' : `Ainda há ${abertos.filter((i) => !i.outcome).length} contatos sem resultado. Ao concluir, eles ficam como`} <b>“Não trabalhado”</b> e o plano sai da lista de andamento. O gestor vê o resultado no painel.
          </p>
        </Modal>
      )}
    </div>
  )
}

/** A folha de cada ação em lote: etiqueta, funil (com a etapa de retomada guardada) e disparo em rascunho. */
function AcaoDoPlano({ plano, acao, itemIds, nome, preset, onFechar, onFeito, onErro }: {
  plano: DetalheDoPlanoDaUnidade
  acao: Acao
  itemIds: string[]
  /** A ação que o gestor sugeriu: já vem escolhida (a etiqueta, ou o funil e a etapa). */
  preset?: { tagId?: string; pipelineId?: string; stageId?: string | null }
  /** A ação de um contato só (o ⋯ da linha): o nome dele no texto. */
  nome?: string
  onFechar: () => void
  onFeito: (msg: string) => void
  onErro: (msg: string) => void
}) {
  const [tags, setTags] = useState<Tag[]>([])
  const [funis, setFunis] = useState<Pipeline[]>([])
  const [linhas, setLinhas] = useState<WhatsAppNumber[]>([])
  const [tagId, setTagId] = useState('')
  const [funilId, setFunilId] = useState('')
  const [etapaId, setEtapaId] = useState('')
  const [linhaId, setLinhaId] = useState('')
  const [lembrar, setLembrar] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    let vivo = true
    void followUpsApi.configuracao().then((c) => {
      if (!vivo) return
      setTagId(preset?.tagId ?? c.data.tagId ?? '')
      setFunilId(preset?.pipelineId ?? c.data.pipelineId ?? '')
      setEtapaId(preset?.pipelineId ? (preset.stageId ?? '') : (c.data.stageId ?? ''))
      setLinhaId(c.data.whatsappNumberId ?? '')
    }).catch(() => {})
    if (acao === 'tag') void tagsApi.list().then((r) => { if (vivo) setTags(r.data) }).catch(() => {})
    if (acao === 'pipeline') void pipelinesApi.list().then((r) => { if (vivo) setFunis(r.data.filter((f) => !f.isArchived)) }).catch(() => {})
    if (acao === 'campaign_draft') void whatsappNumbersApi.list().then((r) => { if (vivo) setLinhas(r.data.filter((l) => l.isActive !== false)) }).catch(() => {})
    return () => { vivo = false }
  }, [acao, preset])
  const etapas = funis.find((f) => f.id === funilId)?.stages?.filter((s) => !s.isWon && !s.isLost) ?? []
  const quantos = itemIds.length || plano.items.filter(pedeTrabalho).length
  const alvo = nome && itemIds.length === 1 ? nome : itemIds.length ? `os ${itemIds.length} contatos marcados` : `os ${quantos} contatos em aberto`
  const executar = async () => {
    setOcupado(true)
    try {
      if (acao === 'pipeline' && lembrar) await followUpsApi.salvarConfiguracao({ pipelineId: funilId || null, stageId: etapaId || null })
      if (acao === 'tag' && lembrar) await followUpsApi.salvarConfiguracao({ tagId: tagId || null })
      if (acao === 'campaign_draft' && lembrar && linhaId) await followUpsApi.salvarConfiguracao({ whatsappNumberId: linhaId })
      const params = acao === 'tag' ? { tagIds: [tagId] } : acao === 'pipeline' ? { pipelineId: funilId, ...(etapaId ? { stageId: etapaId } : {}) } : { ...(linhaId ? { whatsappNumberId: linhaId } : {}) }
      const ids = itemIds.length ? itemIds : plano.items.filter(pedeTrabalho).map((i) => i.id)
      const r = await followUpsApi.acao(plano.id, acao, ids, params)
      onFeito(fraseDaAcao(acao, r.data.done, r.data.skipped, r.data.details))
    } catch (e) {
      onErro(motivoDoErro(codigoDoErro(e)))
    } finally {
      setOcupado(false)
    }
  }
  const pronto = acao === 'tag' ? !!tagId : acao === 'pipeline' ? !!funilId : plano.actions.campaign !== 'choose_line' || !!linhaId
  const titulo = acao === 'tag' ? 'Pôr etiqueta' : acao === 'pipeline' ? 'Pôr no funil' : 'Criar disparo em rascunho'
  return (
    <Modal open onClose={onFechar} title={titulo}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onFechar}>Cancelar</Button><Button onClick={() => void executar()} disabled={!pronto} loading={ocupado}>Confirmar</Button></div>}>
      <div className="space-y-3 text-sm text-surface-200">
        <p>Para {alvo}{nome && itemIds.length === 1 ? '' : ' deste plano'}.</p>
        <p className="text-xs text-surface-400">{AJUDA[acao]}</p>
        {acao === 'tag' && (
          <Select aria-label="Etiqueta" value={tagId} onChange={(e) => setTagId(e.target.value)}>
            <option value="">Escolha a etiqueta…</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        )}
        {acao === 'pipeline' && (
          <>
            <Select aria-label="Funil" value={funilId} onChange={(e) => { setFunilId(e.target.value); setEtapaId('') }}>
              <option value="">Escolha o funil…</option>
              {funis.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Select aria-label="Etapa" value={etapaId} onChange={(e) => setEtapaId(e.target.value)} disabled={!funilId}>
              <option value="">Primeira etapa do funil</option>
              {etapas.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <p className="text-xs text-surface-400">Quem já tem negócio aberto neste funil fica como está (não duplica).</p>
          </>
        )}
        {acao === 'campaign_draft' && (
          <>
            {plano.actions.campaign === 'choose_line' && (
              <Select aria-label="Linha de WhatsApp" value={linhaId} onChange={(e) => setLinhaId(e.target.value)}>
                <option value="">Escolha a linha…</option>
                {linhas.map((l) => <option key={l.id} value={l.id}>{l.label || l.displayPhoneNumber}</option>)}
              </Select>
            )}
            <p className="text-xs text-surface-400">O disparo nasce em rascunho, sem quem pediu para não receber. Em Disparos você escolhe o modelo aprovado e envia.</p>
          </>
        )}
        {acao !== 'campaign_draft' || plano.actions.campaign === 'choose_line' ? (
          <label className="flex items-center gap-2 text-xs text-surface-300">
            <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
            Usar esta escolha nos próximos planos
          </label>
        ) : null}
      </div>
    </Modal>
  )
}
