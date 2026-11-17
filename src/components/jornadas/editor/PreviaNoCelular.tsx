import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PanelRightClose, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { cn } from '@/lib/utils'
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import { Aparelho } from '@/components/landing/stage/hero/HeroSatelites'
import { Bolha, TelaWhatsApp } from '@/components/landing/stage/hero/HeroWhatsAppIphone'
import type { WhatsAppTemplate } from '@/types'
import type { ApoioDoEditor, Catalogo, ContatoParaInscrever, Grafo, NoDoGrafo } from '@/services/jornadas/tipos'
import { resolverTexto } from '@/services/jornadas/simulador'
import { lerExpressao, paraTextoAmigavel, rotuloDaVariavel } from './variaveis'
import { exemploNoCelular, TIPOS_COM_EXEMPLO, TIPOS_DE_MENSAGEM } from './exemplosNoCelular'

/**
 * ORY-60 — a prévia do passo de mensagem no celular (modelo 3, "Editor com
 * prévia ao vivo", escolhido pelo João em 16/11). É a MESMA estrutura do resto
 * do app, para ficar idêntica ao WhatsApp:
 *  - a moldura do iPhone da landing (`Aparelho`);
 *  - a tela do WhatsApp no iOS (`TelaWhatsApp`: barra de status, cabeçalho da
 *    conversa com "Conta comercial", papel de parede e barra de digitação);
 *  - a bolha do modelo de Disparos e Modelos (`TemplatePreview`, com as cores
 *    amostradas dos prints da Meta, botões dentro da bolha, sem tique);
 *  - a bolha de texto livre (`Bolha`).
 * Alterna entre os dados de teste e os nomes das variáveis.
 */

/** Todo passo que envolve o WhatsApp mostra o celular: a mensagem de verdade ou um exemplo da conversa (16/11). */
export const TIPOS_COM_CELULAR = new Set([...TIPOS_DE_MENSAGEM, ...TIPOS_COM_EXEMPLO])

/**
 * O aparelho mantém SEMPRE a proporção de um celular (tela de 390 × 800 pontos,
 * um pouco mais larga que a do iPhone 14, a pedido do João): só a ESCALA muda, para o celular inteiro caber na altura
 * (e na largura) da vaga, sem rolar e sem achatar. (16/11: a versão anterior
 * encurtava a tela e o aparelho ficava quase quadrado.)
 */
const LARGURA = 390
const ALTURA = 800
const ESCALA_MAX = 0.66
const ESCALA_MIN = 0.3
/** A moldura do aparelho (7 px de cada lado). */
const MOLDURA = 14
const HORA = '11:00'

function useEscalaDoAparelho() {
  const vaga = useRef<HTMLDivElement>(null)
  const [vagaMedida, setVagaMedida] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = vaga.current
    if (!el) return
    const medir = () => setVagaMedida({ w: el.clientWidth, h: el.clientHeight })
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  if (!vagaMedida) return { vaga, escala: ESCALA_MAX }
  const escala = Math.min(ESCALA_MAX, (vagaMedida.h - MOLDURA) / ALTURA, (vagaMedida.w - MOLDURA) / LARGURA)
  return { vaga, escala: Math.max(ESCALA_MIN, escala) }
}

/** Uma linha da conversa do Testar (P2, 16/11, como o Kommo): a mensagem da empresa, a resposta do contato ou um aviso. */
export type LinhaDaConversa =
  | { tipo: 'empresa'; no: NoDoGrafo; hora: string }
  | { tipo: 'contato'; texto: string; hora: string }
  | { tipo: 'aviso'; texto: string }

