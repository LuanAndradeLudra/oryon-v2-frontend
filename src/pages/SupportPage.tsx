import { Fragment, Suspense, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, CheckCircle2, ChevronDown, CircleHelp, LifeBuoy, MessageSquare, Paperclip, Plus, RotateCcw, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useEstadoNaUrl, lerBool, escreverBool } from '@/hooks/useEstadoNaUrl'
import { showToast } from '@/hooks/useToast'
import { aoSairDaSessao } from '@/lib/limpezaDaSessao'
import { lazyRoute } from '@/lib/lazyRoute'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { supportApi } from '@/services/supportApi'
import type { ChamadoDaEmpresa, ResumoDoChamado, ResumoPorVez, VezDoChamado } from '@/types/support'
import { PrioridadeDaEmpresaChip, StatusChip, SupportChip } from '@/components/support/SupportChip'
import { FioDoChamado, MensagensMarcadas } from '@/components/support/SupportPieces'
import { useAtualizacaoPeriodica } from '@/components/support/useAtualizacaoPeriodica'
import { LimiteDoSuporte } from '@/components/support/LimiteDoSuporte'
import {
  CONTATO_VIU, CONTORNOU, DESDE_QUANDO, IMPEDE_AGORA, JA_CORRIGIRAM, ORIGENS_DO_PROBLEMA, QUEM_MAIS, TIPOS_DE_PEDIDO,
  areaValida, dataCurta, tituloDoChamado, type StatusChamado,
} from '@/components/support/supportModel'
import '@/components/support/suporte.css'

/**
 * SUPORTE (empresa) — SCRUM-1383. A empresa acompanha os chamados com a
 * equipe Oryon num lugar só:
 *  • cabeçalho de uma linha ("N precisam de vocês" + Novo chamado);
 *  • lista com busca e três abas por DE QUEM é a vez (o backend filtra e
 *    conta no escopo do papel: atendente vê os seus; supervisor, o setor;
 *    gestão, a empresa);
 *  • o chamado como CONVERSA: ação pendente no topo (a pergunta da Oryon; a
 *    resposta da Oryon antes do "Isso resolveu?"), um fio só e o campo de
 *    escrever fixo no pé, com rascunho POR chamado;
 *  • detalhes em "rótulo · valor" numa coluna a partir de 1280 px (abaixo,
 *    dobráveis). Prioridade só vem para a gestão, e só quando alta.
 * Estado na URL (`aba`, `chamado`, `novo`, `tela`): F5 e link colado voltam
 * ao mesmo lugar. A busca NÃO vai para a URL: é nome e telefone de contato
 * (histórico do navegador, Sentry). Atualiza a cada 30 s com a aba visível —
 * sem trocar de aba nem de chamado sozinha.
 */

const ChamadoSemConversa = lazyRoute(() => import('@/components/support/ChamadoSemConversa'))

const ABAS: Array<[VezDoChamado, string]> = [['empresa', 'Com vocês'], ['oryon', 'Com a Oryon'], ['encerrados', 'Encerrados']]
const LIMITE = 30
const lerAba = (v: string | null): VezDoChamado | null => (v === 'empresa' || v === 'oryon' || v === 'encerrados' ? v : null)
const texto = (v: string | null) => v

/** Rascunho POR chamado, na sessão: trocar de chamado ou de tela não leva o texto junto nem o perde. Sai no logout. */
const rascunhos = new Map<string, string>()
aoSairDaSessao(() => rascunhos.clear())

/** Selo único do item, no vocabulário da empresa. */
function SeloDoChamado({ status }: { status: StatusChamado }) {
  if (status === 'awaiting_client') return <SupportChip tom="amber">A Oryon perguntou</SupportChip>
  if (status === 'resolved') return <SupportChip tom="amber">Confirme a solução</SupportChip>
  return <StatusChip status={status} />
}

interface Lista { chave: string; itens: ResumoDoChamado[]; proximo: string | null; erro: boolean }

