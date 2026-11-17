import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleAlert, FastForward, FlaskConical, Play, RotateCcw, Search, Send, Trophy, UserRound, X } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { avancarTeste, CONTEXTO_DE_TESTE, iniciarTeste, type EstadoDoTeste } from '@/services/jornadas/simulador'
import { variaveisNoTexto } from '@/services/jornadas/validar'
import type { ApoioDoEditor, Catalogo, ChecagemDeEntrada, ContatoParaInscrever, ItemDaLinhaDoTempo, NoDoGrafo, VersaoDaJornada } from '@/services/jornadas/tipos'
import { rotuloDaVariavel } from './editor/variaveis'
import { ConversaNoCelular, type LinhaDaConversa } from './editor/PreviaNoCelular'
import { dataHora } from './apoio'
import './jornadas.css'

/**
 * Testar: um contato percorre o desenho. Cada passo mostra o que teria feito;
 * nas esperas, você adianta o relógio; nas respostas, escolhe o que o contato
 * responde. O caminho acende no canvas.
 *
 * P1 do benchmark (16/11), antes de começar:
 *  - escolher o contato de teste ou um contato de VERDADE (mascarado) e editar os
 *    dados do evento (data, hora, profissional), como o Braze;
 *  - as checagens "entraria?" (porta, filtro, reentrada, opt-out, outra
 *    jornada, horário), como o "Start checks" da HubSpot;
 *  - mandar as mensagens DE VERDADE para o meu WhatsApp, como o respond.io e a
 *    Twilio. Ninguém é inscrito e nada conta nos resultados.
 *
 * P2 (16/11, como o Kommo): enquanto roda, a conversa aparece num celular ao
 * lado, com as mensagens do caminho e as respostas que você escolhe.
 */

const TIPOS_DE_MENSAGEM = new Set(['send_template', 'send_text', 'send_and_wait', 'ask_question'])
const CONTATO_DE_TESTE = { id: null as string | null, name: CONTEXTO_DE_TESTE['contato.nome'], phoneMasked: CONTEXTO_DE_TESTE['contato.telefone'] }
/** Os dados que costumam mudar de um teste para outro, quando o desenho não usa nenhum. */
const DADOS_PADRAO = ['conector.agenda.data', 'conector.agenda.hora', 'conector.agenda.profissional']
/** A largura da gaveta: com a conversa no celular, cabe o aparelho ao lado. */
const LARGURA_PREPARAR = 440
const LARGURA_RODANDO = 740

/** Uma resposta típica para cada tipo de pergunta (só para a bolha do contato no teste). */
const RESPOSTA_DE_EXEMPLO: Record<string, string> = { text: 'Pode ser de manhã', number: '2', date: '18/11', email: 'contato@exemplo.com', rating: '9' }

/** O que a escolha de quem testa vira no celular: uma bolha do contato, um aviso no meio ou nada (ramo interno). */
function escolhaNoCelular(no: NoDoGrafo | undefined, it: ItemDaLinhaDoTempo, hora: string): LinhaDaConversa[] {
  const c = it.choice!
  if (c.key === 'sem_resposta') return [{ tipo: 'aviso', texto: 'Sem resposta · o prazo acabou' }]
  switch (no?.type) {
    case 'send_and_wait':
      return [{ tipo: 'contato', texto: c.key === 'outra_resposta' ? 'Posso remarcar para outro dia?' : c.label, hora }]
    case 'ask_question': {
      if (c.key === 'invalida') return [{ tipo: 'contato', texto: 'não sei', hora }]
      const opcoes = Array.isArray(no.params.options) ? (no.params.options as unknown[]).filter((x): x is string => typeof x === 'string' && !!x.trim()) : []
      const tipo = String(no.params.answerType ?? 'text')
      return [{ tipo: 'contato', texto: tipo === 'option' && opcoes[0] ? opcoes[0] : RESPOSTA_DE_EXEMPLO[tipo] ?? RESPOSTA_DE_EXEMPLO.text, hora }]
    }
    case 'wait_event': {
      // Apertou um botão do modelo ou escreveu: vira a bolha do contato. Outro evento: um aviso.
      const ev = (Array.isArray(no.params.events) ? no.params.events : []).find((e) => !!e && typeof e === 'object' && (e as { key?: string }).key === c.key) as { event?: string; match?: string } | undefined
      if (ev?.event === 'template.button_replied' && ev.match) return [{ tipo: 'contato', texto: ev.match.split('|')[0].trim(), hora }]
      if (ev?.event === 'message.received') return [{ tipo: 'contato', texto: 'Oi, tenho uma dúvida.', hora }]
      return [{ tipo: 'aviso', texto: `Aconteceu: ${c.label}` }]
    }
    case 'ai_classify': return [{ tipo: 'aviso', texto: `A IA entendeu: ${c.label}` }]
    case 'branch_message_status': return [{ tipo: 'aviso', texto: c.label }]
    default: return []
  }
}

