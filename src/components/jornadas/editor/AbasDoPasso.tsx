import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, CircleAlert, FlaskConical, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ApoioDoEditor, Catalogo, Comentario, NoDoGrafo, ResultadoDoPasso, ResultadosDaJornada, VersaoDaJornada } from '@/services/jornadas/tipos'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { passoDoCatalogo, saidasDoNo } from '@/services/jornadas/catalogo'
import { CONTEXTO_DE_TESTE, resolverTexto } from '@/services/jornadas/simulador'
import { Balao } from './Campos'
import { corDaSaida } from './categorias'
import { fraseDoPasso } from './resumo'

/**
 * ORY-60 — as abas do painel do passo, como nos builders de mercado
 * (HubSpot: "Edit · Test"; Customer.io e Braze: métricas no próprio passo):
 * - Configurar: o formulário do passo (o painel de sempre);
 * - Testar: como o passo roda com os dados de teste, e para onde pode seguir;
 * - Desempenho: quantos passaram, quantos estão ali agora, a fatia de cada
 *   caminho e, nos passos de mensagem, enviadas → entregues → lidas → respondidas.
 */

export type AbaDoPasso = 'configurar' | 'testar' | 'desempenho' | 'comentarios'

const ABAS: { id: AbaDoPasso; rotulo: string }[] = [
  { id: 'configurar', rotulo: 'Configurar' },
  { id: 'testar', rotulo: 'Testar' },
  { id: 'desempenho', rotulo: 'Desempenho' },
  { id: 'comentarios', rotulo: 'Comentários' },
]