/** A bolha de um passo de mensagem, como chega no WhatsApp: na prévia do passo e na conversa do Testar. */
export function BolhaDoPasso({ no, apoio, dados, modo = 'teste', hora = HORA }: {
  no: NoDoGrafo
  apoio: ApoioDoEditor
  /** Os dados do contato; sem eles, os dados de teste. */
  dados?: Record<string, string> | null
  modo?: 'teste' | 'variaveis'
  hora?: string
}) {
  // A expressão de cada variável ({{contato.nome|"paciente"}}) vira o valor de teste ou o nome do dado.
  const valor = (expr: string) => {
    if (modo === 'teste') return resolverTexto(expr, dados ?? undefined)
    const chave = lerExpressao(expr).chave
    return chave ? `[${rotuloDaVariavel(chave)}]` : expr.trim() || '[escolher]'
  }
  const vazia = no.type === 'send_text' ? 'Escreva o texto para ver a mensagem' : no.type === 'ask_question' ? 'Escreva a pergunta para ver a mensagem' : 'Escolha o modelo para ver a mensagem'
  if (no.type === 'send_template' || no.type === 'send_and_wait') {
    const modelo = apoio.templates.find((t) => t.id === no.params.templateId)
    if (modelo) {
      const exprs = (Array.isArray(no.params.variables) ? no.params.variables : []) as string[]
      const variaveis = Object.fromEntries(Array.from({ length: modelo.variableCount }, (_, i) => [String(i + 1), exprs[i] ? valor(exprs[i]) : '']).filter(([, v]) => v))
      const template: WhatsAppTemplate = {
        id: modelo.id, tenantId: '', name: modelo.name, language: 'pt_BR', category: modelo.category, status: modelo.status,
        body: modelo.body, buttons: modelo.buttons.map((text) => ({ type: 'QUICK_REPLY' as const, text })), createdAt: '', updatedAt: '',
      }
      return <div className="self-start" style={{ maxWidth: '86%' }}><TemplatePreview template={template} variables={variaveis} variant="card" sentAt={hora} /></div>
    }
  } else if (no.type === 'ask_question' && typeof no.params.question === 'string' && no.params.question.trim()) {
    // A pergunta; com opções, os botões de resposta (até 3) ou o botão da lista, como no WhatsApp.
    const pergunta = modo === 'teste' ? resolverTexto(no.params.question, dados ?? undefined) : paraTextoAmigavel(no.params.question)
    const opcoes = no.params.answerType === 'option' && Array.isArray(no.params.options) ? (no.params.options as unknown[]).filter((x): x is string => typeof x === 'string' && !!x.trim()) : []
    if (opcoes.length) {
      const pseudo: WhatsAppTemplate = {
        id: no.type, tenantId: '', name: 'pergunta', language: 'pt_BR', category: 'UTILITY', status: 'APPROVED', body: pergunta,
        buttons: (opcoes.length <= 3 ? opcoes : ['Ver opções']).map((text) => ({ type: 'QUICK_REPLY' as const, text })), createdAt: '', updatedAt: '',
      }
      return <div className="self-start" style={{ maxWidth: '86%' }}><TemplatePreview template={pseudo} variables={{}} variant="card" sentAt={hora} /></div>
    }
    return <Bolha texto={pergunta} hora={hora} />
  } else if (no.type === 'send_text' && typeof no.params.text === 'string' && no.params.text.trim()) {
    const texto = modo === 'teste' ? resolverTexto(no.params.text, dados ?? undefined) : paraTextoAmigavel(no.params.text)
    return <Bolha texto={texto} hora={hora} />
  }
  return <AvisoNaConversa texto={vazia} />
}

/** O aviso cinza no meio da conversa (data, "sem resposta", "relógio adiantado"). */
function AvisoNaConversa({ texto }: { texto: string }) {
  return <p className="self-center my-1 rounded-md bg-white/90 px-2.5 py-1 text-center text-[12.5px] font-medium shadow-[0_1px_.5px_rgba(11,20,26,.13)]" style={{ color: '#54656F' }}>{texto}</p>
}

/**
 * A conversa do Testar no celular (P2, 16/11, como o Kommo): cada mensagem do
 * caminho como chega no WhatsApp, com as respostas escolhidas por quem testa.
 * Ancorada embaixo, como um celular que rolou: as mais novas ficam à vista.
 */
