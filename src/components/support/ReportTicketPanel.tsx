import { Fragment, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Check, ChevronDown, ChevronRight, CircleHelp, CopyPlus, Flag, Loader2, MessageSquare, MessagesSquare, MousePointerClick, Paperclip, Plus, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { Tooltip } from '@/components/ui/Tooltip'
import { useLayer } from '@/contexts/LayerContext'
import { useRelogioDoMinuto } from '@/hooks/useRelogioDoMinuto'
import { cn } from '@/lib/utils'
import { AREAS_DO_PRODUTO, CONTATO_VIU, CONTORNOU, IMPEDE_AGORA, JA_CORRIGIRAM, QUEM_MAIS, TIPOS_DE_PEDIDO, DESDE_QUANDO, dataCurta, tituloDoChamado, type Alcance, type ContatoViu, type Contornou, type ImpedeAgora, type JaCorrigiram, type QuemMais, type TipoDePedido, type DesdeQuando } from './supportModel'
import { ORIGENS_DA_MENSAGEM } from './origemDaMensagem'
import { ICONE, NOME, autorDe, hora } from './rotulosDoChamado'
import { ConversasAfetadas } from './ConversasAfetadas'
import { useDadosDoSuporte, useSuporte } from './suporteDaConversa'
import { useMarcacao } from './marcacaoDoChamado'
import { TIPOS_DO_ANEXO, useFormularioDoChamado, type PropsDoFormulario } from './useFormularioDoChamado'
import { linhasDoContexto, resumoDoContexto } from './contextoTecnico'
import type { Message } from '@/types'
import './suporte.css'

/** Alcance com rótulo curto (o painel tem a largura do painel do contato); [conversa, plataforma]. */
const ALCANCE_CURTO: Record<Alcance, [string, string]> = {
  esta_conversa: ['Só nesta conversa', 'Só comigo'],
  outras_conversas: ['Outras conversas também', 'Outras pessoas também'],
  parando_agora: ['Parando o atendimento', 'Parando o atendimento'],
}

function duracao(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h${min % 60 ? ` ${min % 60} min` : ''}`
  const d = Math.floor(h / 24)
  return `${d} ${d > 1 ? 'dias' : 'dia'}`
}

/** Conversa inteira: em vez de citações, os FATOS que importam para "não aconteceu". */
function FatosDaConversa({ todas, contatoNome }: { todas: readonly Message[]; contatoNome: string | null }) {
  // "Sem resposta há" anda sozinho (o relógio do app avança a cada minuto).
  const agora = useRelogioDoMinuto()
  const ordenadas = [...todas].sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  const doContato = ordenadas.filter((m) => m.direction === 'inbound')
  const ultimaDoContato = doContato[doContato.length - 1]
  const ultima = ordenadas[ordenadas.length - 1]
  const respostas = ordenadas.filter((m) => m.direction !== 'inbound')
  const ultimaResposta = respostas[respostas.length - 1]
  const semResposta = ultima && ultima.direction === 'inbound'
  const fatos: Array<[string, string]> = [
    ['Última do contato', ultimaDoContato ? hora(ultimaDoContato.sentAt) : '—'],
    semResposta ? ['Sem resposta há', duracao(agora - new Date(ultima.sentAt).getTime())] : ['Última resposta', ultimaResposta ? hora(ultimaResposta.sentAt) : '—'],
    ['Mensagens', String(ordenadas.length)],
    ['Respondeu por último', ultimaResposta ? autorDe(ultimaResposta, contatoNome) : 'Ninguém'],
  ]
  return (
    <div className="sup-cartao sup-familia-conversa px-3 py-2.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <span className="sup-cartao-icone w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0"><MessagesSquare className="w-[15px] h-[15px]" strokeWidth={2} /></span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-surface-100">A conversa inteira</span>
          <span className="block text-[11px] text-surface-400">Para o que não aconteceu: falta de resposta, demora, transferência</span>
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2.5 border-t border-[var(--bd2)]" aria-label="Resumo da conversa">
        {fatos.map(([r, v]) => (
          <div key={r} className="min-w-0">
            <dt className="text-[11px] text-surface-400">{r}</dt>
            <dd className="text-[13px] font-semibold text-surface-100 truncate">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** "?" ao lado do rótulo: explica o que preencher (hover ou foco pelo teclado). */
export function Ajuda({ texto }: { texto: string }) {
  return (
    <span className="inline-flex align-middle ml-1">
      <Tooltip content={texto} side="top" wide>
        <button type="button" aria-label={texto}
          className="w-4 h-4 inline-flex items-center justify-center rounded-full text-surface-500 hover:text-surface-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bd2)]">
          <CircleHelp className="w-3 h-3" />
        </button>
      </Tooltip>
    </span>
  )
}

const AJUDA = {
  tipo: 'Mensagens: o problema está em mensagens específicas, que você marca no chat. Conversa inteira: algo que não aconteceu, como falta de resposta, demora ou transferência.',
  relato: 'Conte com suas palavras o que deu errado: o que foi dito ou feito e por que está errado. Dá para colar um print (Ctrl+V) ou anexar arquivos.',
  esperado: 'O que deveria ter acontecido. Ajuda a equipe a corrigir mais rápido e vira um teste automático para o erro não voltar.',
  problema: 'Entre as mensagens marcadas, de quem é o problema: IA, automação, regra ou equipe.',
  onde: 'A área do produto em que o problema apareceu.',
  alcance: 'Se o mesmo problema aconteceu em outras conversas. Se sim, você pode indicar quais.',
  terceiros: 'Ligue se apareceram dados de outra pessoa ou empresa. A equipe Oryon confere esses casos primeiro.',
  afetadas: 'Outras conversas com o mesmo problema. Ajuda a medir o alcance e a juntar chamados iguais.',
  desde: 'Quando você percebeu o problema pela primeira vez.',
  assunto: 'Opcional. Ajuda a encaminhar o chamado para quem resolve.',
  tipoDePedido: 'Escolha o que mais se parece com o seu caso. Isso leva o chamado direto para quem resolve: defeitos para a equipe técnica, dúvidas para o atendimento, sugestões para o produto e cobrança para o financeiro.',
  contornou: 'Se você conseguiu fazer o que precisava de outro jeito (outra tela, outro caminho, à mão).',
  quemMais: 'Se outras pessoas da sua equipe estão vendo o mesmo problema. Se não sabe, tudo bem: a Oryon confere.',
  impede: 'O que ficou impossível de fazer por causa disso agora. Marque só o que está impedido de verdade.',
  contatoViu: 'O que chegou ao contato: a informação errada, nenhuma resposta, ou nada (o problema foi visto antes).',
  jaCorrigiram: 'Se alguém da equipe já falou com o contato para corrigir.',
  complementoDefeito: 'A ação que você queria fazer quando o problema apareceu. Com isso a equipe consegue repetir o caminho.',
  complementoSugestao: 'O que muda no dia a dia de vocês. Ajuda a priorizar a ideia.',
}

/** Rótulos e exemplos do formulário sem conversa, por tipo de pedido. */
const TEXTOS_DO_TIPO: Record<TipoDePedido, { relato: string; exemplo: string; complemento?: string; exemploComplemento?: string }> = {
  defeito: { relato: 'O que aconteceu?', exemplo: 'Ex.: cliquei em Salvar, apareceu "erro ao salvar" e a etapa não mudou.', complemento: 'O que você estava tentando fazer?', exemploComplemento: 'Ex.: mover um negócio para a etapa Agendado.' },
  lentidao: { relato: 'O que está demorando?', exemplo: 'Ex.: a lista de conversas leva uns 20 segundos para abrir.' },
  duvida: { relato: 'O que você quer fazer?', exemplo: 'Ex.: quero que a IA só responda em horário comercial.' },
  sugestao: { relato: 'O que você gostaria?', exemplo: 'Ex.: filtrar os contatos pela data do último atendimento.', complemento: 'Por que isso ajudaria?', exemploComplemento: 'Ex.: hoje exportamos para uma planilha toda segunda.' },
  cobranca: { relato: 'Qual é a sua dúvida?', exemplo: 'Ex.: a fatura deste mês veio com um valor diferente do plano.' },
}

/** Uma linha "rótulo · valor", como os atributos do ticket no Intercom. */
export function Linha({ rotulo, obrigatorio, ajuda, children, alinhar = 'center' }: { rotulo: string; obrigatorio?: boolean; ajuda?: string; children: ReactNode; alinhar?: 'center' | 'start' }) {
  return (
    <div className={cn('flex gap-3 min-h-[34px]', alinhar === 'center' ? 'items-center' : 'items-start pt-1.5')}>
      <span className="w-[100px] flex-shrink-0 text-xs text-surface-400 inline-flex items-center">
        <span className="truncate">{rotulo}</span>{obrigatorio && <span className="text-danger" aria-hidden>&nbsp;*</span>}
        {ajuda && <Ajuda texto={ajuda} />}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

/** Valor da linha: mostra a escolha ou "+ Adicionar"; abre a lista do app. */
export function EscolhaEmLinha<T extends string>({ valor, opcoes, onChange, rotulo, vazio = 'Adicionar', limpar }: {
  valor: T | null
  opcoes: Array<[T, string]>
  onChange: (v: T | null) => void
  rotulo: string
  vazio?: string
  limpar?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [lado, setLado] = useState<'left' | 'right'>('left')
  const atual = opcoes.find(([k]) => k === valor)
  return (
    <Dropdown
      open={aberto}
      onClose={() => setAberto(false)}
      // O menu abre logo abaixo do campo, alinhado à esquerda dele. Perto da
      // borda direita (o painel encosta nela), vira para a direita do botão e
      // cresce para dentro — nunca vaza da janela.
      align={lado}
      className="w-[220px] max-w-[calc(100vw-24px)]"
      wrapperClassName="inline-flex max-w-full min-w-0 align-top -ml-2"
      anchor={
        <button type="button" onClick={(e) => {
          e.currentTarget.scrollIntoView({ block: 'nearest' })
          setLado(window.innerWidth - e.currentTarget.getBoundingClientRect().left < 220 + 16 ? 'right' : 'left')
          setAberto((v) => !v)
        }} aria-haspopup="menu" aria-expanded={aberto} aria-label={`${rotulo}: ${atual?.[1] ?? 'não informado'}`}
          // Menu aberto: o campo fica destacado (fundo de seleção + contorno da marca) até fechar.
          className={cn('group h-8 px-2 w-fit max-w-full rounded-[6px] flex items-center gap-1.5 text-[13px] transition-colors',
            aberto ? 'bg-[var(--sel)] shadow-[inset_0_0_0_1px_var(--color-brand-500)]' : 'hover:bg-[var(--rowhover)]')}>
          {atual
            ? <span className="text-surface-100 truncate">{atual[1]}</span>
            : <span className="flex items-center gap-1 text-surface-400 group-hover:text-surface-200"><Plus className="w-3.5 h-3.5" />{vazio}</span>}
          {atual && <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 transition-transform', aberto ? 'rotate-180 text-surface-200' : 'text-surface-500')} />}
        </button>
      }
    >
      {opcoes.map(([k, l]) => (
        <DropdownItem key={k} active={k === valor} onClick={() => { onChange(k); setAberto(false) }}>
          <span className="flex-1">{l}</span>{k === valor && <Check className="w-3.5 h-3.5 text-accent-dark" />}
        </DropdownItem>
      ))}
      {limpar && valor && (
        <>
          <DropdownSeparator />
          <DropdownItem onClick={() => { onChange(null); setAberto(false) }}><span className="text-surface-400">Limpar</span></DropdownItem>
        </>
      )}
    </Dropdown>
  )
}

/**
 * ABRIR CHAMADO EM PAINEL LATERAL — ocupa o lugar do painel do contato, com a
 * conversa visível e a MARCAÇÃO AO VIVO: clicar numa mensagem do chat inclui
 * ou tira do chamado, sem fechar nada. Desenho tirado do Intercom (2026): o
 * que a pessoa escreve em cima; os detalhes em linhas "rótulo · valor" que só
 * abrem uma lista curta quando ela quer. Obrigatórios: o relato e os fatos
 * (o contato viu; já corrigiram, quando viu). A prioridade não aparece.
 *
 * `variante`: "painel" (padrão) ao lado do chat; "folha" no celular (o mesmo
 * painel em tela cheia, por cima do chat); "modal" quando NÃO há conversa
 * (página Suporte e "Falar com o suporte"): sem nada para manter à vista, o
 * painel só competiria com a tela de trás. Mesmo conteúdo; muda o recipiente.
 *
 * Esc fecha. Painel e folha entram na pilha de camadas (LayerContext), como o
 * Modal: um menu aberto dentro do formulário fecha antes, sozinho. Como
 * diálogo (não modal no computador), o painel também pausa os atalhos J/K/E/R
 * da página de Conversas (ver lib/sobreposicaoAberta.ts) — trocar de
 * conversa ou resolver com o chamado pela metade perderia o relato.
 *
 * `oculto` (só a folha): a pessoa voltou ao chat para marcar mais mensagens.
 * A folha fica montada e escondida — o relato e as respostas continuam — e,
 * escondida, sai da pilha de camadas e deixa de ser diálogo.
 */
export function ReportTicketPanel(props: PropsDoFormulario & { className?: string; variante?: 'painel' | 'folha' | 'modal'; oculto?: boolean }) {
  const { onClose, conversationId, contatoNome, mensagens, todasAsMensagens = [], className, variante = 'painel', oculto = false } = props
  const f = useFormularioDoChamado(props)
  const s = useSuporte()
  const [verAfetadas, setVerAfetadas] = useState(false)
  const tituloId = useId()
  const { zIndex } = useLayer(variante !== 'modal' && !oculto, onClose)
  // A folha reaparece (voltou da marcação): o foco volta ao relato.
  useEffect(() => {
    if (variante === 'folha' && !oculto) document.getElementById('painel-relato')?.focus()
  }, [variante, oculto])

  // Em "Mensagens" sem nada marcado a origem interna ainda é "conversa": a cor e o conteúdo seguem a escolha.
  const familia = f.aguardandoMarcacao ? 'mensagem' : f.origem === 'conversa' ? 'conversa' : f.origem === 'plataforma' ? 'plataforma' : 'mensagem'
  const Icone = ICONE[f.origem]
  const ordenadas = [...mensagens].sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  const { sobre, onSobre } = props
  const textosDoTipo = f.semConversa && f.tipo ? TEXTOS_DO_TIPO[f.tipo] : null
  // Sem conversa, o resto do formulário só aparece depois do tipo.
  const mostrarResto = !f.semConversa || !!f.tipo
  const temDetalhes = !f.semConversa || !!(f.camposDoTipo?.onde || f.camposDoTipo?.fatos || f.camposDoTipo?.desde || f.camposDoTipo?.terceiros) || (f.modelo?.camposDaEmpresa.length ?? 0) > 0
  const anexosComErro = f.anexos.filter((a) => a.estado === 'erro')
  const campoComplemento = textosDoTipo?.complemento ? (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center"><label htmlFor="painel-complemento" className="text-xs font-semibold text-surface-200">
        {textosDoTipo.complemento}<span className="font-normal text-surface-400"> · opcional</span>
      </label><Ajuda texto={f.tipo === 'sugestao' ? AJUDA.complementoSugestao : AJUDA.complementoDefeito} /></span>
      <Textarea id="painel-complemento" rows={2} maxLength={1000} value={f.complemento} onChange={(e) => f.setComplemento(e.target.value)} placeholder={textosDoTipo.exemploComplemento} />
    </div>
  ) : null

  const botoes = (
    <>
      <Button variant="neutral" size="sm" onClick={onClose}>Cancelar</Button>
      <Button size="sm" onClick={f.enviar} loading={f.enviando} disabled={!f.pronto} leftIcon={<Flag className="w-3.5 h-3.5" />}>
        {f.juntarEm ? 'Adicionar' : 'Enviar'}
      </Button>
    </>
  )
  const avisoDosAnexos = f.anexosEnviando ? <span className="text-[11px] text-surface-400" role="status">Enviando anexos…</span> : null
  const corpo = (
      <div className={cn('flex flex-col gap-4', variante === 'modal' ? 'px-5 py-4' : 'flex-1 min-h-0 overflow-y-auto px-4 py-4')}>
        {/* Sobre o quê: escolha EXPLÍCITA entre mensagens marcadas e a conversa inteira. */}
        {!f.juntarEm && conversationId && sobre && onSobre && (
          <div className="flex items-center gap-1.5">
          <div className="sup-tipo flex-1" role="radiogroup" aria-label="O chamado é sobre">
            <button type="button" role="radio" aria-checked={sobre === 'mensagens'} className="sup-tipo-msg" onClick={() => onSobre('mensagens')}>
              <MessageSquare className="w-3.5 h-3.5" />Mensagens{mensagens.length > 0 ? ` · ${mensagens.length}` : ''}
            </button>
            <button type="button" role="radio" aria-checked={sobre === 'conversa'} className="sup-tipo-conv" onClick={() => onSobre('conversa')}>
              <MessagesSquare className="w-3.5 h-3.5" />Conversa inteira
            </button>
          </div>
            <Ajuda texto={AJUDA.tipo} />
          </div>
        )}

        {!f.juntarEm && (
          <section className="flex flex-col gap-2">
            {f.aguardandoMarcacao ? (
              <div className="rounded-[10px] border border-dashed border-[var(--bd2)] px-3 py-3 flex items-start gap-2.5">
                <MousePointerClick className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--sup-msg-fg)' }} />
                <p className="text-xs text-surface-200">
                  <b>Clique nas mensagens do problema</b> no chat. Se o problema é algo que não aconteceu, como a IA não responder, escolha <b>Conversa inteira</b>.
                </p>
              </div>
            ) : familia !== 'conversa' && (
              // Mesmo cartão da conversa inteira, com outro conteúdo: as bolhas citadas.
              <div className={cn('sup-cartao px-3 py-2.5 flex flex-col gap-2.5', `sup-familia-${familia}`)}>
                <div className="flex items-center gap-2.5">
                  <span className="sup-cartao-icone w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0"><Icone className="w-[15px] h-[15px]" strokeWidth={2} /></span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-surface-100 truncate">
                      {NOME[f.origem]}{f.nomeDaOrigem ? <span className="font-normal text-surface-300"> · {f.nomeDaOrigem}</span> : null}
                    </span>
                    <span className="block text-[11px] text-surface-400">
                      {familia === 'plataforma' ? 'Para algo fora de uma conversa' : s.ligado && !s.emPainel ? 'Toque em Mensagens para marcar outras' : 'Clique em outras mensagens do chat para incluir'}
                    </span>
                  </span>
                </div>
                {conversationId && mensagens.length > 0 && (
                  <ul className="flex flex-col gap-1.5 pt-2.5 border-t border-[var(--bd2)] max-h-[156px] overflow-y-auto" aria-label="Mensagens marcadas">
                    {ordenadas.map((m) => (
                      <li key={m.id} className="sup-faixa-citacao group pl-2.5 flex items-center gap-2 min-w-0">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold text-surface-300">{autorDe(m, contatoNome)} · {hora(m.sentAt)}</span>
                          <span className="block text-[12.5px] text-surface-100 truncate">{m.body ?? '(mídia)'}</span>
                        </span>
                        {s.ligado && (
                          <button type="button" onClick={() => s.alternar(m.id)} aria-label="Tirar do chamado" title="Tirar do chamado"
                            className="w-6 h-6 rounded-[5px] flex items-center justify-center text-surface-500 hover:text-surface-100 hover:bg-[var(--rowhover)] opacity-60 group-hover:opacity-100 focus-visible:opacity-100">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {familia === 'conversa' && <FatosDaConversa todas={todasAsMensagens} contatoNome={contatoNome} />}
          </section>
        )}

        {/* Sem conversa: a 1ª pergunta é o tipo do pedido; o resto do formulário se adapta a ele. */}
        {!f.juntarEm && f.semConversa && (
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center"><span className="text-xs font-semibold text-surface-200">Do que se trata?<span className="text-danger" aria-hidden> *</span></span><Ajuda texto={AJUDA.tipoDePedido} /></span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Do que se trata">
              {(Object.keys(TIPOS_DE_PEDIDO) as TipoDePedido[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={f.tipo === k} data-autofocus={k === 'defeito' && !f.tipo ? true : undefined}
                  // Escolheu o tipo: o cursor vai direto para o campo de texto que apareceu.
                  onClick={() => { f.setTipo(k); requestAnimationFrame(() => document.getElementById(k === 'defeito' ? 'painel-complemento' : 'painel-relato')?.focus()) }}
                  className={cn('h-8 px-3 rounded-full text-xs font-semibold border transition-colors',
                    f.tipo === k ? 'sup-chip-escolhido border-transparent' : 'border-[var(--bd2)] text-surface-300 hover:bg-[var(--rowhover)]')}>
                  {TIPOS_DE_PEDIDO[k].nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {f.duplicado && (
          <div className="sup-cartao sup-familia-aviso px-3 py-2.5 flex gap-2.5" role="status">
            <span className="sup-cartao-icone w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0"><CopyPlus className="w-[15px] h-[15px]" strokeWidth={2} /></span>
            <div className="min-w-0 flex-1 flex flex-col gap-2">
              <p className="text-xs text-surface-200 leading-snug">
                <b className="sup-aviso-titulo block text-[13px]">Já existe o {f.duplicado.c.numero} aberto {f.duplicado.motivo}</b>
                {tituloDoChamado(f.duplicado.c)} · {dataCurta(f.duplicado.c.abertoEm)}. Se for o mesmo problema, junte a ele.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" onClick={() => f.setJuntarEm(f.duplicado!.c)}>Adicionar ao {f.duplicado.c.numero}</Button>
                <Button size="sm" variant="neutral" onClick={() => f.setEhOutro(true)}>É outro</Button>
              </div>
            </div>
          </div>
        )}
        {f.juntarEm && (
          <p className="text-xs text-surface-400">
            As mensagens marcadas e o seu relato entram no {f.juntarEm.numero}.{' '}
            <button type="button" onClick={() => { f.setJuntarEm(null); f.setEhOutro(true) }} className="text-accent-dark font-semibold hover:underline">Abrir um chamado novo</button>
          </p>
        )}

        {textosDoTipo?.complemento && f.camposDoTipo?.complemento === 'antes' && campoComplemento}

        {/* O que a pessoa escreve vem primeiro (sem conversa: só depois de escolher o tipo). */}
        {mostrarResto && (
        <div className="flex flex-col gap-1.5" onDrop={f.soltar} onDragOver={(e) => e.preventDefault()}>
          <span className="flex items-center"><label htmlFor="painel-relato" className="text-xs font-semibold text-surface-200">{textosDoTipo?.relato ?? 'O que aconteceu?'}<span className="text-danger" aria-hidden> *</span></label><Ajuda texto={AJUDA.relato} /></span>
          <Textarea id="painel-relato" data-autofocus rows={f.semConversa ? 3 : 4} maxLength={2000} value={f.relato} onChange={(e) => f.setRelato(e.target.value)} onPaste={f.colar} autoFocus={!f.semConversa}
            aria-required placeholder={textosDoTipo?.exemplo ?? (f.aguardandoMarcacao ? 'Conte o que deu errado. Dá para escrever enquanto marca as mensagens.' : f.modelo?.exemplos[f.origem] ?? '')} />
          <div className="flex flex-wrap items-center gap-1.5">
            {f.anexos.map((a) => (
              <span key={a.chave} title={a.erro}
                className={cn('inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-[6px] text-[11px] max-w-full',
                  a.estado === 'erro' ? 'bg-danger/[.12] text-danger' : 'bg-[var(--rowhover)] text-surface-200')}>
                {a.estado === 'enviando' ? <Loader2 className="w-3 h-3 flex-shrink-0 motion-safe:animate-spin" aria-hidden />
                  : a.estado === 'erro' ? <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden />
                  : <Paperclip className="w-3 h-3 flex-shrink-0" aria-hidden />}
                <span className="truncate">{a.nome}</span>
                {a.estado === 'enviando' && <span className="sr-only"> (enviando)</span>}
                <button type="button" aria-label={`Remover ${a.nome}`} onClick={() => f.removerAnexo(a.chave)} className="p-0.5 rounded hover:bg-[var(--rowhover)]"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {/* O input fica invisível (sr-only), mas segue no Tab: o anel aparece no rótulo. */}
            <label className="inline-flex items-center gap-1.5 text-[11px] text-surface-400 cursor-pointer hover:text-surface-200 rounded-[4px] focus-within:ring-1 focus-within:ring-[var(--bd2)] focus-within:text-surface-200">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="underline underline-offset-2">Anexar</span>
              <input type="file" multiple className="sr-only" accept={TIPOS_DO_ANEXO.join(',') + ',.csv'} onChange={(e) => { f.anexar([...(e.target.files ?? [])]); e.target.value = '' }} />
            </label>
            <span className="text-[11px] text-surface-400">ou cole um print</span>
          </div>
          {anexosComErro.length > 0 && (
            <ul className="flex flex-col gap-0.5" aria-live="polite">
              {anexosComErro.map((a) => <li key={a.chave} className="text-[11px] text-danger break-words">{a.nome}: {a.erro}</li>)}
            </ul>
          )}
        </div>
        )}

        {textosDoTipo?.complemento && f.camposDoTipo?.complemento === 'depois' && campoComplemento}

        {!f.juntarEm && f.perguntaEsperado && (
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center"><label htmlFor="painel-esperado" className="text-xs font-semibold text-surface-200">
              {f.perguntaEsperado.rotulo}<span className="font-normal text-surface-400"> · opcional</span>
            </label><Ajuda texto={AJUDA.esperado} /></span>
            <Textarea id="painel-esperado" rows={2} maxLength={1000} value={f.esperado} onChange={(e) => f.setEsperado(e.target.value)} placeholder={f.perguntaEsperado.exemplo} />
          </div>
        )}

        {/* Detalhes em linhas. Com conversa: os fatos obrigatórios. Sem conversa: as linhas do tipo. */}
        {!f.juntarEm && mostrarResto && temDetalhes && (
          <section className="flex flex-col border-t border-surface-700 pt-3" aria-label="Detalhes">
            {f.candidatas.length > 1 && (
              <Linha rotulo="Problema" ajuda={AJUDA.problema}>
                <EscolhaEmLinha rotulo="O problema é com" valor={f.origem} onChange={(o) => o && f.setOrigem(o)}
                  opcoes={f.candidatas.map((o) => [o, ORIGENS_DA_MENSAGEM[o as keyof typeof ORIGENS_DA_MENSAGEM]?.nome ?? o])} />
              </Linha>
            )}
            {f.semConversa && f.camposDoTipo?.onde && (
              <Linha rotulo="Onde" ajuda={AJUDA.onde}>
                <EscolhaEmLinha rotulo="Onde aconteceu" valor={f.onde || null} onChange={(v) => f.setOnde(v ?? '')} limpar
                  opcoes={AREAS_DO_PRODUTO.map((a) => [a, a])} />
              </Linha>
            )}
            {f.semConversa && f.camposDoTipo?.fatos && (<>
              <Linha rotulo="Contornou" obrigatorio ajuda={AJUDA.contornou}>
                <EscolhaEmLinha<Contornou> rotulo="Conseguiu fazer de outro jeito" valor={f.contornou} onChange={(v) => v && f.setContornou(v)} vazio="Selecionar"
                  opcoes={(Object.keys(CONTORNOU) as Contornou[]).map((k) => [k, CONTORNOU[k]])} />
              </Linha>
              <Linha rotulo="Mais alguém" obrigatorio ajuda={AJUDA.quemMais}>
                <EscolhaEmLinha<QuemMais> rotulo="Acontece com mais alguém" valor={f.quemMais} onChange={(v) => v && f.setQuemMais(v)} vazio="Selecionar"
                  opcoes={(Object.keys(QUEM_MAIS) as QuemMais[]).map((k) => [k, QUEM_MAIS[k]])} />
              </Linha>
              <Linha rotulo="Impede agora" ajuda={AJUDA.impede} alinhar="start">
                <div className="flex flex-wrap gap-1 py-0.5" role="group" aria-label="O que isso impede agora">
                  {(Object.keys(IMPEDE_AGORA) as ImpedeAgora[]).map((k) => {
                    const marcado = f.impede.includes(k)
                    return (
                      <button key={k} type="button" aria-pressed={marcado}
                        // "Nada urgente" exclui os outros, e vice-versa.
                        onClick={() => f.setImpede((l) => (marcado ? l.filter((x) => x !== k) : k === 'nada_urgente' ? ['nada_urgente'] : [...l.filter((x) => x !== 'nada_urgente'), k]))}
                        className={cn('h-7 px-2.5 rounded-full text-xs font-semibold border transition-colors',
                          marcado ? 'sup-chip-escolhido border-transparent' : 'border-[var(--bd2)] text-surface-300 hover:bg-[var(--rowhover)]')}>
                        {IMPEDE_AGORA[k]}
                      </button>
                    )
                  })}
                </div>
              </Linha>
            </>)}
            {!f.semConversa && (<>
            <Linha rotulo="Contato viu" obrigatorio ajuda={AJUDA.contatoViu}>
              <EscolhaEmLinha<ContatoViu> rotulo="O contato chegou a ver" valor={f.contatoViu} onChange={(v) => v && f.setContatoViu(v)} vazio="Selecionar"
                opcoes={(Object.keys(CONTATO_VIU) as ContatoViu[]).map((k) => [k, CONTATO_VIU[k]])} />
            </Linha>
            {f.perguntaCorrigiram && (
              <Linha rotulo="Corrigiram" obrigatorio ajuda={AJUDA.jaCorrigiram}>
                <EscolhaEmLinha<JaCorrigiram> rotulo="Já corrigiram com o contato" valor={f.jaCorrigiram} onChange={(v) => v && f.setJaCorrigiram(v)} vazio="Selecionar"
                  opcoes={(Object.keys(JA_CORRIGIRAM) as JaCorrigiram[]).map((k) => [k, JA_CORRIGIRAM[k]])} />
              </Linha>
            )}
            {/* Fato, não gravidade: "parando o atendimento" saiu (era uma nota). */}
            <Linha rotulo="Em outras" ajuda={AJUDA.alcance}>
              <EscolhaEmLinha<Alcance> rotulo="Aconteceu em outras conversas" valor={f.alcance} onChange={(v) => v && f.setAlcance(v)}
                opcoes={(['esta_conversa', 'outras_conversas'] as Alcance[]).map((a) => [a, ALCANCE_CURTO[a][0]])} />
            </Linha>
            </>)}
            {(!f.semConversa || f.camposDoTipo?.terceiros) && (
            <Linha rotulo="Terceiros" ajuda={AJUDA.terceiros}>
              <span className="flex items-center gap-2">
                <Switch checked={f.dadosDeTerceiros} onChange={f.setDadosDeTerceiros} aria-label="Envolve dados de outra pessoa ou empresa" />
                <span className="text-xs text-surface-400">{f.dadosDeTerceiros ? 'Dados de outra pessoa' : 'Não envolve'}</span>
              </span>
            </Linha>
            )}
            {f.perguntaAfetadas && (
              <>
                <Linha rotulo="Afetadas" ajuda={AJUDA.afetadas}>
                  <button type="button" onClick={() => setVerAfetadas((v) => !v)} aria-expanded={verAfetadas}
                    className="group h-8 -ml-2 px-2 rounded-[6px] flex items-center gap-1 text-[13px] hover:bg-[var(--rowhover)]">
                    {f.afetadas.length
                      ? <span className="text-surface-100">{f.afetadas.length} {f.afetadas.length > 1 ? 'conversas' : 'conversa'}</span>
                      : <span className="flex items-center gap-1 text-surface-400 group-hover:text-surface-200"><Plus className="w-3.5 h-3.5" />Adicionar</span>}
                    <ChevronDown className={cn('w-3.5 h-3.5 text-surface-500 transition-transform', verAfetadas && 'rotate-180')} />
                  </button>
                </Linha>
                {verAfetadas && <div className="pb-2"><ConversasAfetadas atual={conversationId} selecionadas={f.afetadas} onChange={f.setAfetadas} /></div>}
              </>
            )}
            {(f.semConversa ? f.camposDoTipo?.desde : f.perguntaDesde) && (
              <Linha rotulo="Desde" ajuda={AJUDA.desde}>
                <EscolhaEmLinha<DesdeQuando> rotulo="Desde quando" valor={f.desde} onChange={f.setDesde} limpar
                  opcoes={(Object.keys(DESDE_QUANDO) as DesdeQuando[]).map((d) => [d, DESDE_QUANDO[d]])} />
              </Linha>
            )}
            {!f.semConversa && f.assuntos.length > 0 && (
              <Linha rotulo="Assunto" ajuda={AJUDA.assunto}>
                <EscolhaEmLinha rotulo="Assunto" valor={f.assuntoId} onChange={f.setAssuntoId} limpar
                  opcoes={f.assuntos.map((a) => [a.id, a.titulo])} />
              </Linha>
            )}
            {(f.modelo?.camposDaEmpresa ?? []).map((c) => (
              <Linha key={c.id} rotulo={c.rotulo} obrigatorio={c.obrigatorio} ajuda={c.placeholder ? `Campo da sua empresa. Exemplo: ${c.placeholder}` : 'Campo cadastrado pela sua empresa para organizar os chamados.'}>
                {c.tipo === 'lista' ? (
                  <EscolhaEmLinha rotulo={c.rotulo} valor={f.campos[c.id] || null} onChange={(v) => f.setCampos((x) => ({ ...x, [c.id]: v ?? '' }))} limpar
                    opcoes={(c.opcoes ?? []).map((o) => [o, o])} />
                ) : (
                  <input value={f.campos[c.id] ?? ''} onChange={(e) => f.setCampos((x) => ({ ...x, [c.id]: e.target.value }))} placeholder={c.placeholder ?? 'Adicionar'} aria-label={c.rotulo}
                    maxLength={500} aria-required={c.obrigatorio || undefined}
                    className="w-full h-8 -ml-2 px-2 rounded-[6px] bg-transparent text-[13px] text-surface-100 placeholder:text-surface-400 hover:bg-[var(--rowhover)] focus:bg-surface-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bd2)]" />
                )}
              </Linha>
            ))}
          </section>
        )}

        <div>
          <button type="button" onClick={() => f.setVerContexto((v) => !v)} aria-expanded={f.verContexto} className="w-full flex items-center gap-2 py-1 text-left">
            <ShieldCheck className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
            <span className="text-[11px] text-surface-400 flex-1 min-w-0">
              {f.contexto ? <>Vai junto: <span className="text-surface-200">{resumoDoContexto(f.contexto)}</span>. Dados pessoais não são copiados.</> : 'O contexto técnico vai junto. Dados pessoais não são copiados.'}
            </span>
            <ChevronRight className={cn('w-3.5 h-3.5 text-surface-500 transition-transform', f.verContexto && 'rotate-90')} />
          </button>
          {f.verContexto && f.contexto && (
            <dl className="pl-5 pt-1.5 grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-[11px]">
              {linhasDoContexto(f.contexto).map(([r, v]) => (<Fragment key={r}><dt className="text-surface-400">{r}</dt><dd className="text-surface-200 break-all">{v}</dd></Fragment>))}
            </dl>
          )}
          {f.verContexto && !f.contexto && (
            <ul className="pl-5 pt-1 text-[11px] text-surface-400 list-disc flex flex-col gap-0.5">
              {f.origem === 'conversa' && <li>a conversa inteira: horários de chegada e de resposta, quem respondeu e se a IA estava pausada</li>}
              {mensagens.length > 0 && <li>a conversa e {mensagens.length > 1 ? `as ${mensagens.length} mensagens marcadas` : 'a mensagem marcada'}</li>}
              {f.resumo.porOrigem.has('ia') && <li>de cada resposta da IA: o que ela consultou e o que o sistema conferiu</li>}
              {f.resumo.porOrigem.has('automacao') && <li>da automação: qual foi, o gatilho e a execução</li>}
              {f.resumo.porOrigem.has('regra') && <li>da regra: qual foi e por que foi acionada</li>}
              <li>horário e quem reportou</li>
              {!f.semConversa && <li>a equipe Oryon só abre a conversa ligada ao chamado, e a gestão vê quando isso acontece</li>}
            </ul>
          )}
        </div>
      </div>
  )

  if (variante === 'modal') {
    return (
      <Modal
        open
        onClose={onClose}
        aria-label={f.titulo}
        className={cn('max-w-[520px]', `sup-familia-${familia}`)}
        bodyClassName="p-0"
        title={
          <span className="text-[15px] font-semibold text-surface-100">{f.titulo}</span>
        }
        footer={<div className="flex items-center justify-end gap-2 w-full">{avisoDosAnexos && <span className="mr-auto">{avisoDosAnexos}</span>}{botoes}</div>}
      >
        {corpo}
      </Modal>
    )
  }

  // Mesma largura do painel do contato (308px): o chat não muda de tamanho ao abrir o chamado.
  const painel = (
    <aside role={oculto ? undefined : 'dialog'} aria-modal={oculto ? undefined : variante === 'folha'} aria-labelledby={tituloId}
      className={cn('conv-surface sup-painel-topo w-[308px] flex-shrink-0 flex flex-col h-full min-h-0 bg-surface-800 border-l border-surface-700', `sup-familia-${familia}`, className)}>
      <header className="flex items-center gap-2 pl-4 pr-2 h-[52px] pt-[3px] border-b border-surface-700 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h2 id={tituloId} className="text-[14px] font-semibold text-surface-50 truncate">{f.titulo}</h2>
          <p className="text-[11px] text-surface-400 truncate">{conversationId ? (contatoNome ?? 'Conversa') : 'Para algo que não está ligado a uma conversa'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar (Esc)"
          className="w-8 h-8 rounded-[6px] flex items-center justify-center text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100">
          <X className="w-4 h-4" />
        </button>
      </header>

      {corpo}

      <footer className="flex items-center gap-2 px-4 py-3 border-t border-surface-700 flex-shrink-0">
        <span className="mr-auto">{avisoDosAnexos}</span>
        {botoes}
      </footer>
    </aside>
  )
  if (variante !== 'folha') return painel
  // Celular: o mesmo painel em tela cheia, na altura da pilha de camadas (um menu aberto dentro fica por cima).
  return createPortal(
    <div className={cn('fixed inset-0 flex bg-surface-800', oculto && 'hidden')} style={{ zIndex }}>{painel}</div>,
    document.body,
  )
}

/**
 * As props do formulário do painel, montadas do store da marcação e dos dados
 * da conversa. `null` fora do chamado (ou com o recurso desligado). `sessao`:
 * vale enquanto o chamado está sendo montado — marcando no chat OU com o
 * formulário aberto (a folha do celular sobrevive à volta para a marcação).
 */
function usePropsDoPainel(aoCriar?: () => void, sessao = false): PropsDoFormulario | null {
  const s = useSuporte()
  const d = useDadosDoSuporte()
  const aberto = useMarcacao(s.store, (e) => e.painelAberto || (sessao && e.marcando))
  const marcadas = useMarcacao(s.store, (e) => e.marcadas)
  const sobre = useMarcacao(s.store, (e) => e.sobre)
  const todas = useMarcacao(s.store, (e) => e.mensagens)
  const noPainel = useMemo(() => todas.filter((m) => marcadas.has(m.id)), [todas, marcadas])
  if (!s.ligado || !d?.conversationId || !aberto) return null
  return {
    open: true,
    onClose: s.cancelarMarcacao,
    conversationId: d.conversationId,
    contatoNome: d.contatoNome,
    mensagens: noPainel,
    todasAsMensagens: todas,
    onCriado: (c, novo) => { d.aoCriar(c, novo); aoCriar?.() },
    sobre,
    onSobre: s.definirSobre,
  }
}

/**
 * Lugar do painel do contato na página de Conversas (computador): com o
 * chamado aberto em painel, o formulário ocupa esse lugar; ao fechar, o painel
 * do contato volta. `aoCriar`: a página reabre o painel do contato, onde o
 * chamado novo aparece na seção Chamados.
 */
export function PainelDoContatoOuChamado({ contato, aoCriar }: { contato: ReactNode; aoCriar?: () => void }) {
  const s = useSuporte()
  const aberto = useMarcacao(s.store, (e) => s.ligado && s.emPainel && e.painelAberto)
  return aberto ? <PainelDoChamado aoCriar={aoCriar} /> : <>{contato}</>
}

function PainelDoChamado({ aoCriar }: { aoCriar?: () => void }) {
  const props = usePropsDoPainel(aoCriar)
  if (!props) return null
  return <ReportTicketPanel key={props.conversationId ?? 'sem'} {...props} />
}

/**
 * CELULAR: não há espaço para o painel ao lado do chat. A pessoa marca as
 * mensagens primeiro (barra do rodapé com "Continuar") e o mesmo painel abre
 * em tela cheia por cima. "Mensagens" na folha volta ao chat para marcar mais:
 * a folha só se esconde, e o que já foi escrito continua lá.
 */
export function FolhaDoChamadoNoCelular() {
  const s = useSuporte()
  const props = usePropsDoPainel(undefined, true)
  const aberta = useMarcacao(s.store, (e) => e.painelAberto)
  if (!props || s.emPainel) return null
  return <ReportTicketPanel key={props.conversationId ?? 'sem'} {...props} variante="folha" oculto={!aberta} className="w-full border-l-0" />
}
