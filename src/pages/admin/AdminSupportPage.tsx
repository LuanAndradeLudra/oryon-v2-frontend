import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, LifeBuoy, Scale, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useEstadoNaUrl, lerBool, escreverBool } from '@/hooks/useEstadoNaUrl'
import { useRelogioDoMinuto } from '@/hooks/useRelogioDoMinuto'
import { showToast } from '@/hooks/useToast'
import { haSobreposicaoAberta } from '@/lib/sobreposicaoAberta'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi } from '@/services/supportApi'
import type { AtalhoDaFila, ChamadoDaEquipe, FilaDaEquipe, ItemDaFila, ResumoDaFila, SituacaoDaFila } from '@/types/support'
import { ORIGENS_DO_PROBLEMA, tituloDoChamado, type OrigemDoProblema } from '@/components/support/supportModel'
import { useAtualizacaoPeriodica } from '@/components/support/useAtualizacaoPeriodica'
import { ListaDaFila, type FiltrosDaLista } from '@/components/support/fila/ListaDaFila'
import { DetalheDaFila } from '@/components/support/fila/DetalheDaFila'
import type { CampoDaFilaRef } from '@/components/support/fila/CampoUnicoDaFila'
import { ehConflito, motivoDaFalha } from '@/components/support/fila/modeloDaFila'
import { CalibracaoDaRegra } from '@/components/support/fila/CalibracaoDaRegra'
import { QualidadeDasEmpresas } from '@/components/support/fila/QualidadeDasEmpresas'
import '@/components/support/suporte.css'

/**
 * FILA DE SUPORTE da equipe Oryon (SCRUM-1384) — todos os clientes num lugar:
 *  • topo de uma linha: busca + contadores que filtram (P0/P1 · sem 1ª
 *    resposta · com o cliente);
 *  • lista (340 px): Minha fila · Sem dono · Todos, o resto em "Filtros";
 *  • o chamado: Atividade (fio único com as notas internas), Evidência,
 *    Contexto técnico; campo único no pé (responder — o único caminho para
 *    Resolvido —, perguntar, nota interna); propriedades na coluna da direita;
 *  • atalhos: J/K navegam, A assume, R responde.
 * Filtros na URL; a busca fica fora dela (nome e telefone de contato).
 * Atualiza a cada 30 s com a aba visível, sem trocar de chamado sozinha.
 */

const LIMITE = 30
const texto = (v: string | null) => v
const lerFila = (v: string | null): FilaDaEquipe => (v === 'minha' || v === 'sem_dono' ? v : 'todos')
const lerAtalho = (v: string | null): AtalhoDaFila | null => (v === 'urgentes' || v === 'sem_resposta' || v === 'com_cliente' ? v : null)
const lerSituacao = (v: string | null): SituacaoDaFila => (v === 'encerrados' || v === 'todos' ? v : 'abertos')
const lerUuid = (v: string | null) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null)
const lerOrigem = (v: string | null): OrigemDoProblema | null => (v && v in ORIGENS_DO_PROBLEMA ? v as OrigemDoProblema : null)

const ATALHOS: Array<[AtalhoDaFila, string, keyof ResumoDaFila['contadores'], string]> = [
  ['urgentes', 'P0/P1', 'urgentes', 'text-danger'],
  ['sem_resposta', 'sem 1ª resposta', 'semResposta', 'text-warning'],
  ['com_cliente', 'com o cliente', 'comCliente', 'text-surface-300'],
]

interface Lista { chave: string; itens: ItemDaFila[]; proximo: string | null; erro: string | null }

interface FiltrosDaBusca {
  fila: FilaDaEquipe; atalho: AtalhoDaFila | null; situacao: SituacaoDaFila
  empresa: string | null; origem: OrigemDoProblema | null; soSinais: boolean
}

/**
 * Auditoria de UX de 28/10: buscar pelo número (SUP-0005, OCO-12) acha o chamado em qualquer
 * situação, aba, contador ou filtro — antes, um encerrado dava "Fila vazia" com o filtro padrão
 * (em aberto), e com "com o cliente" ligado o SUP-0336 também sumia.
 */