export function ConversaNoCelular({ linhas, apoio, dados, linhaId }: { linhas: LinhaDaConversa[]; apoio: ApoioDoEditor; dados: Record<string, string>; linhaId?: string }) {
  const { vaga, escala } = useEscalaDoAparelho()
  const linha = apoio.whatsappNumbers.find((l) => l.id === linhaId) ?? apoio.whatsappNumbers[0]
  const empresa = linha?.name ?? 'Sua empresa'
  const ultima = [...linhas].reverse().find((l) => l.tipo !== 'aviso') as { hora: string } | undefined
  return (
    <div ref={vaga} aria-hidden className="pointer-events-none flex min-h-0 w-full flex-1 select-none items-center justify-center px-3">
      <Aparelho className="flex-none">
        <div className="overflow-hidden" style={{ width: Math.round(LARGURA * escala), height: Math.round(ALTURA * escala) }}>
          <TelaWhatsApp hora={ultima?.hora ?? HORA} escala={escala} altura={ALTURA} empresa={empresa} iniciais={iniciaisDe(empresa)}>
            <AvisoNaConversa texto="Hoje" />
            {linhas.length === 0 && <AvisoNaConversa texto="As mensagens do teste aparecem aqui" />}
            {linhas.map((l, i) => (l.tipo === 'empresa'
              ? <BolhaDoPasso key={i} no={l.no} apoio={apoio} dados={dados} hora={l.hora} />
              : l.tipo === 'contato' ? <Bolha key={i} texto={l.texto} hora={l.hora} minha /> : <AvisoNaConversa key={i} texto={l.texto} />))}
          </TelaWhatsApp>
        </div>
      </Aparelho>
    </div>
  )
}

const iniciaisDe = (nome: string) => nome.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')