export function AbasDoPasso({ aba, onAba, alertaEmConfigurar, comentarios }: { aba: AbaDoPasso; onAba: (a: AbaDoPasso) => void; alertaEmConfigurar?: boolean; comentarios?: number }) {
  return (
    <div role="tablist" aria-label="Partes do passo" className="shrink-0 flex items-center gap-5 border-b border-surface-700 px-4">
      {ABAS.map((a) => {
        const ligada = a.id === aba
        return (
          <button key={a.id} type="button" role="tab" aria-selected={ligada} onClick={() => onAba(a.id)}
            className={cn(
              'relative inline-flex items-center gap-1.5 h-10 text-[14px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:text-surface-50',
              ligada ? 'font-semibold text-surface-50' : 'text-surface-400 hover:text-surface-100',
            )}>
            {a.rotulo}
            {a.id === 'configurar' && alertaEmConfigurar && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" aria-label="tem o que preencher" />}
            {a.id === 'comentarios' && !!comentarios && <span className="rounded-full bg-surface-700 px-1.5 text-[12px] font-semibold tabular-nums text-surface-200">{comentarios}</span>}
            {ligada && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

/** Título de bloco dentro das abas (o mesmo peso das seções do Configurar). */
function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="px-4 py-4 border-b border-surface-700 last:border-b-0">
      <h3 className="text-[14px] font-semibold text-surface-50">{titulo}</h3>
      {descricao && <p className="mt-1 text-[12px] leading-relaxed text-surface-400">{descricao}</p>}
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}

/** Os caminhos do passo e para onde cada um leva (clique leva até o passo). */
function ParaOndeSegue({ no, catalogo, versao, onIrPara }: { no: NoDoGrafo; catalogo: Catalogo; versao: VersaoDaJornada; onIrPara: (id: string) => void }) {
  const saidas = saidasDoNo(no, catalogo)
  const nome = (alvo: string) => versao.graph.nodes[alvo]?.label || passoDoCatalogo(catalogo, versao.graph.nodes[alvo]?.type ?? '')?.label || 'passo'
  return (
    <ul className="space-y-1">
      {saidas.map((s, i) => {
        const alvo = no.outputs[s.key]
        const existe = !!alvo && !!versao.graph.nodes[alvo]
        return (
          <li key={s.key}>
            <button type="button" disabled={!existe} onClick={() => existe && onIrPara(alvo!)}
              className="group flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[14px] transition-colors enabled:cursor-pointer enabled:hover:bg-[var(--rowhover)]">
              {saidas.length > 1 && <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: corDaSaida(s.key, i) }} aria-hidden />}
              <span className="min-w-0 shrink-0 text-surface-300">{saidas.length > 1 ? s.label : 'Segue para'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-surface-500 transition-transform group-enabled:group-hover:translate-x-0.5" aria-hidden />
              <span className={cn('min-w-0 truncate', existe ? 'font-medium text-surface-50' : 'text-surface-500')}>{existe ? nome(alvo!) : 'ainda sem próximo passo'}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** O texto que a pessoa (ou a equipe) receberia, com os dados de teste no lugar. */
function textoComOsDadosDeTeste(no: NoDoGrafo, apoio: ApoioDoEditor): { para: 'pessoa' | 'equipe'; texto: string; botoes?: string[] } | null {
  const p = no.params
  if (no.type === 'send_template') {
    const modelo = apoio.templates.find((t) => t.id === p.templateId)
    if (!modelo) return null
    const vars = (Array.isArray(p.variables) ? p.variables : []) as string[]
    const texto = modelo.body.replace(/\{\{(\d+)\}\}/g, (_m, n: string) => resolverTexto(vars[Number(n) - 1] ?? '') || '…')
    return { para: 'pessoa', texto, botoes: modelo.buttons }
  }
  if (no.type === 'send_text' && typeof p.text === 'string' && p.text.trim()) return { para: 'pessoa', texto: resolverTexto(p.text) }
  const daEquipe = no.type === 'notify_team' ? p.message : no.type === 'internal_note' ? p.text : no.type === 'handoff_agent' ? p.note : no.type === 'handoff_human' ? p.reason : null
  if (typeof daEquipe === 'string' && daEquipe.trim()) return { para: 'equipe', texto: resolverTexto(daEquipe) }
  return null
}

/** Passos que dá para rodar sozinhos, em ensaio (P1, 16/11: o "Test" no nó do HubSpot, o "Test prompt" do Customer.io). */
const TESTAVEIS_SOZINHOS = new Set(['connector_call', 'webhook_out', 'ai_classify', 'ai_extract', 'ai_summarize'])

function TestarSoEstePasso({ jornadaId, nodeId, no, catalogo }: { jornadaId: string; nodeId: string; no: NoDoGrafo; catalogo: Catalogo }) {
  const [rodando, setRodando] = useState(false)
  const [r, setR] = useState<ResultadoDoPasso | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const ia = passoDoCatalogo(catalogo, no.type)?.group === 'ia'
  const rodar = async () => {
    setRodando(true); setErro(null)
    try { setR(await jornadasApi.testarPasso(jornadaId, nodeId, { contactId: null, valores: CONTEXTO_DE_TESTE })) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não deu para rodar o passo.') }
    finally { setRodando(false) }
  }
  const seguiria = r?.saida ? saidasDoNo(no, catalogo).find((s) => s.key === r.saida) : null
  return (
    <Bloco titulo="Testar só este passo" descricao={ia ? 'Roda com os dados de teste e a última mensagem do contato de teste. A IA roda de verdade e não gasta crédito; vale um limite de testes por dia.' : 'Roda em ensaio, com os dados de teste: o sistema do cliente não grava nada.'}>
      <Button variant="secondary" size="sm" leftIcon={<Play className="w-4 h-4" />} loading={rodando} onClick={rodar}>{r ? 'Rodar de novo' : 'Rodar este passo'}</Button>
      {erro && <p className="rounded-[8px] jt-vermelho px-3 py-2 text-[12px]">{erro}</p>}
      {r && (
        <div className="jornadas-aparecer rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5 space-y-1">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-surface-50">
            <span className={cn('h-2 w-2 rounded-full', r.ok ? 'bg-status-active' : 'bg-[var(--color-danger)]')} aria-hidden />{r.titulo}
          </p>
          <p className="text-[12px] leading-relaxed text-surface-300">{r.detalhe}</p>
          <p className="text-[12px] text-surface-400">
            {seguiria ? <>Seguiria por: <strong className="font-semibold text-surface-200">{seguiria.label || 'o próximo passo'}</strong></> : 'Seguiria para o próximo passo.'}
            {r.testesDeIaRestantesHoje !== undefined && <span> · sem gastar crédito · {r.testesDeIaRestantesHoje === 1 ? 'resta 1 teste de IA hoje' : `restam ${r.testesDeIaRestantesHoje} testes de IA hoje`}</span>}
          </p>
        </div>
      )}
    </Bloco>
  )
}

export function TesteDoPasso({ no, nodeId, jornadaId, catalogo, apoio, versao, onIrPara, onTestarJornada, semPrevia }: {
  no: NoDoGrafo
  nodeId?: string
  jornadaId?: string
  catalogo: Catalogo
  apoio: ApoioDoEditor
  versao: VersaoDaJornada
  onIrPara: (id: string) => void
  onTestarJornada?: () => void
  /** O celular ao lado já mostra a mensagem (passos de mensagem): sem repetir a bolha aqui. */
  semPrevia?: boolean
}) {
  const saida = textoComOsDadosDeTeste(no, apoio)
  const frase = fraseDoPasso(no, catalogo, apoio)
  return (
    <>
      <Bloco titulo="Com os dados de teste" descricao={`Como este passo roda para ${CONTEXTO_DE_TESTE['contato.nome']}, com o agendamento de ${CONTEXTO_DE_TESTE['conector.agenda.data'] ?? 'amanhã'} às ${CONTEXTO_DE_TESTE['conector.agenda.hora'] ?? '14:00'}. Nada é enviado.`}>
        {frase && <p className="text-[14px] leading-relaxed text-surface-100">{frase}</p>}
        {saida?.para === 'pessoa' && !semPrevia && <div><p className="mb-1.5 text-[12px] text-surface-400">A pessoa recebe</p><Balao botoes={saida.botoes}>{saida.texto}</Balao></div>}
        {saida?.para === 'equipe' && (
          <div>
            <p className="mb-1.5 text-[12px] text-surface-400">A equipe vê</p>
            <div className="rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5 text-[14px] leading-relaxed text-surface-100">{saida.texto}</div>
          </div>
        )}
        {!frase && !saida && <p className="text-[14px] text-surface-400">Configure o passo para ver como ele roda.</p>}
      </Bloco>
      {jornadaId && nodeId && TESTAVEIS_SOZINHOS.has(no.type) && <TestarSoEstePasso jornadaId={jornadaId} nodeId={nodeId} no={no} catalogo={catalogo} />}
      <Bloco titulo="Para onde pode seguir">
        <ParaOndeSegue no={no} catalogo={catalogo} versao={versao} onIrPara={onIrPara} />
      </Bloco>
      {onTestarJornada && (
        <Bloco titulo="A jornada inteira" descricao="Passa um contato de teste do começo ao fim, escolhendo cada resposta. Nada é enviado de verdade.">
          <Button variant="secondary" size="sm" leftIcon={<FlaskConical className="w-4 h-4" />} onClick={onTestarJornada}>Testar a jornada inteira</Button>
        </Bloco>
      )}
    </>
  )
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const n = (v: number) => v.toLocaleString('pt-BR')

/** Uma linha com nome, número, % e uma barra fina. */
function Linha({ rotulo, valor, total, cor, ponto }: { rotulo: string; valor: number; total: number; cor: string; ponto?: string }) {
  const p = pct(valor, total)
  return (
    <div>
      <div className="flex items-baseline gap-2 text-[14px]">
        {ponto && <span className="w-2 h-2 shrink-0 self-center rounded-full" style={{ backgroundColor: ponto }} aria-hidden />}
        <span className="min-w-0 flex-1 truncate text-surface-200">{rotulo}</span>
        <span className="font-semibold tabular-nums text-surface-50">{n(valor)}</span>
        <span className="w-10 text-right text-[12px] tabular-nums text-surface-400">{p}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[var(--jt-trilho)]" aria-hidden>
        <div className="h-full rounded-full" style={{ width: `${Math.max(p, valor > 0 ? 2 : 0)}%`, backgroundColor: cor }} />
      </div>
    </div>
  )
}

export function DesempenhoDoPasso({ id, no, catalogo, resultados, publicada }: {
  id: string
  no: NoDoGrafo
  catalogo: Catalogo
  resultados: ResultadosDaJornada | null
  publicada: boolean
}) {
  if (!publicada || !resultados) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-[14px] font-semibold text-surface-100">Ainda sem números</p>
        <p className="mt-1 text-[12px] text-surface-400">Os números deste passo aparecem depois que a jornada for publicada.</p>
      </div>
    )
  }
  const contador = resultados.byNode.find((b) => b.nodeId === id)
  const mensagem = resultados.byMessage?.find((m) => m.nodeId === id)
  const saidas = saidasDoNo(no, catalogo)
  const ramos = resultados.byBranch.filter((b) => b.nodeId === id)
  const totalRamos = ramos.reduce((s, b) => s + b.count, 0)
  return (
    <>
      <section className="px-4 py-4 border-b border-surface-700">
        <p className="text-[12px] text-surface-400">Últimos 30 dias</p>
        <dl className="mt-2 grid grid-cols-3 gap-2">
          {[
            ['Agora', contador?.now ?? 0, 'pessoas'],
            ['Passaram', contador?.reached ?? 0, 'pessoas'],
            ['Das entradas', `${pct(contador?.reached ?? 0, resultados.entered)}%`, `de ${n(resultados.entered)}`],
          ].map(([r, v, sub]) => (
            <div key={String(r)} className="rounded-[10px] bg-surface-950 px-3 py-2.5">
              <dt className="text-[12px] text-surface-400">{r}</dt>
              <dd className="text-[20px] font-semibold leading-7 tabular-nums text-surface-50">{typeof v === 'number' ? n(v) : v}</dd>
              <dd className="text-[12px] text-surface-500">{sub}</dd>
            </div>
          ))}
        </dl>
      </section>
      {mensagem && (
        <Bloco titulo="Mensagens" descricao="Do envio à resposta, em relação às enviadas.">
          <div className="space-y-3">
            <Linha rotulo="Enviadas" valor={mensagem.sent} total={mensagem.sent} cor="var(--jt-verde-sobre)" />
            <Linha rotulo="Entregues" valor={mensagem.delivered} total={mensagem.sent} cor="var(--jt-verde-sobre)" />
            <Linha rotulo="Lidas" valor={mensagem.read} total={mensagem.sent} cor="var(--jt-verde-sobre)" />
            <Linha rotulo="Responderam" valor={mensagem.replied} total={mensagem.sent} cor="var(--jt-verde-sobre)" />
          </div>
          {mensagem.failed > 0 && (
            <div className="pt-1">
              <p className="flex items-center gap-1.5 text-[12px] text-[var(--color-danger)]">
                <CircleAlert className="w-3.5 h-3.5" aria-hidden />{n(mensagem.failed)} não {mensagem.failed === 1 ? 'chegou' : 'chegaram'}
              </p>
              {mensagem.failedReasons?.length ? (
                <ul className="mt-1 space-y-0.5 pl-5 text-[12px] text-surface-400">
                  {mensagem.failedReasons.map((x) => <li key={x.reason} className="flex justify-between gap-2"><span>{x.reason}</span><span className="tabular-nums">{n(x.count)}</span></li>)}
                </ul>
              ) : null}
            </div>
          )}
          {mensagem.costBrl !== undefined && (
            <p className="text-[12px] text-surface-400">Tarifa da Meta no período: <strong className="font-semibold text-surface-200">{mensagem.costBrl ? mensagem.costBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'grátis (texto na janela de 24 h)'}</strong></p>
          )}
        </Bloco>
      )}
      {ramos.length > 0 && (
        <Bloco titulo="Por caminho" descricao="Para onde as pessoas foram a partir deste passo.">
          <div className="space-y-3">
            {saidas.map((s, i) => {
              const r = ramos.find((b) => b.output === s.key)
              if (!r) return null
              const cor = corDaSaida(s.key, i)
              return <Linha key={s.key} rotulo={s.label} valor={r.count} total={totalRamos} cor={cor} ponto={cor} />
            })}
          </div>
        </Bloco>
      )}
      {!mensagem && !ramos.length && (
        <p className="px-4 py-4 text-[12px] text-surface-400">Este passo não tem números próprios além de quem passou por ele.</p>
      )}
    </>
  )
}

/**
 * Comentários do passo, com @menção (P1, 16/11, como a HubSpot): "a recepção
 * monta, a gerência aprova". Ficam fora da versão; resolvido some da contagem.
 */
export function ComentariosDoPasso({ jornadaId, nodeId, usuarios, onMudou }: {
  jornadaId: string
  nodeId: string
  usuarios: { id: string; name: string }[]
  onMudou?: () => void
}) {
  const [lista, setLista] = useState<Comentario[] | null>(null)
  const [texto, setTexto] = useState('')
  const [mencoes, setMencoes] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [verResolvidos, setVerResolvidos] = useState(false)
  useEffect(() => {
    let vivo = true
    jornadasApi.comentarios(jornadaId).then((r) => { if (vivo) setLista(r.filter((c) => c.nodeId === nodeId)) }).catch(() => { if (vivo) setLista([]) })
    return () => { vivo = false }
  }, [jornadaId, nodeId])
  // "@" no fim do texto abre a lista de pessoas.
  const termo = /(?:^|\s)@([^\s@]*)$/.exec(texto)?.[1]
  const sugestoes = termo !== undefined ? usuarios.filter((u) => u.name.toLowerCase().includes(termo.toLowerCase())).slice(0, 5) : []
  const mencionar = (u: { id: string; name: string }) => {
    setTexto((t) => t.replace(/@([^\s@]*)$/, `@${u.name} `))
    setMencoes((m) => (m.includes(u.id) ? m : [...m, u.id]))
  }
  const enviar = async () => {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      const validas = mencoes.filter((id) => texto.includes(`@${usuarios.find((u) => u.id === id)?.name ?? ''}`))
      const novo = await jornadasApi.comentar(jornadaId, { nodeId, text: texto, mentions: validas })
      setLista((l) => [...(l ?? []), novo])
      setTexto('')
      setMencoes([])
      onMudou?.()
    } finally { setEnviando(false) }
  }
  const resolver = async (c: Comentario) => {
    const r = await jornadasApi.resolverComentario(jornadaId, c.id, !c.resolved)
    setLista((l) => (l ?? []).map((x) => (x.id === r.id ? r : x)))
    onMudou?.()
  }
  const abertos = (lista ?? []).filter((c) => !c.resolved)
  const resolvidos = (lista ?? []).filter((c) => c.resolved)
  const realce = (t: string) => t.split(/(@[^@\n]+?\))/g).map((p, i) => (p.startsWith('@') ? <strong key={i} className="font-semibold jt-texto-azul">{p}</strong> : <span key={i}>{p}</span>))
  const item = (c: Comentario) => (
    <li key={c.id} className={cn('rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5', c.resolved && 'opacity-60')}>
      <p className="flex items-center gap-2 text-[12px] text-surface-400">
        <span className="font-semibold text-surface-200">{c.author}</span>{quando(c.at)}
        <button type="button" onClick={() => void resolver(c)} className="ml-auto text-[12px] font-medium text-surface-400 hover:text-surface-100 cursor-pointer">{c.resolved ? 'Reabrir' : 'Resolver'}</button>
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-surface-100">{realce(c.text)}</p>
    </li>
  )
  return (
    <Bloco titulo="Comentários" descricao="Para combinar o passo com a equipe. Quem for mencionado com @ recebe um aviso no app.">
      {!lista && <p className="text-[12px] text-surface-400">Carregando…</p>}
      {lista && !abertos.length && <p className="text-[12px] text-surface-400">Nenhum comentário aberto.</p>}
      <ul className="space-y-2">{abertos.map(item)}</ul>
      {resolvidos.length > 0 && (
        <button type="button" onClick={() => setVerResolvidos((v) => !v)} className="text-[12px] text-surface-400 hover:text-surface-200 cursor-pointer">{verResolvidos ? 'Esconder' : 'Ver'} {resolvidos.length} resolvido{resolvidos.length > 1 ? 's' : ''}</button>
      )}
      {verResolvidos && <ul className="space-y-2">{resolvidos.map(item)}</ul>}
      <div className="relative">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void enviar() } }}
          rows={3}
          placeholder="Escreva um comentário. Use @ para mencionar alguém."
          aria-label="Novo comentário"
          className="w-full resize-none rounded-[10px] border border-[var(--jt-borda-campo)] bg-[var(--jt-moldura)] px-3 py-2 text-[14px] text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {sugestoes.length > 0 && (
          <ul className="absolute bottom-full left-0 z-10 mb-1 w-56 overflow-hidden rounded-[10px] border border-surface-700 bg-[var(--jt-moldura)] shadow-[0_12px_32px_rgba(0,0,0,0.28)]" role="listbox" aria-label="Mencionar">
            {sugestoes.map((u) => (
              <li key={u.id}><button type="button" role="option" aria-selected={false} onClick={() => mencionar(u)} className="w-full px-3 py-2 text-left text-[14px] text-surface-100 hover:bg-[var(--rowhover)] cursor-pointer">@{u.name}</button></li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-surface-500">Ctrl+Enter envia</span>
        <Button size="sm" variant="secondary" loading={enviando} disabled={!texto.trim()} onClick={() => void enviar()}>Comentar</Button>
      </div>
    </Bloco>
  )
}

function quando(iso: string): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.round(h / 24)} d`
}
