import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ListChecks, RotateCcw, Route, Search, UserMinus, UserRoundPlus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { passoDoCatalogo } from '@/services/jornadas/catalogo'
import type { Catalogo, Inscricao, ItemDoRegistro, Jornada, SituacaoDaInscricao, StatusDaInscricao, VerificacaoDeEntrada } from '@/services/jornadas/tipos'
import { Selo, SeloDaInscricao } from './comum'
import { baixarCsv, dataHora, numero, quandoFoi, useCarregar } from './apoio'
import { InscreverContatos } from './InscreverContatos'

/**
 * Pessoas: quem está em cada passo e por quê, a linha do tempo de cada
 * inscrição e o "por que não entrou" (modelado no "Detalhes da verificação").
 *
 * P1 do benchmark (16/11), como a HubSpot:
 *  - filtros por passo, situação e versão, e busca por nome ou telefone;
 *  - seleção com ações em lote (tirar várias) e exportar em CSV (telefone mascarado);
 *  - "Ver no desenho": acende o caminho da pessoa no canvas, como no teste;
 *  - o registro de ações da jornada inteira, com "Só erros", o motivo e
 *    "Tentar de novo" ("Falharam N" em Resultados abre direto aqui).
 */

type Filtro = SituacaoDaInscricao
const POR_PAGINA = 25

/** Baixa um CSV gerado pela API (com BOM, para o Excel ler os acentos). */

const STATUS_DO_FILTRO: { value: StatusDaInscricao; label: string }[] = [
  { value: 'active', label: 'Andando' },
  { value: 'waiting', label: 'Esperando' },
  { value: 'completed', label: 'Bateu a meta' },
  { value: 'exited', label: 'Saiu' },
  { value: 'failed', label: 'Falhou' },
]

export function PessoasDaJornada({ jornada, catalogo, onVerCaminho, inicio }: {
  jornada: Jornada
  catalogo: Catalogo
  /** "Ver no desenho": abre o Desenho com o caminho da pessoa aceso. */
  onVerCaminho?: (titulo: string, nodeIds: string[]) => void
  /** Abrir já no registro, com "Só erros" (vem de "Falharam N" em Resultados). */
  inicio?: { aba: 'pessoas' | 'registro'; soErros?: boolean; passo?: string }
}) {
  const [aba, setAba] = useState<'pessoas' | 'registro'>(inicio?.aba ?? 'pessoas')
  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <SegmentedControl label="Pessoas ou registro de ações" value={aba} onChange={setAba} size="32" options={[
        { value: 'pessoas', label: 'Pessoas', icon: Users },
        { value: 'registro', label: 'Registro de ações', icon: ListChecks },
      ]} />
      {aba === 'pessoas'
        ? <ListaDePessoas jornada={jornada} catalogo={catalogo} onVerCaminho={onVerCaminho} passoInicial={inicio?.passo} />
        : <RegistroDeAcoes jornada={jornada} catalogo={catalogo} soErrosInicial={!!inicio?.soErros} onVerCaminho={onVerCaminho} />}
    </div>
  )
}