export function PreviaNoCelular({ no, id, grafo, catalogo, apoio, jornadaId, onEnviarTeste, enviando, onFechar, onRecolher }: {
  no: NoDoGrafo
  /** O passo e o desenho: os exemplos usam a mensagem que vem antes (ex.: os botões que o "Aguardar resposta" espera). */
  id: string
  grafo: Grafo
  catalogo: Catalogo
  apoio: ApoioDoEditor
  /** Para ver a mensagem com os dados de um contato de verdade (P1, 16/11, como Klaviyo e Braze). */
  jornadaId?: string
  onEnviarTeste?: () => void
  enviando?: boolean
  /** O X da gaveta: com a prévia, fica no canto superior direito dela. */
  onFechar?: () => void
  /** Painéis encaixados: recolhe a coluna do celular (o desenho ganha a largura dela). */
  onRecolher?: () => void
}) {
  const [modo, setModo] = useState<'teste' | 'variaveis'>('teste')
  const { vaga, escala } = useEscalaDoAparelho()
  // "Ver com os dados de": o contato de teste ou um contato de verdade (mascarado).
  const [contatos, setContatos] = useState<ContatoParaInscrever[]>([])
  const [contatoId, setContatoId] = useState('')
  const [dadosLidos, setDados] = useState<Record<string, string> | null>(null)
  // Sem contato escolhido, valem os dados de teste (o que foi lido antes não conta).
  const dados = contatoId ? dadosLidos : null
  useEffect(() => {
    if (!jornadaId) return
    let vivo = true
    jornadasApi.buscarContatos('').then((r) => { if (vivo) setContatos(r.slice(0, 8)) }).catch(() => {})
    return () => { vivo = false }
  }, [jornadaId])
  useEffect(() => {
    if (!jornadaId || !contatoId) return
    let vivo = true
    jornadasApi.contextoDoContato(jornadaId, contatoId).then((d) => { if (vivo) setDados(d) }).catch(() => { if (vivo) setDados(null) })
    return () => { vivo = false }
  }, [jornadaId, contatoId])
  // Passo que age sobre a conversa sem mandar mensagem própria: um exemplo curto da conversa.
  const exemplo = TIPOS_COM_EXEMPLO.has(no.type) ? exemploNoCelular(no, id, grafo, apoio, catalogo) : null
  // Os dados de teste e as variáveis só fazem sentido onde há uma mensagem de verdade na tela.
  const temMensagem = !exemplo || exemplo.some((l) => l.tipo === 'mensagem')
  const mensagemDaTela = exemplo?.find((l) => l.tipo === 'mensagem')
  const numeroDaTela = (mensagemDaTela?.tipo === 'mensagem' ? mensagemDaTela.no : no).params.whatsappNumberId
  const linha = apoio.whatsappNumbers.find((l) => l.id === numeroDaTela) ?? apoio.whatsappNumbers[0]
  const empresa = linha?.name ?? 'Sua empresa'

  return (
    <div className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-surface-700 bg-surface-950">
      {/* Topo, na altura do cabeçalho do passo: o que mostrar na mensagem e o X da gaveta. */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-3">
        {!temMensagem && (
          <p className="min-w-0 flex-1 px-1 text-[12px] font-semibold leading-4 text-surface-300">Exemplo do que acontece na conversa</p>
        )}
        {temMensagem && <div role="radiogroup" aria-label="O que mostrar na mensagem" className="grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-[10px] bg-[var(--jt-trilho)] p-1">
          {([['teste', 'Dados de teste'], ['variaveis', 'Variáveis']] as const).map(([m, rotulo]) => (
            <button key={m} type="button" role="radio" aria-checked={modo === m} onClick={() => setModo(m)}
              className={cn('h-8 rounded-[8px] text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                modo === m ? 'bg-[var(--jt-moldura)] text-surface-50 shadow-[0_1px_2px_rgba(0,0,0,0.18)]' : 'text-surface-400 hover:text-surface-100')}>
              {rotulo}
            </button>
          ))}
        </div>}
        {onRecolher && <Button variant="ghost" size="sm" iconOnly aria-label="Recolher a prévia no celular" title="Recolher a prévia no celular" onClick={onRecolher}><PanelRightClose className="w-4 h-4" /></Button>}
        {onFechar && <Button variant="ghost" size="sm" iconOnly aria-label="Fechar (Esc)" title="Fechar (Esc)" onClick={onFechar}><X className="w-4 h-4" /></Button>}
      </div>
      {temMensagem && modo === 'teste' && contatos.length > 0 && (
        <label className="-mt-1 flex shrink-0 items-center gap-2 px-3 pb-2 text-[12px] text-surface-400">
          <span className="shrink-0">Com os dados de</span>
          <Select size="sm" className="min-w-0 flex-1" value={contatoId} onChange={(e) => setContatoId(e.target.value)} aria-label="Ver a mensagem com os dados de">
            <option value="">Contato de teste</option>
            {contatos.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phoneMasked.slice(-4)}</option>)}
          </Select>
        </label>
      )}

      {/* A vaga do aparelho: ocupa o que sobra da coluna, e o aparelho se ajusta a ela. */}
      <div ref={vaga} aria-hidden className="pointer-events-none flex min-h-0 w-full flex-1 select-none items-center justify-center px-3">
        <Aparelho className="flex-none">
          <div className="overflow-hidden" style={{ width: Math.round(LARGURA * escala), height: Math.round(ALTURA * escala) }}>
            <TelaWhatsApp hora={HORA} escala={escala} altura={ALTURA} empresa={empresa} iniciais={iniciaisDe(empresa)}>
              <div className="self-center mb-1">
                <span className="inline-block rounded-md bg-white/90 px-2.5 py-1 text-[12px] font-medium shadow-[0_1px_.5px_rgba(11,20,26,.13)]" style={{ color: '#54656F' }}>Hoje</span>
              </div>
              {exemplo
                ? exemplo.map((l, i) => (
                  l.tipo === 'mensagem' ? <BolhaDoPasso key={i} no={l.no} apoio={apoio} dados={dados} modo={modo} />
                    : l.tipo === 'contato' ? <Bolha key={i} texto={l.texto} hora={HORA} minha />
                      : l.tipo === 'empresa' ? <Bolha key={i} texto={l.texto} hora={HORA} />
                        : <AvisoNaConversa key={i} texto={l.texto} />
                ))
                : <BolhaDoPasso no={no} apoio={apoio} dados={dados} modo={modo} />}
            </TelaWhatsApp>
          </div>
        </Aparelho>
      </div>
      <p className="sr-only">{exemplo ? `Exemplo da conversa no WhatsApp com ${empresa}: ${exemplo.map((l) => (l.tipo === 'mensagem' ? 'mensagem do desenho' : l.texto)).join('. ')}` : `Prévia da mensagem no WhatsApp, enviada por ${empresa}.`}</p>

      {onEnviarTeste && (
        <div className="shrink-0 space-y-1.5 px-4 pb-4 pt-3">
          <Button variant="secondary" size="sm" className="w-full" leftIcon={<Send className="w-4 h-4" />} loading={enviando} onClick={onEnviarTeste}>
            Enviar um teste para mim
          </Button>
          <p className="text-center text-[12px] leading-4 text-surface-500">Vai para o seu WhatsApp. Ninguém é inscrito.</p>
        </div>
      )}
    </div>
  )
}