export function TestarJornada({ open, onClose, jornadaId, versao, catalogo, apoio, onEstado, onIrAoPasso }: {
  open: boolean
  onClose: () => void
  jornadaId: string
  versao: VersaoDaJornada
  catalogo: Catalogo
  apoio: ApoioDoEditor
  onEstado: (e: EstadoDoTeste | null) => void
  /** `gaveta`: a largura da gaveta, para o passo aparecer fora dela. */
  onIrAoPasso: (nodeId: string, gaveta?: number) => void
}) {
  const { toast } = useToast()
  const [fase, setFase] = useState<'preparar' | 'rodando'>('preparar')
  const [estado, setEstado] = useState<EstadoDoTeste | null>(null)
  const [contato, setContato] = useState(CONTATO_DE_TESTE)
  const [valores, setValores] = useState<Record<string, string>>({ ...CONTEXTO_DE_TESTE })
  const [busca, setBusca] = useState('')
  const [achados, setAchados] = useState<ContatoParaInscrever[]>([])
  const [checagens, setChecagens] = useState<ChecagemDeEntrada[] | null>(null)
  const [deVerdade, setDeVerdade] = useState(false)
  const [enviados, setEnviados] = useState<Record<number, string>>({})
  const jaEnviados = useRef(new Set<number>())
  const ctx = { versao, catalogo, apoio, valores }
  const largura = fase === 'rodando' ? LARGURA_RODANDO : LARGURA_PREPARAR
  const irAoPasso = (id: string) => onIrAoPasso(id, largura)

  // A conversa no celular (P2, 16/11): as mensagens do caminho e as respostas escolhidas.
  const linhas = useMemo<LinhaDaConversa[]>(() => (estado?.itens ?? []).flatMap((it): LinhaDaConversa[] => {
    const hora = new Date(it.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const no = it.nodeId ? versao.graph.nodes[it.nodeId] : undefined
    if (it.clockTo) return [{ tipo: 'aviso', texto: `Relógio adiantado · ${dataHora(it.clockTo)}` }]
    if (it.choice) return escolhaNoCelular(no, it, hora)
    if (it.status === 'shadow' && no && TIPOS_DE_MENSAGEM.has(it.nodeType)) return [{ tipo: 'empresa', no, hora }]
    return []
  }), [estado, versao.graph.nodes])
  const linhaId = useMemo(() => Object.values(versao.graph.nodes).find((n) => TIPOS_DE_MENSAGEM.has(n.type) && n.params.whatsappNumberId)?.params.whatsappNumberId as string | undefined, [versao.graph.nodes])

  // Os dados que o desenho usa (para editar antes de testar).
  const dadosDoDesenho = useMemo(() => {
    const usados = new Set<string>()
    for (const no of Object.values(versao.graph.nodes)) {
      for (const v of Object.values(no.params)) {
        const textos = typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
        for (const t of textos) for (const nome of variaveisNoTexto(t)) if (nome in CONTEXTO_DE_TESTE && !nome.startsWith('contato.')) usados.add(nome)
      }
    }
    return usados.size ? [...usados].slice(0, 6) : DADOS_PADRAO
  }, [versao.graph.nodes])

  // Ao abrir: volta ao preparo, com o contato de teste.
  useEffect(() => {
    if (!open) { setEstado(null); return }
    setFase('preparar')
    setEstado(null)
    onEstado(null)
    setContato(CONTATO_DE_TESTE)
    setValores({ ...CONTEXTO_DE_TESTE })
    setBusca('')
    setEnviados({})
    jaEnviados.current = new Set()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Busca de contatos de verdade (mascarados).
  useEffect(() => {
    if (!open || fase !== 'preparar' || !busca.trim()) { setAchados([]); return }
    let vivo = true
    const t = setTimeout(() => { jornadasApi.buscarContatos(busca).then((r) => { if (vivo) setAchados(r.slice(0, 5)) }) }, 200)
    return () => { vivo = false; clearTimeout(t) }
  }, [busca, open, fase])

  // "Entraria?": refaz quando o contato ou os dados mudam (com uma pausa curta enquanto digita).
  const chaveDosValores = JSON.stringify(valores)
  useEffect(() => {
    if (!open || fase !== 'preparar') return
    let vivo = true
    const t = setTimeout(() => {
      jornadasApi.checarEntrada(jornadaId, { contactId: contato.id, valores: JSON.parse(chaveDosValores) as Record<string, string> })
        .then((r) => { if (vivo) setChecagens(r) })
        .catch(() => { if (vivo) setChecagens([]) })
    }, 250)
    return () => { vivo = false; clearTimeout(t) }
  }, [open, fase, contato.id, jornadaId, chaveDosValores])

  const escolherContato = async (c: ContatoParaInscrever | null) => {
    setBusca('')
    setAchados([])
    if (!c) { setContato(CONTATO_DE_TESTE); setValores({ ...CONTEXTO_DE_TESTE }); return }
    setContato({ id: c.id, name: c.name, phoneMasked: c.phoneMasked })
    try { setValores(await jornadasApi.contextoDoContato(jornadaId, c.id)) } catch { /* fica com os dados de teste */ }
  }

  // Com "de verdade", cada mensagem nova do teste sai para o WhatsApp de quem testa.
  const enviarNovas = (e: EstadoDoTeste) => {
    if (!deVerdade) return
    e.itens.forEach((it, i) => {
      if (jaEnviados.current.has(i) || !it.nodeId || it.status !== 'shadow' || !TIPOS_DE_MENSAGEM.has(it.nodeType)) return
      jaEnviados.current.add(i)
      jornadasApi.enviarTeste(jornadaId, it.nodeId, { contactId: contato.id, valores })
        .then((r) => setEnviados((m) => ({ ...m, [i]: r.to })))
        .catch((err) => toast(err instanceof Error ? err.message : 'Não deu para enviar o teste.', 'error'))
    })
  }

  const mudar = (e: EstadoDoTeste | null) => {
    setEstado(e)
    onEstado(e)
    if (e) enviarNovas(e)
    const atual = e?.pausa?.nodeId ?? e?.noAtual
    if (atual) onIrAoPasso(atual, LARGURA_RODANDO)
  }

  const comecar = () => {
    jaEnviados.current = new Set()
    setEnviados({})
    setFase('rodando')
    mudar(iniciarTeste(ctx))
  }

  const barrado = checagens?.find((c) => !c.ok)

  return (
    <Drawer open={open} onClose={onClose} side="right" className={fase === 'rodando' ? 'w-[740px]' : 'w-[440px]'} ariaLabel="Testar a jornada">
      <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2 border-b border-surface-700 px-4 py-3">
          <FlaskConical className="w-4 h-4 mt-0.5 text-surface-300" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-50">Testar a jornada</p>
            <p className="text-xs text-surface-400">{fase === 'preparar' ? 'Escolha quem testa e com que dados. Ninguém é inscrito.' : `Testando com ${contato.name.replace(/\.$/, '')}. O relógio só anda para este teste.`}</p>
          </div>
          {fase === 'preparar' && <Button variant="ghost" size="sm" iconOnly aria-label="Fechar o teste" onClick={onClose}><X className="w-4 h-4" /></Button>}
        </div>

        {fase === 'preparar' ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            <section className="space-y-2">
              <p className="text-[14px] font-semibold text-surface-100">Quem testa</p>
              <div className="flex items-center gap-2.5 rounded-[10px] bg-surface-800 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-700 text-surface-300"><UserRound className="h-4 w-4" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-surface-50">{contato.name}</span>
                  <span className="block text-[12px] text-surface-400">{contato.id ? `Contato de verdade · ${contato.phoneMasked}` : 'Contato de teste, com dados inventados'}</span>
                </span>
                {contato.id && <Button variant="ghost" size="sm" onClick={() => escolherContato(null)}>Usar o de teste</Button>}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" aria-hidden />
                <Input size="sm" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Testar com um contato de verdade: nome ou final do telefone" aria-label="Buscar um contato de verdade" />
                {achados.length > 0 && (
                  <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-[10px] border border-surface-700 bg-surface-900 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
                    {achados.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => escolherContato(c)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[14px] text-surface-100 hover:bg-[var(--rowhover)] cursor-pointer">
                          <span>{c.name}</span><span className="text-[12px] tabular-nums text-surface-400">{c.phoneMasked}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[14px] font-semibold text-surface-100">Dados do teste</p>
              <p className="text-[12px] text-surface-400">Mude para ver outro caso (ex.: outro horário ou profissional).</p>
              <div className="grid grid-cols-2 gap-2">
                {dadosDoDesenho.map((chave) => (
                  <label key={chave} className="block">
                    <span className="mb-1 block text-[12px] text-surface-400">{rotuloDaVariavel(chave)}</span>
                    <Input size="sm" value={valores[chave] ?? ''} onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))} />
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[14px] font-semibold text-surface-100">Entraria?</p>
              {!checagens ? <p className="text-[12px] text-surface-400">Conferindo…</p> : (
                <ul className="space-y-1.5">
                  {checagens.map((c) => (
                    <li key={c.regra} className="flex items-start gap-2.5 rounded-[8px] bg-surface-800 px-3 py-2">
                      <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full', c.ok ? 'jt-verde' : 'jt-vermelho')} aria-label={c.ok ? 'passa' : 'não passa'}>
                        {c.ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] text-surface-100">{c.regra}</span>
                        <span className="block text-[12px] leading-snug text-surface-400">{c.detalhe}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex items-start justify-between gap-3 rounded-[10px] border border-surface-700 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-surface-100">Mandar as mensagens de verdade para o meu WhatsApp</p>
                <p className="mt-0.5 text-[12px] leading-snug text-surface-400">Cada mensagem do caminho chega no seu número, com estes dados. Ninguém mais recebe.</p>
              </div>
              <Switch checked={deVerdade} onChange={setDeVerdade} aria-label="Mandar as mensagens de verdade para o meu WhatsApp" />
            </section>
          </div>
        ) : (
          <ol className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {(estado?.itens ?? []).map((it, i) => (
              <li key={i} className="jornadas-aparecer flex gap-2.5">
                <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', it.status === 'waiting' ? 'bg-status-pending' : it.status === 'failed' ? 'bg-[var(--color-danger)]' : it.status === 'shadow' ? 'bg-[var(--color-accent-violet)]' : 'bg-surface-500')} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-surface-100">
                    {it.nodeId ? <button type="button" className="hover:underline text-left" onClick={() => irAoPasso(it.nodeId!)}>{it.title}</button> : it.title}
                    <span className="ml-2 text-[12px] font-normal text-surface-500 tabular-nums">{dataHora(it.at)}</span>
                  </p>
                  <p className="text-xs text-surface-400 leading-relaxed break-words">{it.detail}</p>
                  {enviados[i] && <p className="mt-1 inline-flex items-center gap-1 rounded-[6px] jt-verde px-1.5 py-0.5 text-[12px] font-medium"><Send className="h-3 w-3" aria-hidden />Chegou no seu WhatsApp ({enviados[i]})</p>}
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="border-t border-surface-700 px-4 py-3 space-y-2.5">
          {fase === 'preparar' ? (
            <>
              {barrado && <p className="flex items-start gap-2 rounded-[8px] jt-ambar px-3 py-2 text-[12px] leading-snug"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />Este contato não entraria ({barrado.regra.toLowerCase()}). Dá para testar o caminho mesmo assim.</p>}
              <Button className="w-full" leftIcon={<Play className="w-4 h-4" />} onClick={comecar}>Começar o teste</Button>
            </>
          ) : (
            <>
              {estado?.terminou ? (
                <div className={cn('flex items-start gap-2 rounded-[8px] px-3 py-2 text-sm', estado.terminou.como === 'erro' ? 'jt-vermelho' : 'bg-surface-800 text-surface-100')}>
                  {estado.terminou.como === 'erro' ? <CircleAlert className="w-4 h-4 mt-0.5 text-[var(--color-danger)]" aria-hidden /> : <Trophy className="w-4 h-4 mt-0.5 text-brand-500" aria-hidden />}
                  <span>{estado.terminou.texto}</span>
                </div>
              ) : estado?.pausa?.tipo === 'escolha' ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-surface-200">{estado.pausa.pergunta}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {estado.pausa.opcoes.map((o) => (
                      <Button key={o.key} variant="secondary" size="sm" onClick={() => mudar(avancarTeste(estado, ctx, o.key))}>{o.label}</Button>
                    ))}
                  </div>
                </div>
              ) : estado?.pausa?.tipo === 'relogio' ? (
                <Button size="sm" leftIcon={<FastForward className="w-4 h-4" />} onClick={() => mudar(avancarTeste(estado, ctx))}>
                  Adiantar o relógio para {dataHora(new Date(estado.pausa.ate).toISOString())}
                </Button>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={comecar}>Recomeçar</Button>
                <Button variant="ghost" size="sm" leftIcon={<UserRound className="w-4 h-4" />} onClick={() => { setFase('preparar'); setEstado(null); onEstado(null) }}>Trocar contato ou dados</Button>
              </div>
            </>
          )}
        </div>
      </div>
      {fase === 'rodando' && (
        <div className="flex w-[300px] shrink-0 flex-col border-l border-surface-700 bg-surface-950">
          <div className="flex shrink-0 items-center gap-2 px-4 py-3">
            <p className="min-w-0 flex-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">Como chega no WhatsApp</p>
            <Button variant="ghost" size="sm" iconOnly aria-label="Fechar o teste" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <ConversaNoCelular linhas={linhas} apoio={apoio} dados={valores} linhaId={linhaId} />
          <p className="shrink-0 px-4 pb-4 pt-2 text-center text-[12px] leading-4 text-surface-500">{deVerdade ? 'Também chega no seu WhatsApp.' : 'Só no teste: ninguém recebe.'}</p>
        </div>
      )}
      </div>
    </Drawer>
  )
}