function ListaDePessoas({ jornada, catalogo, onVerCaminho, passoInicial }: { jornada: Jornada; catalogo: Catalogo; onVerCaminho?: (titulo: string, nodeIds: string[]) => void; passoInicial?: string }) {
  const { toast } = useToast()
  const [filtro, setFiltro] = useState<Filtro>('dentro')
  const [aberta, setAberta] = useState<Inscricao | null>(null)
  const [inscrevendo, setInscrevendo] = useState(false)
  const podeInscrever = jornada.status === 'active' || jornada.status === 'shadow'
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [passo, setPasso] = useState(passoInicial ?? '')
  const [versao, setVersao] = useState('')
  const [status, setStatus] = useState('')
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [tirandoVarias, setTirandoVarias] = useState(false)
  // A busca espera a pessoa parar de digitar.
  useEffect(() => { const t = setTimeout(() => { setBuscaAplicada(busca); setPagina(1) }, 300); return () => clearTimeout(t) }, [busca])
  const filtroDaApi = { situacao: filtro, busca: buscaAplicada, passo: passo || null, versao: versao ? Number(versao) : null, status: (status || null) as StatusDaInscricao | null }
  const { dados: paginaAtual, recarregar } = useCarregar(() => jornadasApi.inscricoes(jornada.id, { ...filtroDaApi, pagina, porPagina: POR_PAGINA }), [jornada.id, filtro, pagina, buscaAplicada, passo, versao, status])
  const versoesDaJornada = Array.from({ length: jornada.publishedVersion ?? 0 }, (_, i) => (jornada.publishedVersion ?? 0) - i)
  const passosDoDesenho = Object.entries(jornada.draft.graph.nodes).map(([id, no]) => ({ id, nome: no.label || passoDoCatalogo(catalogo, no.type)?.label || no.type }))
  const comFiltro = !!(buscaAplicada || passo || versao || status)
  const exportar = async () => {
    try { baixarCsv(`pessoas-${jornada.id}.csv`, await jornadasApi.exportarInscricoes(jornada.id, filtroDaApi)) }
    catch { toast('Não deu para exportar.', 'error') }
  }
  // Enquanto a página nova carrega, a tabela continua com a anterior (o useCarregar só troca ao chegar).
  const lista = paginaAtual
  const inscricoes = lista?.itens ?? null
  const visiveis = inscricoes ?? []
  const totais = lista?.totais
  const mudarFiltro = (f: Filtro) => { setFiltro(f); setPagina(1) }
  const de = lista && lista.total ? (lista.pagina - 1) * lista.porPagina + 1 : 0
  const ate = lista ? Math.min(lista.pagina * lista.porPagina, lista.total) : 0
  const ultimaPagina = lista ? Math.max(1, Math.ceil(lista.total / lista.porPagina)) : 1
  const nomeDoPasso = (id: string | null) => {
    if (!id) return '—'
    const no = jornada.draft.graph.nodes[id]
    return no ? no.label || passoDoCatalogo(catalogo, no.type)?.label || no.type : '—'
  }

  return (
    <>
      <PorQueNaoEntrou jornada={jornada} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-semibold text-surface-50">Pessoas na jornada</h2>
            <p className="mt-0.5 text-[14px] text-surface-400">Clique numa pessoa para ver, passo a passo, o que aconteceu e por quê.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl label="Quais inscrições" value={filtro} onChange={mudarFiltro} options={[
              { value: 'dentro', label: 'Dentro agora', count: totais?.dentro },
              { value: 'encerradas', label: 'Encerradas', count: totais?.encerradas },
              { value: 'todas', label: 'Todas', count: totais ? totais.dentro + totais.encerradas : undefined },
            ]} />
            <Button variant="secondary" size="sm" leftIcon={<UserRoundPlus className="w-3.5 h-3.5" />} disabled={!podeInscrever} title={podeInscrever ? undefined : 'Publique ou ligue a sombra para inscrever.'} onClick={() => setInscrevendo(true)}>
              Inscrever contatos
            </Button>
          </div>
        </div>
        <InscreverContatos jornada={jornada} open={inscrevendo} onClose={() => setInscrevendo(false)} onInscritos={recarregar} />
        <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filtrar pessoas">
          <div className="relative w-full sm:w-[260px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" aria-hidden />
            <Input size="sm" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou final do telefone" aria-label="Buscar pessoa" />
          </div>
          <Select size="sm" className="w-auto" value={passo} onChange={(e) => { setPasso(e.target.value); setPagina(1) }} aria-label="Onde está">
            <option value="">Qualquer passo</option>
            {passosDoDesenho.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
          <Select size="sm" className="w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1) }} aria-label="Situação">
            <option value="">Qualquer situação</option>
            {STATUS_DO_FILTRO.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </Select>
          {versoesDaJornada.length > 1 && (
            <Select size="sm" className="w-auto" value={versao} onChange={(e) => { setVersao(e.target.value); setPagina(1) }} aria-label="Versão">
              <option value="">Qualquer versão</option>
              {versoesDaJornada.map((v) => <option key={v} value={v}>v{v}</option>)}
            </Select>
          )}
          {comFiltro && <Button variant="ghost" size="sm" leftIcon={<X className="w-3.5 h-3.5" />} onClick={() => { setBusca(''); setPasso(''); setVersao(''); setStatus(''); setPagina(1) }}>Limpar</Button>}
          <span className="flex-1" />
          <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={exportar}>Exportar CSV</Button>
        </div>
        {marcadas.size > 0 && (
          <div className="jornadas-aparecer flex flex-wrap items-center gap-3 rounded-[10px] bg-surface-800 px-3 py-2 text-[14px] text-surface-100">
            <span className="font-semibold tabular-nums">{numero(marcadas.size)} selecionada{marcadas.size > 1 ? 's' : ''}</span>
            <Button variant="secondary" size="sm" leftIcon={<UserMinus className="w-3.5 h-3.5" />} onClick={() => setTirandoVarias(true)}>Tirar da jornada</Button>
            <Button variant="ghost" size="sm" onClick={() => setMarcadas(new Set())}>Desmarcar</Button>
          </div>
        )}
        <ConfirmModal
          open={tirandoVarias}
          onClose={() => setTirandoVarias(false)}
          onConfirm={async () => {
            const r = await jornadasApi.tirarVarias(jornada.id, [...marcadas])
            setTirandoVarias(false)
            setMarcadas(new Set())
            toast(`${numero(r.removed)} pessoa${r.removed > 1 ? 's saíram' : ' saiu'} da jornada. Nenhuma mensagem a mais.`, 'success')
            void recarregar()
          }}
          title={`Tirar ${numero(marcadas.size)} pessoa${marcadas.size > 1 ? 's' : ''} da jornada?`}
          description="Elas saem na hora, com o motivo 'manual', e não recebem mais nada desta jornada."
          confirmLabel="Tirar"
        />
        {!inscricoes && <div className="space-y-2">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} />)}</div>}
        {inscricoes && visiveis.length === 0 && <EmptyState icon={Users} title={comFiltro ? 'Ninguém com esses filtros' : 'Ninguém aqui'} hint={jornada.status === 'draft' ? 'A jornada ainda não foi publicada.' : comFiltro ? 'Mude ou limpe os filtros.' : 'Nenhuma inscrição neste filtro.'} />}
        {inscricoes && visiveis.length > 0 && (
          <div className="overflow-x-auto rounded-[12px] border border-surface-700">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500 bg-surface-900">
                  <th className="w-10 pl-4 h-10">
                    <Checkbox
                      aria-label="Marcar todas desta página"
                      checked={visiveis.length > 0 && visiveis.every((i) => marcadas.has(i.id))}
                      onChange={(e) => { const v = e.target.checked; setMarcadas((m) => { const n = new Set(m); for (const i of visiveis) { if (v) n.add(i.id); else n.delete(i.id) } return n }) }}
                    />
                  </th>
                  <th className="font-semibold px-4 h-10">Pessoa</th>
                  <th className="font-semibold px-4 h-10">Referente a</th>
                  <th className="font-semibold px-4 h-10">Onde está</th>
                  <th className="font-semibold px-4 h-10">Situação</th>
                  <th className="font-semibold px-4 h-10">Entrou</th>
                  <th className="font-semibold px-4 h-10">Próximo passo</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i, ordem) => (
                  <tr key={i.id} onClick={() => setAberta(i)} style={{ animationDelay: `${Math.min(ordem, 12) * 30}ms` }} className="jornadas-aparecer border-t border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] transition-colors duration-150 cursor-pointer">
                    <td className="w-10 pl-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox aria-label={`Marcar ${i.contact.name}`} checked={marcadas.has(i.id)} onChange={(e) => { const v = e.target.checked; setMarcadas((m) => { const n = new Set(m); if (v) n.add(i.id); else n.delete(i.id); return n }) }} />
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" className="text-left focus-visible:outline-none focus-visible:underline" onClick={(e) => { e.stopPropagation(); setAberta(i) }}>
                        <span className="block font-medium text-surface-50">{i.contact.name}</span>
                        <span className="block text-[12px] text-surface-500">{i.contact.phoneMasked}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-300">{i.subjectLabel}</td>
                    <td className="px-4 py-3 text-xs text-surface-200">{i.currentNodeId ? nomeDoPasso(i.currentNodeId) : <span className="text-surface-500">saiu</span>}<span className="ml-1.5 text-[12px] text-surface-500">v{i.version}</span></td>
                    <td className="px-4 py-3"><SeloDaInscricao status={i.status} shadow={i.shadow} /></td>
                    <td className="px-4 py-3 text-xs text-surface-400 tabular-nums">{quandoFoi(i.enteredAt)}</td>
                    <td className="px-4 py-3 text-xs text-surface-400 tabular-nums">{i.nextWakeAt ? quandoFoi(i.nextWakeAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lista && lista.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-surface-400">
            <span className="tabular-nums">Mostrando {numero(de)}–{numero(ate)} de {numero(lista.total)}</span>
            {ultimaPagina > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-3.5 h-3.5" />} disabled={lista.pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>Anterior</Button>
                <span className="px-1 tabular-nums">Página {numero(lista.pagina)} de {numero(ultimaPagina)}</span>
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />} disabled={lista.pagina >= ultimaPagina} onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}>Próxima</Button>
              </div>
            )}
          </div>
        )}
      </section>

      <LinhaDoTempo jornada={jornada} inscricao={aberta} onClose={() => setAberta(null)} onTirada={() => { setAberta(null); void recarregar() }} onVerCaminho={onVerCaminho} />
    </>
  )
}