export function SupportPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const gestao = isAdminTier(user?.role)
  const isMobile = useIsMobile()
  const colunaCabe = useMediaQuery('(min-width: 1280px)')
  const [abaUrl, setAba] = useEstadoNaUrl<VezDoChamado | null>('aba', { padrao: null, ler: lerAba, escrever: texto, resetar: ['chamado'] })
  const [chamadoId, setChamadoId] = useEstadoNaUrl<string | null>('chamado', { padrao: null, ler: texto, escrever: texto, historico: 'push' })
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useEstadoNaUrl('novo', { padrao: false, ler: lerBool, escrever: escreverBool, resetar: ['tela'] })
  const [telaDoNovo] = useEstadoNaUrl<string | null>('tela', { padrao: null, ler: areaValida, escrever: texto })

  // Contagem por aba (cabeçalho e abas).
  const [resumo, setResumo] = useState<ResumoPorVez | null>(null)
  // Sem aba na URL: abre na que tem algo para a empresa fazer; senão, com a Oryon.
  // Decidida UMA vez, pelo primeiro resumo: as atualizações não trocam de aba.
  const [abaInicial, setAbaInicial] = useState<VezDoChamado | null>(null)
  const carregarResumo = useCallback(() => {
    supportApi.resumo()
      .then((r) => {
        setResumo(r)
        setAbaInicial((a) => a ?? (r.empresa > 0 ? 'empresa' : r.oryon > 0 ? 'oryon' : 'encerrados'))
      })
      .catch(() => setAbaInicial((a) => a ?? 'empresa')) // as abas ficam sem número
  }, [])
  useEffect(() => { carregarResumo() }, [carregarResumo])
  const aba: VezDoChamado = abaUrl ?? abaInicial ?? 'empresa'
  // A lista espera o resumo só para escolher a aba; se ele falhar, abre em "Com vocês".
  const pronta = !!abaUrl || !!abaInicial

  // Lista da aba (por cursor). A resposta guarda a CHAVE que a trouxe: trocar de aba ou de busca esvazia na hora.
  const chave = `${aba}|${busca.trim()}`
  const [lista, setLista] = useState<Lista | null>(null)
  const [pedido, setPedido] = useState(0)
  // O chamado aberto sozinho (computador): o primeiro da aba — e FICA nele, porque
  // a lista reordena a cada atualização (revisão do Portão 2).
  const [automatico, setAutomatico] = useState<{ chave: string; id: string | null } | null>(null)
  useEffect(() => {
    if (!pronta) return
    let vivo = true
    const t = setTimeout(() => {
      supportApi.listar({ vez: aba, busca: busca.trim() || undefined, limite: LIMITE })
        .then((p) => {
          if (!vivo) return
          setLista({ chave, itens: p.itens, proximo: p.proximoCursor, erro: false })
          setAutomatico((a) => (a?.chave === chave && a.id ? a : { chave, id: p.itens[0]?.id ?? null }))
        })
        .catch(() => { if (vivo) setLista((l) => ({ chave, itens: l?.chave === chave ? l.itens : [], proximo: null, erro: true })) })
    }, busca ? 250 : 0)
    return () => { vivo = false; clearTimeout(t) }
  }, [pronta, aba, busca, chave, pedido])
  const daChave = lista?.chave === chave ? lista : null
  const itens = daChave?.itens ?? null
  const [carregandoMais, setCarregandoMais] = useState(false)
  const carregarMais = async () => {
    if (!daChave?.proximo) return
    setCarregandoMais(true)
    try {
      const p = await supportApi.listar({ vez: aba, busca: busca.trim() || undefined, limite: LIMITE, cursor: daChave.proximo })
      setLista((l) => (l && l.chave === chave ? { ...l, itens: [...l.itens, ...p.itens], proximo: p.proximoCursor } : l))
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível carregar mais chamados.'), 'error')
    } finally {
      setCarregandoMais(false)
    }
  }

  // No computador abre o primeiro da aba (e fica nele); no celular a lista vem primeiro.
  const selecionadoId = chamadoId ?? (isMobile ? null : automatico?.chave === chave ? automatico.id : null)
  const [detalhe, setDetalhe] = useState<{ id: string; c: ChamadoDaEmpresa | null; erro: boolean } | null>(null)
  const [pedidoDoDetalhe, setPedidoDoDetalhe] = useState(0)
  useEffect(() => {
    if (!selecionadoId) return
    let vivo = true
    supportApi.obter(selecionadoId)
      .then((c) => { if (vivo) setDetalhe({ id: selecionadoId, c, erro: false }) })
      .catch(() => { if (vivo) setDetalhe((d) => ({ id: selecionadoId, c: d?.id === selecionadoId ? d.c : null, erro: true })) })
    return () => { vivo = false }
  }, [selecionadoId, pedidoDoDetalhe])
  const doSelecionado = detalhe?.id === selecionadoId ? detalhe : null

  // A cada 30 s (aba visível): contagens, a 1ª página (se não carregou mais) e o chamado aberto.
  useAtualizacaoPeriodica(() => {
    carregarResumo()
    if ((daChave?.itens.length ?? 0) <= LIMITE) setPedido((v) => v + 1)
    if (selecionadoId) setPedidoDoDetalhe((v) => v + 1)
  })

  // A resposta de uma ação chega depois: as refs dizem qual chamado está aberto AGORA.
  const selecionadoAtual = useRef(selecionadoId)
  const chamadoIdAtual = useRef(chamadoId)
  useEffect(() => {
    selecionadoAtual.current = selecionadoId
    chamadoIdAtual.current = chamadoId
  })
  /** Depois de agir no chamado: ele pode ter mudado de aba — a seleção fica presa a ele. */
  const aoAtualizar = (c: ChamadoDaEmpresa) => {
    // A pessoa já abriu outro chamado enquanto a resposta vinha: só as listas mudam.
    if (c.id === selecionadoAtual.current) {
      setDetalhe({ id: c.id, c, erro: false })
      // Uma atualização periódica que saiu antes da ação não traz o estado velho de volta.
      setPedidoDoDetalhe((v) => v + 1)
      if (!chamadoIdAtual.current) setChamadoId(c.id)
    }
    carregarResumo()
    setPedido((v) => v + 1)
  }
  const aoCriar = (c: ChamadoDaEmpresa) => {
    setAba('oryon')
    setChamadoId(c.id)
    carregarResumo()
    setPedido((v) => v + 1)
  }

  // Celular: abrir pela lista empilha no histórico, e o Voltar da tela volta por
  // ele — senão o "voltar" do Android reabria o chamado.
  const abriuPelaLista = useRef(false)
  const abrir = (id: string) => { abriuPelaLista.current = true; setChamadoId(id) }
  const voltar = () => {
    if (abriuPelaLista.current) { abriuPelaLista.current = false; navigate(-1) }
    else setChamadoId(null)
  }
  // Setas, Home e End entre as abas (padrão de abas da WAI-ARIA).
  const moverEntreAbas = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ABAS.findIndex(([k]) => k === aba)
    const alvo = e.key === 'ArrowRight' ? (i + 1) % ABAS.length : e.key === 'ArrowLeft' ? (i - 1 + ABAS.length) % ABAS.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? ABAS.length - 1 : -1
    if (alvo < 0) return
    e.preventDefault()
    setAba(ABAS[alvo][0])
    document.getElementById(`aba-${ABAS[alvo][0]}`)?.focus()
  }

  const precisam = resumo?.empresa ?? 0
  const listaEl = (
    <aside className={cn('flex flex-col min-h-0 bg-surface-900', isMobile ? 'flex-1 min-w-0' : 'w-[320px] flex-shrink-0 border-r border-surface-800')} aria-label="Chamados">
      <div className="px-3 pt-3 pb-2 flex flex-col gap-2 border-b border-surface-800">
        <label className="relative block">
          <span className="sr-only">Buscar chamados</span>
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" aria-hidden />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, contato ou texto" maxLength={80}
            className="w-full h-8 pl-8 pr-2.5 rounded-[7px] bg-surface-800 border border-[var(--bd2)] text-[13px] text-surface-100 placeholder:text-surface-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500" />
        </label>
        <div className="flex" role="tablist" aria-label="De quem é a vez" onKeyDown={moverEntreAbas}>
          {ABAS.map(([k, rotulo]) => {
            const n = resumo?.[k]
            return (
              <button key={k} id={`aba-${k}`} type="button" role="tab" aria-selected={aba === k} aria-controls="lista-de-chamados"
                tabIndex={aba === k ? 0 : -1} onClick={() => setAba(k)}
                className={cn('flex-auto h-8 px-1 inline-flex items-center justify-center gap-1 whitespace-nowrap text-xs font-semibold border-b-2 transition-colors',
                  aba === k ? 'border-brand-500 text-surface-100' : 'border-transparent text-surface-400 hover:text-surface-200')}>
                {rotulo}
                {n !== undefined && (
                  <span className={cn('min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] inline-flex items-center justify-center tabular-nums',
                    k === 'empresa' && n > 0 ? 'bg-accent-amber/[.16] text-accent-amber' : 'bg-[var(--rowhover)] text-surface-400')}>{n}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div id="lista-de-chamados" role="tabpanel" aria-labelledby={`aba-${aba}`} className="flex-1 overflow-y-auto">
        {daChave?.erro && itens?.length === 0 ? (
          <ErrorState compact onRetry={() => setPedido((v) => v + 1)} />
        ) : itens === null ? (
          <p className="px-4 py-3 text-xs text-surface-400" role="status">Carregando chamados…</p>
        ) : itens.length === 0 ? (
          <div className="px-3">
            <EmptyState icon={LifeBuoy}
              title={busca ? 'Nada encontrado' : aba === 'empresa' ? 'Nada esperando por vocês' : aba === 'oryon' ? 'Nenhum chamado em andamento' : 'Nenhum chamado encerrado'}
              hint={busca ? 'Tente outro termo.' : 'Para abrir um, use o menu da mensagem na conversa ou o botão Novo chamado.'} />
          </div>
        ) : (
          <>
            {itens.map((c) => {
              const ativo = selecionadoId === c.id
              return (
                <button key={c.id} type="button" onClick={() => abrir(c.id)} aria-current={ativo ? 'true' : undefined}
                  className={cn('w-full text-left px-3.5 py-2.5 border-b border-surface-800 flex flex-col gap-0.5 transition-colors',
                    ativo ? 'bg-[var(--sel)]' : 'hover:bg-[var(--rowhover)]')}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] text-surface-400">{c.numero}</span>
                    <PrioridadeDaEmpresaChip prioridade={c.prioridade} />
                    <span className="ml-auto text-[11px] text-surface-400 tabular-nums flex-shrink-0">{dataCurta(c.atualizadoEm)}</span>
                  </span>
                  <span className="text-[13px] font-semibold text-surface-100 truncate">{tituloDoChamado(c)}</span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-surface-400 truncate flex-1">{c.contatoNome ? `${c.contatoNome} · ` : ''}por {c.abertoPor}</span>
                    <SeloDoChamado status={c.status} />
                  </span>
                </button>
              )
            })}
            {daChave?.proximo && (
              <div className="p-3">
                <Button variant="neutral" size="sm" className="w-full" loading={carregandoMais} onClick={carregarMais}>Carregar mais</Button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )

  const detalheEl = selecionadoId ? (
    doSelecionado?.c ? (
      <DetalheDoChamado
        key={selecionadoId}
        c={doSelecionado.c}
        mostrarColuna={colunaCabe}
        onAtualizar={aoAtualizar}
        onVoltar={isMobile ? voltar : undefined}
        onAbrirConversa={doSelecionado.c.conversationId ? () => navigate(`/conversations?id=${encodeURIComponent(doSelecionado.c!.conversationId!)}`) : undefined}
      />
    ) : doSelecionado?.erro ? (
      <div className="flex-1 flex items-center justify-center p-6">
        <ErrorState title="Não foi possível abrir o chamado" onRetry={() => setPedidoDoDetalhe((v) => v + 1)} />
      </div>
    ) : (
      <p className="flex-1 p-6 text-xs text-surface-400" role="status">Abrindo o chamado…</p>
    )
  ) : !isMobile && itens !== null ? (
    <div className="flex-1 flex items-start justify-center p-6">
      <EmptyState icon={LifeBuoy} title="Escolha um chamado" hint="Os chamados da sua equipe com a Oryon aparecem na lista." />
    </div>
  ) : null

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-950">
      {/* Cabeçalho de uma linha: o que precisa de vocês e o botão de abrir. */}
      <header className="h-14 px-4 md:px-6 flex items-center gap-3 border-b border-surface-800 flex-shrink-0 min-w-0">
        <h1 className="text-[17px] font-semibold text-surface-50">Suporte</h1>
        {precisam > 0 && (
          <button type="button" onClick={() => setAba('empresa')} className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-accent-amber hover:underline min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber flex-shrink-0" aria-hidden />{precisam} {precisam > 1 ? 'precisam' : 'precisa'} de vocês
          </button>
        )}
        <span className="hidden lg:inline text-xs text-surface-400 truncate">Chamados da sua empresa com a equipe Oryon</span>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {/* SCRUM-1391: os números do mês, só para a gestão. */}
          {gestao && (
            <Button size="sm" variant="neutral" leftIcon={<BarChart3 className="w-4 h-4" />} onClick={() => navigate('/support/qualidade')}
              aria-label="Qualidade do atendimento" title="Qualidade do atendimento">
              <span className="hidden sm:inline">Qualidade</span>
            </Button>
          )}
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setNovo(true)} aria-label="Novo chamado">
            <span className="hidden sm:inline">Novo chamado</span><span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {isMobile ? (selecionadoId ? detalheEl : listaEl) : (<>{listaEl}{detalheEl}</>)}
      </div>

      {novo && (
        <LimiteDoSuporte aoFalhar={() => setNovo(false)}>
          <Suspense fallback={null}>
            {/* "Onde" só vem de um link com ?tela= (área conhecida); a página Suporte não é a tela do problema. */}
            <ChamadoSemConversa entrada="pagina_suporte" telaInicial={telaDoNovo} onClose={() => setNovo(false)} onCriado={aoCriar} />
          </Suspense>
        </LimiteDoSuporte>
      )}
    </div>
  )
}

/* ─── Detalhe ─────────────────────────────────────────────────────────────── */

function DetalheDoChamado({ c, mostrarColuna, onAtualizar, onVoltar, onAbrirConversa }: {
  c: ChamadoDaEmpresa
  mostrarColuna: boolean
  onAtualizar: (c: ChamadoDaEmpresa) => void
  onVoltar?: () => void
  onAbrirConversa?: () => void
}) {
  const campo = useRef<HTMLTextAreaElement>(null)
  const [rascunho, setRascunho] = useState(() => rascunhos.get(c.id) ?? '')
  const escrever = (v: string) => {
    setRascunho(v)
    if (v) rascunhos.set(c.id, v)
    else rascunhos.delete(c.id)
  }
  const [agindo, setAgindo] = useState<null | 'texto' | 'sim' | 'nao' | 'reabrir'>(null)
  const esperandoConfirmacao = c.status === 'resolved'
  const encerrado = c.status === 'closed'
  // Resolvido ainda aceita comentário ("ainda falta um detalhe"); encerrado, só reabrindo.
  const podeEscrever = !encerrado
  // Ctrl+Enter repetido (ou segurado) não manda o mesmo comentário duas vezes.
  const enviandoAgora = useRef(false)

  const agir = async (qual: NonNullable<typeof agindo>, fazer: () => Promise<ChamadoDaEmpresa>, aviso: string) => {
    setAgindo(qual)
    try {
      onAtualizar(await fazer())
      showToast(aviso, 'success')
      return true
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível concluir. Tente de novo.'), 'error')
      return false
    } finally {
      setAgindo(null)
    }
  }
  const enviar = async () => {
    const corpo = rascunho.trim()
    if (!corpo || !podeEscrever || enviandoAgora.current) return
    enviandoAgora.current = true
    const respondendo = !!c.perguntaPendente
    try {
      const ok = await agir('texto', () => supportApi.comentar(c.id, corpo), respondendo ? 'Resposta enviada para a equipe Oryon.'
        : esperandoConfirmacao ? 'Enviado. O chamado voltou para a equipe Oryon.' : 'Comentário enviado para a equipe Oryon.')
      // Só limpa se nada foi escrito enquanto enviava.
      if (ok && (rascunhos.get(c.id) ?? '').trim() === corpo) escrever('')
    } finally {
      enviandoAgora.current = false
    }
  }

  return (
    <section className="flex-1 min-w-0 flex min-h-0" aria-label={`Chamado ${c.numero}`}>
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Topo do chamado */}
        <div className="px-4 md:px-6 py-3 border-b border-surface-800 flex items-start gap-3 flex-shrink-0">
          {onVoltar && (
            <button type="button" onClick={onVoltar} aria-label="Voltar para a lista" className="w-8 h-8 -ml-1 rounded-[6px] flex items-center justify-center text-surface-300 hover:bg-[var(--rowhover)] flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-surface-400"><span className="font-mono">{c.numero}</span></p>
            <h2 className="text-[16px] font-semibold text-surface-50 leading-snug break-words">{tituloDoChamado(c)}</h2>
            <p className="text-xs text-surface-400">{c.contatoNome ? `${c.contatoNome} · ` : ''}Aberto por {c.abertoPor} em {dataCurta(c.abertoEm)}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <SeloDoChamado status={c.status} />
            {onAbrirConversa && (
              <Button size="sm" variant="neutral" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} onClick={onAbrirConversa} aria-label="Abrir conversa">
                <span className="hidden sm:inline">Abrir conversa</span>
              </Button>
            )}
          </div>
        </div>

        {/* Ação pendente + fio */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-[760px] mx-auto px-4 md:px-6 py-5 flex flex-col gap-5">
            {c.perguntaPendente && (
              <AcaoPendente familia="aviso" icone={CircleHelp} titulo="A equipe Oryon precisa de mais informação">
                <p className="text-[13px] text-surface-100 whitespace-pre-wrap break-words">{c.perguntaPendente}</p>
                <div><Button size="sm" onClick={() => campo.current?.focus()}>Responder</Button></div>
              </AcaoPendente>
            )}
            {(c.resumoParaClinica || esperandoConfirmacao) && (
              <AcaoPendente familia="mensagem" icone={CheckCircle2} titulo={esperandoConfirmacao ? 'A Oryon resolveu este chamado' : 'Resposta da Oryon'}>
                {c.resumoParaClinica && <p className="text-[13px] text-surface-100 whitespace-pre-wrap break-words">{c.resumoParaClinica}</p>}
                {c.dependeDaClinica && <p className="text-[13px] text-surface-200"><b>O que depende de vocês:</b> {c.dependeDaClinica}</p>}
                {/* Primeiro o que foi feito; depois a pergunta. */}
                {esperandoConfirmacao && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--bd2)]">
                    <span className="text-[13px] font-semibold text-surface-100 mr-1">Isso resolveu?</span>
                    <Button size="sm" loading={agindo === 'sim'} disabled={!!agindo}
                      onClick={() => void agir('sim', () => supportApi.avaliar(c.id, true), 'Obrigado! Chamado encerrado.')}>Sim, resolveu</Button>
                    <Button size="sm" variant="neutral" loading={agindo === 'nao'} disabled={!!agindo}
                      onClick={() => void agir('nao', () => supportApi.avaliar(c.id, false), 'Chamado reaberto. A equipe Oryon vai olhar de novo.')}>Não, continua</Button>
                  </div>
                )}
              </AcaoPendente>
            )}

            {!mostrarColuna && <DetalhesDobraveis c={c} />}

            <FioDoChamado c={c} />
          </div>
        </div>

        {/* Um único campo de escrever, fixo no pé. */}
        <div className="border-t border-surface-800 px-4 md:px-6 py-3 flex-shrink-0">
          <div className="max-w-[760px] mx-auto flex flex-col gap-2">
            <Textarea ref={campo} rows={2} value={rascunho} onChange={(e) => escrever(e.target.value)} maxLength={4000} disabled={!podeEscrever}
              aria-label={c.perguntaPendente ? 'Resposta à pergunta da Oryon' : 'Mensagem para a equipe Oryon'}
              placeholder={encerrado ? 'Chamado encerrado. Reabra para escrever.'
                : esperandoConfirmacao ? 'Algo ainda não está certo? Escreva aqui e o chamado volta para a equipe Oryon.'
                : c.perguntaPendente ? 'Responda à pergunta da Oryon' : 'Escreva para a equipe Oryon. Só a sua empresa e a Oryon veem.'}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void enviar() } }} />
            <div className="flex items-center gap-2">
              {/* O espaçador fica no celular também: sem ele o Enviar ia para a esquerda. */}
              <span className="mr-auto text-[11px] text-surface-400"><span className="hidden sm:inline">{podeEscrever ? 'Ctrl+Enter envia' : ''}</span></span>
              {encerrado && (
                <Button size="sm" variant="neutral" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} loading={agindo === 'reabrir'} disabled={!!agindo}
                  onClick={() => void agir('reabrir', () => supportApi.reabrir(c.id), 'Chamado reaberto. A equipe Oryon foi avisada.')}>
                  Reabrir
                </Button>
              )}
              <Button size="sm" disabled={!podeEscrever || !rascunho.trim() || (!!agindo && agindo !== 'texto')} loading={agindo === 'texto'} onClick={() => void enviar()}>
                {c.perguntaPendente ? 'Enviar resposta' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {mostrarColuna && (
        <aside className="flex w-[280px] flex-shrink-0 border-l border-surface-800 bg-surface-900 flex-col min-h-0 overflow-y-auto" aria-label="Detalhes do chamado">
          <div className="px-4 py-4 flex flex-col gap-5">
            <ListaDeDetalhes c={c} />
            {c.mensagens.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400">Mensagens marcadas</h3>
                <MensagensMarcadas mensagens={c.mensagens} moldura={false} />
              </div>
            )}
          </div>
        </aside>
      )}
    </section>
  )
}