const ehNumeroDeChamado = (termo: string) => /^(sup|oco)-?\d{1,6}$/i.test(termo.trim())
function filtrosDaBusca(termo: string, f: FiltrosDaBusca) {
  if (ehNumeroDeChamado(termo)) return { fila: 'todos' as const, situacao: 'todos' as const, soSinais: false, busca: termo }
  return {
    fila: f.fila, atalho: f.atalho ?? undefined, situacao: f.situacao, empresa: f.empresa ?? undefined,
    origemDoProblema: f.origem ?? undefined, soSinais: f.soSinais, busca: termo || undefined,
  }
}

export function AdminSupportPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const colunaCabe = useMediaQuery('(min-width: 1280px)')
  const agora = useRelogioDoMinuto()
  const [chamadoId, setChamadoId] = useEstadoNaUrl<string | null>('chamado', { padrao: null, ler: lerUuid, escrever: texto, historico: 'push' })
  const [fila, setFila] = useEstadoNaUrl<FilaDaEquipe>('fila', { padrao: 'todos', ler: lerFila, escrever: (v) => (v === 'todos' ? null : v), resetar: ['chamado'] })
  const [atalho, setAtalho] = useEstadoNaUrl<AtalhoDaFila | null>('atalho', { padrao: null, ler: lerAtalho, escrever: texto, resetar: ['chamado'] })
  const [situacao, setSituacao] = useEstadoNaUrl<SituacaoDaFila>('situacao', { padrao: 'abertos', ler: lerSituacao, escrever: (v) => (v === 'abertos' ? null : v), resetar: ['chamado'] })
  const [empresa, setEmpresa] = useEstadoNaUrl<string | null>('empresa', { padrao: null, ler: lerUuid, escrever: texto, resetar: ['chamado'] })
  const [origem, setOrigem] = useEstadoNaUrl<OrigemDoProblema | null>('origem', { padrao: null, ler: lerOrigem, escrever: texto, resetar: ['chamado'] })
  const [soSinais, setSoSinais] = useEstadoNaUrl('sinais', { padrao: false, ler: lerBool, escrever: escreverBool, resetar: ['chamado'] })
  const [busca, setBusca] = useState('')
  const [calibrando, setCalibrando] = useState(false)
  const [vendoQualidade, setVendoQualidade] = useState(false)
  const campoRef = useRef<CampoDaFilaRef | null>(null)

  const [resumo, setResumo] = useState<ResumoDaFila | null>(null)
  const carregarResumo = useCallback(() => { adminSupportApi.resumo().then(setResumo).catch(() => { /* os contadores ficam sem número */ }) }, [])
  useEffect(() => { carregarResumo() }, [carregarResumo])

  // Lista (cursor). A resposta guarda a CHAVE que a trouxe: mudar filtro ou busca esvazia na hora.
  const termo = busca.trim()
  const chave = JSON.stringify([fila, atalho, situacao, empresa, origem, soSinais, termo])
  const [lista, setLista] = useState<Lista | null>(null)
  const [pedido, setPedido] = useState(0)
  // O chamado aberto sozinho (computador): o primeiro da lista — e fica nele.
  const [automatico, setAutomatico] = useState<{ chave: string; id: string | null } | null>(null)
  useEffect(() => {
    let vivo = true
    const t = setTimeout(() => {
      adminSupportApi.listar({ ...filtrosDaBusca(termo, { fila, atalho, situacao, empresa, origem, soSinais }), limite: LIMITE })
        .then((p) => {
          if (!vivo) return
          setLista({ chave, itens: p.itens, proximo: p.proximoCursor, erro: null })
          setAutomatico((a) => (a?.chave === chave && a.id ? a : { chave, id: p.itens[0]?.id ?? null }))
        })
        .catch((err) => { if (vivo) setLista((l) => ({ chave, itens: l?.chave === chave ? l.itens : [], proximo: null, erro: motivoDaFalha(err) })) })
    }, termo ? 250 : 0)
    return () => { vivo = false; clearTimeout(t) }
  }, [chave, pedido, fila, atalho, situacao, empresa, origem, soSinais, termo])
  const daChave = lista?.chave === chave ? lista : null
  const itens = daChave?.itens ?? null
  const [carregandoMais, setCarregandoMais] = useState(false)
  const carregarMais = async () => {
    if (!daChave?.proximo) return
    setCarregandoMais(true)
    try {
      const p = await adminSupportApi.listar({
        ...filtrosDaBusca(termo, { fila, atalho, situacao, empresa, origem, soSinais }), limite: LIMITE, cursor: daChave.proximo,
      })
      setLista((l) => (l && l.chave === chave ? { ...l, itens: [...l.itens, ...p.itens], proximo: p.proximoCursor } : l))
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível carregar mais chamados.'), 'error')
    } finally {
      setCarregandoMais(false)
    }
  }

  const selecionadoId = chamadoId ?? (isMobile ? null : automatico?.chave === chave ? automatico.id : null)
  const [detalhe, setDetalhe] = useState<{ id: string; c: ChamadoDaEquipe | null; erro: string | null } | null>(null)
  const [pedidoDoDetalhe, setPedidoDoDetalhe] = useState(0)
  useEffect(() => {
    if (!selecionadoId) return
    let vivo = true
    adminSupportApi.obter(selecionadoId)
      .then((c) => { if (vivo) setDetalhe({ id: selecionadoId, c, erro: null }) })
      .catch((err) => { if (vivo) setDetalhe((d) => ({ id: selecionadoId, c: d?.id === selecionadoId ? d.c : null, erro: motivoDaFalha(err) })) })
    return () => { vivo = false }
  }, [selecionadoId, pedidoDoDetalhe])
  const doSelecionado = detalhe?.id === selecionadoId ? detalhe : null
  const aberto = doSelecionado?.c ?? null

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
  const aoAtualizar = (c: ChamadoDaEquipe) => {
    if (c.id === selecionadoAtual.current) {
      setDetalhe({ id: c.id, c, erro: null })
      setPedidoDoDetalhe((v) => v + 1) // invalida uma atualização periódica que saiu antes da ação
      if (!chamadoIdAtual.current) setChamadoId(c.id)
    }
    carregarResumo()
    setPedido((v) => v + 1)
  }
  const recarregar = () => setPedidoDoDetalhe((v) => v + 1)

  // Celular: abrir pela lista empilha no histórico; o Voltar da tela volta por ele.
  const abriuPelaLista = useRef(false)
  const abrir = (id: string) => { abriuPelaLista.current = true; setChamadoId(id) }
  const voltar = () => {
    if (abriuPelaLista.current) { abriuPelaLista.current = false; navigate(-1) }
    else setChamadoId(null)
  }

  const assumir = async (c: ChamadoDaEquipe) => {
    try {
      aoAtualizar(await adminSupportApi.atualizar(c.id, c.version, { assumir: true }))
      showToast('Chamado atribuído a você.', 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível assumir.'), 'error')
      if (ehConflito(err)) recarregar()
    }
  }

  // Atalhos da fila (fora de campos de texto, menus e diálogos): J/K navegam, A assume, R responde.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      const alvo = e.target instanceof HTMLElement ? e.target : null
      if (alvo?.closest('input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"]') || haSobreposicaoAberta()) return
      const lista = daChave?.itens ?? []
      if (e.key === 'j' || e.key === 'k') {
        const i = lista.findIndex((x) => x.id === selecionadoId)
        const prox = lista[Math.min(lista.length - 1, Math.max(0, i + (e.key === 'j' ? 1 : -1)))]
        if (prox && prox.id !== selecionadoId) { e.preventDefault(); setChamadoId(prox.id) }
      } else if (e.key === 'a' && aberto && aberto.responsavelId !== user?.id) {
        e.preventDefault()
        void assumir(aberto)
      } else if (e.key === 'r' && aberto) {
        e.preventDefault()
        campoRef.current?.focar('responder')
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  })

  const filtros: FiltrosDaLista = { situacao, empresa, origem, soSinais }
  const mudarFiltros = (f: Partial<FiltrosDaLista>) => {
    if (f.situacao !== undefined) setSituacao(f.situacao)
    if (f.empresa !== undefined) setEmpresa(f.empresa)
    if (f.origem !== undefined) setOrigem(f.origem)
    if (f.soSinais !== undefined) setSoSinais(f.soSinais)
  }

  const listaEl = (
    <ListaDaFila
      itens={itens} erro={daChave?.erro ?? null} proximo={daChave?.proximo ?? null} carregandoMais={carregandoMais}
      onCarregarMais={() => void carregarMais()} onTentarDeNovo={() => setPedido((v) => v + 1)}
      selecionadoId={selecionadoId} onAbrir={abrir} fila={fila} onFila={setFila} contadores={resumo?.contadores ?? null}
      filtros={filtros} onFiltros={mudarFiltros} empresas={resumo?.empresas ?? []} busca={termo} celular={isMobile} agora={agora}
      aberto={aberto ? { id: aberto.id, numero: aberto.numero, titulo: tituloDoChamado(aberto) } : null}
    />
  )
  const detalheEl = selecionadoId ? (
    aberto ? (
      <DetalheDaFila key={selecionadoId} c={aberto} agora={agora} colunaCabe={colunaCabe && !isMobile} onAtualizar={aoAtualizar}
        onRecarregar={recarregar} onAbrir={abrir} onVoltar={isMobile ? voltar : undefined} campoRef={campoRef} />
    ) : doSelecionado?.erro ? (
      <div className="flex-1 flex items-center justify-center p-6">
        <ErrorState title="Não foi possível abrir o chamado" hint={doSelecionado.erro} onRetry={recarregar} />
      </div>
    ) : (
      <p className="flex-1 p-6 text-xs text-surface-400" role="status">Abrindo o chamado…</p>
    )
  ) : !isMobile && itens !== null ? (
    <div className="flex-1 flex items-start justify-center p-6">
      <EmptyState icon={LifeBuoy} title="Escolha um chamado" hint="Os chamados de todos os clientes aparecem na lista." />
    </div>
  ) : null

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-950">
      <header className="h-14 px-4 md:px-6 flex items-center gap-3 border-b border-surface-800 flex-shrink-0 min-w-0">
        <h1 className="text-[17px] font-semibold text-surface-50 whitespace-nowrap">Fila de suporte</h1>
        <label className="relative w-full max-w-[300px] min-w-0">
          <span className="sr-only">Buscar em todos os clientes</span>
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" aria-hidden />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={isMobile ? 'Buscar' : 'Buscar em todos os clientes'} maxLength={80}
            className="w-full h-8 pl-8 pr-2.5 rounded-[7px] bg-surface-800 border border-[var(--bd2)] text-[13px] text-surface-100 placeholder:text-surface-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500" />
        </label>
        <div className="hidden md:flex items-center gap-1 ml-auto" role="group" aria-label="Atalhos da fila">
          {ATALHOS.map(([k, rotulo, contador, cor]) => (
            <button key={k} type="button" aria-pressed={atalho === k} onClick={() => setAtalho((v) => (v === k ? null : k))}
              className={cn('h-8 px-2.5 rounded-[7px] text-xs font-semibold whitespace-nowrap transition-colors',
                atalho === k ? 'bg-[var(--sel)] text-surface-100' : 'hover:bg-[var(--rowhover)] text-surface-300')}>
              <span className={cn('tabular-nums', cor)}>{resumo ? resumo.contadores[contador] : '–'}</span> {rotulo}
            </button>
          ))}
        </div>
        {/* SCRUM-1392: quanto o relato de cada empresa se confirma na triagem (só a equipe). */}
        {/* SCRUM-1391: a qualidade de cada empresa (semana ao vivo ou o retrato do mês). */}
        <button type="button" onClick={() => setVendoQualidade(true)} aria-label="Qualidade por empresa" title="Qualidade por empresa"
          className="ml-auto md:ml-0 h-8 px-2.5 rounded-[7px] inline-flex items-center gap-1.5 text-xs font-semibold text-surface-300 hover:bg-[var(--rowhover)] flex-shrink-0">
          <BarChart3 className="w-3.5 h-3.5" aria-hidden /><span className="hidden lg:inline">Qualidade</span>
        </button>
        <button type="button" onClick={() => setCalibrando(true)} aria-label="Calibração da regra por empresa" title="Calibração da regra por empresa"
          className="h-8 px-2.5 rounded-[7px] inline-flex items-center gap-1.5 text-xs font-semibold text-surface-300 hover:bg-[var(--rowhover)] flex-shrink-0">
          <Scale className="w-3.5 h-3.5" aria-hidden /><span className="hidden lg:inline">Calibração</span>
        </button>
      </header>
      {calibrando && <CalibracaoDaRegra onFechar={() => setCalibrando(false)} />}
      {vendoQualidade && <QualidadeDasEmpresas onFechar={() => setVendoQualidade(false)} />}
      <div className="flex-1 min-h-0 flex">
        {isMobile ? (selecionadoId ? detalheEl : listaEl) : (<>{listaEl}{detalheEl}</>)}
      </div>
    </div>
  )
}