function LinhaDoTempo({ jornada, inscricao, onClose, onTirada, onVerCaminho }: { jornada: Jornada; inscricao: Inscricao | null; onClose: () => void; onTirada: () => void; onVerCaminho?: (titulo: string, nodeIds: string[]) => void }) {
  const { toast } = useToast()
  const [confirmar, setConfirmar] = useState(false)
  const { dados: itens } = useCarregar(() => (inscricao ? jornadasApi.linhaDoTempo(jornada.id, inscricao.id) : Promise.resolve([])), [inscricao?.id])
  const dentro = inscricao && (inscricao.status === 'active' || inscricao.status === 'waiting')

  return (
    <Drawer open={!!inscricao} onClose={onClose} side="right" className="w-[440px]" ariaLabel="Linha do tempo da inscrição">
      {inscricao && (
        <div className="flex flex-col h-full">
          <div className="flex items-start gap-2 border-b border-surface-700 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-50">{inscricao.contact.name}</p>
              <p className="text-xs text-surface-400">{inscricao.subjectLabel} · v{inscricao.version}</p>
              <div className="mt-1.5"><SeloDaInscricao status={inscricao.status} shadow={inscricao.shadow} /></div>
            </div>
            <Button variant="ghost" size="sm" iconOnly aria-label="Fechar" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <ol className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {!itens && <li className="text-xs text-surface-400">Carregando…</li>}
            {(itens ?? []).map((it, i) => (
              <li key={i} className="flex gap-2.5">
                <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', it.status === 'waiting' ? 'bg-status-pending' : it.status === 'failed' ? 'bg-[var(--color-danger)]' : it.status === 'shadow' ? 'bg-[var(--color-accent-violet)]' : 'bg-surface-500')} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-surface-100">{it.title}<span className="ml-2 text-[12px] font-normal text-surface-500 tabular-nums">{dataHora(it.at)}</span></p>
                  <p className="text-xs text-surface-400 leading-relaxed">{it.detail}</p>
                  {it.reason && <p className="mt-1 text-[12px] text-surface-500">Por quê: {it.reason}</p>}
                  {it.status === 'shadow' && <p className="mt-1 text-[12px] jt-texto-violeta">Em sombra: não foi enviado de verdade.</p>}
                </div>
              </li>
            ))}
          </ol>
          {(dentro || (onVerCaminho && itens?.some((x) => x.nodeId))) && (
            <div className="flex flex-wrap gap-2 border-t border-surface-700 px-4 py-3">
              {onVerCaminho && itens?.some((x) => x.nodeId) && (
                <Button variant="secondary" size="sm" leftIcon={<Route className="w-4 h-4" />} onClick={() => onVerCaminho(`Caminho de ${inscricao.contact.name}`, [...new Set((itens ?? []).map((x) => x.nodeId).filter((x): x is string => !!x))])}>Ver no desenho</Button>
              )}
              {dentro && <Button variant="ghost" size="sm" leftIcon={<UserMinus className="w-4 h-4" />} onClick={() => setConfirmar(true)}>Tirar da jornada</Button>}
            </div>
          )}
          <ConfirmModal
            open={confirmar}
            onClose={() => setConfirmar(false)}
            onConfirm={async () => {
              await jornadasApi.tirarDaJornada(jornada.id, inscricao.id)
              setConfirmar(false)
              toast(`${inscricao.contact.name} saiu da jornada. Nenhuma mensagem a mais.`, 'success')
              onTirada()
            }}
            title="Tirar da jornada?"
            description="A pessoa sai na hora, com o motivo 'manual', e não recebe mais nada desta jornada."
            confirmLabel="Tirar"
          />
        </div>
      )}
    </Drawer>
  )
}