/** Cartão neutro com a cor só no ícone (mesma regra do painel do chamado). */
function AcaoPendente({ familia, icone: Icone, titulo, children }: { familia: 'aviso' | 'mensagem'; icone: LucideIcon; titulo: string; children: ReactNode }) {
  return (
    <div className={cn('sup-cartao px-4 py-3 flex gap-3', `sup-familia-${familia}`)} role="status">
      <span className="sup-cartao-icone w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"><Icone className="w-4 h-4" strokeWidth={2} /></span>
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <h3 className="text-[14px] font-semibold text-surface-50">{titulo}</h3>
        {children}
      </div>
    </div>
  )
}

/** Detalhes em "rótulo · valor", como as linhas do painel do chamado. Só o que a empresa relatou ou pode ver. */
function ListaDeDetalhes({ c }: { c: ChamadoDaEmpresa }) {
  const linhas: Array<[string, ReactNode]> = []
  if (c.tipoDePedido) linhas.push(['Tipo', TIPOS_DE_PEDIDO[c.tipoDePedido].nome])
  else linhas.push(['Sobre', `${ORIGENS_DO_PROBLEMA[c.origemDoProblema]}${c.origemNome ? ` · ${c.origemNome}` : ''}`])
  if (c.ondeAconteceu) linhas.push(['Onde', c.ondeAconteceu])
  const f = c.fatos
  if (f?.contornou) linhas.push(['Contornou', CONTORNOU[f.contornou]])
  if (f?.quemMais) linhas.push(['Mais alguém', QUEM_MAIS[f.quemMais]])
  if (f?.impede?.length) linhas.push(['Impede agora', f.impede.map((i) => IMPEDE_AGORA[i]).join(', ')])
  if (f?.contatoViu) linhas.push(['Contato viu', CONTATO_VIU[f.contatoViu]])
  if (f?.jaCorrigiram) linhas.push(['Corrigiram', JA_CORRIGIRAM[f.jaCorrigiram]])
  if (c.conversasAfetadas.length) linhas.push(['Também afetadas', c.conversasAfetadas.map((x) => x.contatoNome).join(', ')])
  if (c.desdeQuando) linhas.push(['Desde', DESDE_QUANDO[c.desdeQuando]])
  if (c.dadosDeTerceiros) linhas.push(['Atenção', <span key="t" className="text-danger font-semibold">dados de outra pessoa ou empresa</span>])
  if (!c.tipoDePedido) linhas.push(['Assunto', c.assunto?.titulo ?? 'não informado'])
  for (const x of c.camposExtras) linhas.push([x.rotulo, x.valor])
  linhas.push(['Aberto por', c.abertoPor])
  if (c.anexos.length) {
    linhas.push(['Anexos', (
      <span key="a" className="flex flex-col gap-1">
        {c.anexos.map((a) => (
          // Pelo cliente da API: o link direto dava 401 no app nativo (sessão por Bearer).
          <button key={a.id} type="button"
            onClick={() => { supportApi.baixarAnexo(c.id, a.id, a.nome).catch((err) => showToast(getApiErrorMessage(err, 'Não foi possível baixar o anexo.'), 'error')) }}
            className="inline-flex items-center gap-1 text-left text-accent-dark hover:underline break-all">
            <Paperclip className="w-3 h-3 flex-shrink-0" aria-hidden />{a.nome}
          </button>
        ))}
      </span>
    )])
  }
  if (c.prioridade) linhas.push(['Prioridade', <PrioridadeDaEmpresaChip key="p" prioridade={c.prioridade} />])
  return (
    <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-xs">
      {linhas.map(([r, v]) => (
        <Fragment key={r}>
          <dt className="text-surface-400">{r}</dt>
          <dd className="text-surface-100 min-w-0 break-words">{v}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

function DetalhesDobraveis({ c }: { c: ChamadoDaEmpresa }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="sup-cartao">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
        <span className="text-[13px] font-semibold text-surface-100 flex-1">Detalhes do chamado</span>
        <ChevronDown className={cn('w-4 h-4 text-surface-400 transition-transform', aberto && 'rotate-180')} aria-hidden />
      </button>
      {aberto && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          <ListaDeDetalhes c={c} />
          {c.mensagens.length > 0 && <MensagensMarcadas mensagens={c.mensagens} moldura={false} />}
        </div>
      )}
    </div>
  )
}