const ROTULO_DO_RESULTADO: Record<VerificacaoDeEntrada['result'], [string, 'verde' | 'cinza' | 'ambar' | 'vermelho' | 'violeta']> = {
  entered: ['Entrou', 'verde'],
  filtered: ['Barrado pelo filtro', 'ambar'],
  reentry_blocked: ['Já estava inscrito', 'cinza'],
  suppressed: ['Suprimido', 'violeta'],
  no_contact: ['Sem contato', 'vermelho'],
  journey_paused: ['Jornada pausada', 'cinza'],
}

function PorQueNaoEntrou({ jornada }: { jornada: Jornada }) {
  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof jornadasApi.porQueNaoEntrou>> | undefined>(undefined)

  const procurar = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!busca.trim()) return
    setBuscando(true)
    try { setResultado(await jornadasApi.porQueNaoEntrou(jornada.id, busca)) } finally { setBuscando(false) }
  }

  return (
    <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
      <div>
        <h2 className="text-[16px] font-semibold text-surface-50">Por que não entrou?</h2>
        <p className="mt-0.5 text-[14px] text-surface-400">Busque um contato e veja, em cada porta, o que aconteceu nos últimos 14 dias.</p>
      </div>
      <form onSubmit={procurar} className="flex gap-2 max-w-[520px]">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" aria-hidden />
          <Input size="sm" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou telefone com DDD" aria-label="Buscar contato" />
        </div>
        <Button size="sm" type="submit" loading={buscando}>Ver</Button>
      </form>
      {resultado === null && <p className="text-[14px] text-surface-400">Nenhuma passagem desse contato pelas portas desta jornada nos últimos 14 dias.</p>}
      {resultado && (
        <div className="space-y-2">
          <p className="text-xs text-surface-300"><strong className="text-surface-100">{resultado.contact.name}</strong> · {resultado.contact.phoneMasked}</p>
          <ul className="space-y-1.5">
            {resultado.checks.map((c, i) => {
              const [rotulo, tom] = ROTULO_DO_RESULTADO[c.result]
              return (
                <li key={i} style={{ animationDelay: `${i * 50}ms` }} className="jornadas-aparecer flex flex-wrap items-start gap-x-3 gap-y-1 rounded-[8px] bg-surface-900 px-3 py-2">
                  <Selo tom={tom}>{rotulo}</Selo>
                  <span className="text-xs text-surface-200">{c.reason}</span>
                  <span className="ml-auto text-[12px] text-surface-500 tabular-nums">{c.doorLabel} · {dataHora(c.at)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

// ── registro de ações da jornada inteira ─────────────────────────────────────

function RegistroDeAcoes({ jornada, catalogo, soErrosInicial, onVerCaminho }: { jornada: Jornada; catalogo: Catalogo; soErrosInicial: boolean; onVerCaminho?: (titulo: string, nodeIds: string[]) => void }) {
  const { toast } = useToast()
  const [soErros, setSoErros] = useState(soErrosInicial)
  const [passo, setPasso] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tentando, setTentando] = useState<string | null>(null)
  const [refeitas, setRefeitas] = useState<Record<string, ItemDoRegistro>>({})
  useEffect(() => { const t = setTimeout(() => { setBuscaAplicada(busca); setPagina(1) }, 300); return () => clearTimeout(t) }, [busca])
  const filtro = { soErros, passo: passo || null, busca: buscaAplicada }
  const { dados: lista } = useCarregar(() => jornadasApi.registro(jornada.id, { ...filtro, pagina, porPagina: POR_PAGINA }), [jornada.id, soErros, passo, buscaAplicada, pagina])
  const passosDoDesenho = Object.entries(jornada.draft.graph.nodes).map(([id, no]) => ({ id, nome: no.label || passoDoCatalogo(catalogo, no.type)?.label || no.type }))
  const ultimaPagina = lista ? Math.max(1, Math.ceil(lista.total / lista.porPagina)) : 1

  const tentarDeNovo = async (x: ItemDoRegistro) => {
    setTentando(x.id)
    try {
      const r = await jornadasApi.tentarDeNovo(jornada.id, x.id)
      setRefeitas((m) => ({ ...m, [x.id]: r }))
      toast(`Deu certo para ${x.contact.name}: seguiu o caminho.`, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não deu para tentar de novo.', 'error')
    } finally {
      setTentando(null)
    }
  }
  const exportar = async () => {
    try { baixarCsv(`registro-${jornada.id}.csv`, await jornadasApi.exportarRegistro(jornada.id, filtro)) }
    catch { toast('Não deu para exportar.', 'error') }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[16px] font-semibold text-surface-50">Registro de ações</h2>
        <p className="mt-0.5 text-[14px] text-surface-400">Cada passo que rodou para cada pessoa, do mais novo ao mais antigo. Nas falhas, o motivo e se dá para tentar de novo.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filtrar o registro">
        <label className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-surface-800 px-2.5 text-[14px] text-surface-100">
          <Switch checked={soErros} onChange={(v) => { setSoErros(v); setPagina(1) }} aria-label="Só erros" />
          Só erros{lista && soErros ? <span className="tabular-nums text-surface-400">({numero(lista.erros)})</span> : null}
        </label>
        <div className="relative w-full sm:w-[240px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" aria-hidden />
          <Input size="sm" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pessoa ou passo" aria-label="Buscar no registro" />
        </div>
        <Select size="sm" className="w-auto" value={passo} onChange={(e) => { setPasso(e.target.value); setPagina(1) }} aria-label="Passo">
          <option value="">Qualquer passo</option>
          {passosDoDesenho.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Select>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={exportar}>Exportar CSV</Button>
      </div>

      {!lista && <div className="space-y-2">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} />)}</div>}
      {lista && lista.itens.length === 0 && <EmptyState icon={ListChecks} title={soErros ? 'Nenhuma falha' : 'Nada no registro'} hint={soErros ? 'Nenhum passo falhou com esses filtros.' : 'Quando a jornada rodar, cada passo aparece aqui.'} />}
      {lista && lista.itens.length > 0 && (
        <div className="overflow-x-auto rounded-[12px] border border-surface-700">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500 bg-surface-900">
                <th className="font-semibold px-4 h-10">Quando</th>
                <th className="font-semibold px-4 h-10">Pessoa</th>
                <th className="font-semibold px-4 h-10">Passo</th>
                <th className="font-semibold px-4 h-10">O que aconteceu</th>
                <th className="font-semibold px-4 h-10 w-[150px]" />
              </tr>
            </thead>
            <tbody>
              {lista.itens.map((original) => {
                const x = refeitas[original.id] ?? original
                return (
                  <tr key={x.id} className="border-t border-surface-700 bg-surface-800 align-top">
                    <td className="px-4 py-3 text-xs text-surface-400 tabular-nums whitespace-nowrap">{dataHora(x.at)}</td>
                    <td className="px-4 py-3">
                      <span className="block text-[14px] font-medium text-surface-50">{x.contact.name}</span>
                      <span className="block text-[12px] text-surface-500">{x.contact.phoneMasked}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-200">{x.title}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-start gap-2">
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', x.status === 'failed' ? 'bg-[var(--color-danger)]' : x.status === 'waiting' ? 'bg-status-pending' : x.status === 'shadow' ? 'bg-[var(--color-accent-violet)]' : 'bg-status-active')} aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-xs leading-relaxed text-surface-200">{x.detail}</span>
                          {x.error && (
                            <span className="mt-1 block text-[12px] leading-snug text-[var(--color-danger)]">
                              {x.error.message}<span className="text-surface-500"> · {x.error.code}{x.error.attempts > 1 ? ` · ${x.error.attempts} tentativas` : ''}</span>
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex flex-wrap justify-end gap-1">
                        {x.status === 'failed' && x.error?.retryable && (
                          <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} loading={tentando === x.id} onClick={() => tentarDeNovo(x)}>Tentar de novo</Button>
                        )}
                        {onVerCaminho && x.nodeId && (
                          <Button variant="ghost" size="sm" iconOnly aria-label={`Ver ${x.title} no desenho`} title="Ver no desenho" onClick={() => onVerCaminho(`${x.title}: ${x.contact.name}`, [x.nodeId!])}><Route className="w-3.5 h-3.5" /></Button>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {lista && lista.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-surface-400">
          <span className="tabular-nums">{numero(lista.total)} {lista.total === 1 ? 'ação' : 'ações'}{soErros ? '' : ` · ${numero(lista.erros)} com erro`}</span>
          {ultimaPagina > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-3.5 h-3.5" />} disabled={lista.pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>Anterior</Button>
              <span className="px-1 tabular-nums">Página {numero(lista.pagina)} de {numero(ultimaPagina)}</span>
              <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />} disabled={lista.pagina >= ultimaPagina} onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}>Próxima</Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
