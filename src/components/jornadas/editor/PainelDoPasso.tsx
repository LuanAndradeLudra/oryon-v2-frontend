import { Fragment, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check, ChevronDown, ChevronRight, CircleAlert, ClipboardCopy, Copy, Ear, Ellipsis, Info, ListTree, Plus, Smartphone, Sparkles, Trash2, TriangleAlert, X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/utils'
import type { ApoioDoEditor, CampoDoPasso, Catalogo, Entrada, Jornada, Metas, NoDoGrafo, PoliticaDeErro, Porta, ProblemaDoDesenho, RegrasDeEnvio, ResultadosDaJornada, VersaoDaJornada } from '@/services/jornadas/tipos'
import { PARAMS_PADRAO_DA_PORTA, PASSOS_DE_ENVIO, passoDoCatalogo, ROTULO_DO_GRUPO, saidasDoNo } from '@/services/jornadas/catalogo'
import { contextoParaOAgente, instrucaoDosDados, lerCaminho, lerCaminhoDaSaida, paramsDaMissao, sugerirSaida, sugestoesDoPasso } from './caminho'
import { horasDesdeAUltimaMensagem, mensagensAntes, modeloAntes, PASSOS_DE_TEXTO_LIVRE, situacaoDaJanela } from '@/services/jornadas/regrasDoWhatsApp'
import { chaveDoDado, LIMITES_DO_MOTOR, variaveisDoDesenho } from '@/services/jornadas/validar'
import { ID_DA_ENTRADA } from '@/services/jornadas/layout'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { Selo } from '../comum'
import { numero } from '../apoio'
import { CaminhosDoPasso, CampoDoPassoEditor, CartoesDeEscolha, EditorDeCondicoes, Pilulas, Rotulo, type ContextoDoCampo } from './Campos'
import { esperaEmPassosSeparados, mensagemQueEsperaAqui, modoDoEnvio, trocarModoDoEnvio, type ModoDoEnvio } from './depoisDeEnviar'
import { terminarAqui } from './terminarAqui'
import { rotuloDaDuracao } from '@/services/jornadas/simulador'
import { OPCOES_DE_PORTA, fraseDoPasso } from './resumo'
import { AbasDoPasso, ComentariosDoPasso, DesempenhoDoPasso, TesteDoPasso, type AbaDoPasso } from './AbasDoPasso'
import { IconeDoPasso } from './IconeDoPasso'
import { PreviaNoCelular, TIPOS_COM_CELULAR } from './PreviaNoCelular'
import { TIPOS_DE_MENSAGEM } from './exemplosNoCelular'
import { TROCA_ENCAIXADA } from './paineisEncaixados'
import { COR_DO_GRUPO, ordemDasSecoes, perguntaDaSecao, TIPO_DA_PORTA, tipoDaConfiguracao, tomDaCor, TIPOS_DE_CONFIGURACAO, type TipoDeConfiguracao, type TomDaJornada } from './categorias'

/** Seções de ajuste fino: começam fechadas, com a escolha atual numa linha. */
const SECOES_AVANCADAS = new Set<TipoDeConfiguracao>(['posse', 'ajustes'])

/**
 * A gaveta do passo: só aparece com um passo (ou a Entrada) selecionado, por
 * cima do canvas, e fecha com Esc, no X ou num clique no canvas. As
 * configurações da jornada inteira ficam numa janela à parte
 * (`ConfiguracoesDaJornada`), aberta pelo nome ou pelo menu ⋯.
 *
 * O painel não é um formulário genérico: os campos do catálogo são agrupados
 * por TIPO DE CONFIGURAÇÃO (canal, mensagem, tempo, caminhos…), cada grupo é uma
 * pergunta com ícone e cor, e cada tipo tem o seu controle (ver `categorias.ts`).
 */

interface PropsDaGaveta {
  versao: VersaoDaJornada
  selecionado: string
  catalogo: Catalogo
  apoio: ApoioDoEditor
  problemas: ProblemaDoDesenho[]
  onMudarVersao: (v: VersaoDaJornada) => void
  /** Muda e reorganiza o desenho (quando passos entram ou saem, como no "E depois de enviar?"). */
  onMudarEArrumar?: (v: VersaoDaJornada) => void
  onApagar: (id: string) => void
  onDuplicar: (id: string) => void
  /** Copiar o passo (para colar aqui ou em outra jornada) e escolher o ramo inteiro (P2, 16/11). */
  onCopiar?: (id: string) => void
  onSelecionarRamo?: (id: string) => void
  onFechar: () => void
  /** Leva a outro passo (o "segue para" dos caminhos). */
  onSelecionar?: (id: string) => void
  /** Abre a lista de passos para um caminho vazio deste passo (P2, 17/11). */
  onEscolherProximo?: (origem: string, saida: string) => void
  somenteLeitura: boolean
  /** O número do passo no desenho (o mesmo do cartão). */
  numeroDoPasso?: number
  /** Os números da versão no ar (aba Desempenho). */
  resultados?: ResultadosDaJornada | null
  publicada?: boolean
  /** Abre o teste da jornada inteira (aba Testar). */
  onTestarJornada?: () => void
  /** "Enviar um teste para mim" (passos de mensagem). */
  onEnviarTeste?: (nodeId: string) => void
  enviandoTeste?: boolean
  /** Para "Testar só este passo" e a prévia com um contato de verdade. */
  jornadaId?: string
  /** Comentários abertos por passo (o número na aba) e o aviso de que mudaram. */
  comentariosPorPasso?: Map<string, number>
  onComentariosMudaram?: () => void
  /** Painel encaixado: a prévia no celular pode ser recolhida. Sem isto (celular, só leitura), ela sempre aparece. */
  celularAberto?: boolean
  /** Encaixado: o painel entra e sai só com um fade curto (troca com a lista de passos na mesma vaga). */
  encaixado?: boolean
  onCelular?: (aberto: boolean) => void
}

export function GavetaDoPasso(props: PropsDaGaveta & { className?: string }) {
  // Passo de mensagem: a gaveta se alarga para o celular com a prévia ao lado (modelo 3).
  const comCelular = props.selecionado !== ID_DA_ENTRADA && TIPOS_COM_CELULAR.has(props.versao.graph.nodes[props.selecionado]?.type ?? '') && props.celularAberto !== false
  return (
    <motion.aside
      {...(props.encaixado ? TROCA_ENCAIXADA : {
        initial: { opacity: 0, x: 28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 28 },
        transition: { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] },
      })}
      className={cn(
        'jt-painel absolute z-20 top-3 right-3 bottom-3 max-w-[calc(100%-24px)] flex flex-col min-h-0 overflow-hidden transition-[width] duration-200 ease-out',
        comCelular ? 'w-[700px]' : 'w-[440px]',
        'rounded-[14px] border border-surface-700 bg-[var(--jt-moldura)] shadow-[0_16px_40px_rgba(0,0,0,0.32)]',
        props.className,
      )}
      aria-label="Detalhes do passo"
    >
      {/* Ao trocar de passo, o conteúdo troca com um fade curto (a gaveta fica). */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={props.selecionado}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="flex flex-1 min-h-0 flex-col"
        >
          {props.selecionado === ID_DA_ENTRADA ? <PainelDaEntrada {...props} /> : <PainelDeUmPasso {...props} id={props.selecionado} />}
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  )
}

// ── peças comuns ─────────────────────────────────────────────────────────────

/**
 * O topo do painel, como nos builders de mercado: ícone na cor da categoria,
 * "número · nome" (editável) e, embaixo, a categoria e o tipo do passo. As
 * ações raras (duplicar, apagar) ficam no ⋯, não num rodapé fixo.
 */
function Cabecalho({ numero, titulo, placeholder, onTitulo, subtitulo, icone, acoes, onFechar, somenteLeitura }: {
  numero?: number
  titulo: string
  placeholder?: string
  onTitulo?: (v: string) => void
  subtitulo?: ReactNode
  /** O ícone do passo (IconeDoPasso, tamanho "g"), já com o selo da marca. */
  icone: ReactNode
  acoes?: ReactNode
  onFechar?: () => void
  somenteLeitura?: boolean
}) {
  return (
    <div className="shrink-0 flex items-center gap-3 border-b border-surface-700 px-4 py-3 [--jt-fundo-selo:var(--jt-moldura)]">
      {icone}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {numero ? <span className="shrink-0 text-[14px] font-semibold tabular-nums text-surface-500">{numero}</span> : null}
          {onTitulo && !somenteLeitura ? (
            <input
              value={titulo}
              placeholder={placeholder}
              onChange={(e) => onTitulo(e.target.value)}
              aria-label="Nome do passo no desenho"
              title="Clique para dar um nome curto ao passo"
              className="min-w-0 flex-1 -ml-0.5 rounded-[6px] bg-transparent px-1 py-0.5 text-[16px] font-semibold leading-6 text-surface-50 placeholder:text-surface-50 hover:bg-[var(--rowhover)] focus:bg-surface-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          ) : (
            <p className="min-w-0 truncate text-[16px] font-semibold leading-6 text-surface-50">{titulo || placeholder}</p>
          )}
        </div>
        {subtitulo && <p className="truncate text-[12px] leading-4 text-surface-400">{subtitulo}</p>}
      </div>
      {acoes}
      {onFechar && <Button variant="ghost" size="sm" iconOnly aria-label="Fechar (Esc)" title="Fechar (Esc)" onClick={onFechar}><X className="w-4 h-4" /></Button>}
    </div>
  )
}

/** O ⋯ do passo: duplicar e apagar. */
function MenuDoPasso({ onDuplicar, onApagar, onCopiar, onSelecionarRamo }: { onDuplicar: () => void; onApagar: () => void; onCopiar?: () => void; onSelecionarRamo?: () => void }) {
  const [aberto, setAberto] = useState(false)
  return (
    <Dropdown
      open={aberto}
      onClose={() => setAberto(false)}
      align="right"
      anchor={<Button variant="ghost" size="sm" iconOnly aria-label="Mais ações do passo" title="Mais ações" onClick={() => setAberto((a) => !a)}><Ellipsis className="w-4 h-4" /></Button>}
    >
      <DropdownItem icon={Copy} onClick={() => { setAberto(false); onDuplicar() }}>Duplicar passo</DropdownItem>
      {onCopiar && <DropdownItem icon={ClipboardCopy} onClick={() => { setAberto(false); onCopiar() }}>Copiar (Ctrl+C)</DropdownItem>}
      {onSelecionarRamo && <DropdownItem icon={ListTree} onClick={() => { setAberto(false); onSelecionarRamo() }}>Escolher daqui para baixo</DropdownItem>}
      <DropdownSeparator />
      <DropdownItem icon={Trash2} danger onClick={() => { setAberto(false); onApagar() }}>Apagar passo</DropdownItem>
    </Dropdown>
  )
}

/**
 * Uma seção do painel: a pergunta que ela responde, em negrito, sem ícone nem
 * caixa em volta (o ícone colorido fica só no topo). Só o que falta ganha
 * marca; o que está pronto não precisa de selo verde. As seções de ajuste fino
 * (`recolhivel`) começam fechadas, com a escolha atual numa linha.
 */
function Secao({ titulo, estado, descricao, resumo, recolhivel, children }: {
  titulo: string
  estado?: 'falta' | null
  descricao?: string
  /** A escolha atual, mostrada com a seção fechada. */
  resumo?: string
  recolhivel?: boolean
  children: ReactNode
}) {
  const [aberta, setAberta] = useState(!recolhivel || estado === 'falta')
  const marca = estado === 'falta' && <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--color-danger)]"><CircleAlert className="w-3.5 h-3.5" aria-hidden />Falta</span>
  return (
    <section className="px-4 py-4 border-b border-surface-700 last:border-b-0">
      {recolhivel ? (
        <button type="button" onClick={() => setAberta((a) => !a)} aria-expanded={aberta} className="group flex w-full items-center gap-2 text-left cursor-pointer">
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-surface-50">{titulo}</span>
            {!aberta && resumo && <span className="block truncate text-[12px] text-surface-400">{resumo}</span>}
          </span>
          {marca}
          <ChevronDown className={cn('w-4 h-4 shrink-0 text-surface-500 transition-transform duration-200 group-hover:text-surface-300', aberta && 'rotate-180')} aria-hidden />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 text-[14px] font-semibold text-surface-50">{titulo}</h3>
          {marca}
        </div>
      )}
      {aberta && (
        <>
          {descricao && <p className="mt-1 text-[12px] leading-relaxed text-surface-400">{descricao}</p>}
          <div className={cn('mt-3 space-y-4', recolhivel && 'jornadas-aparecer')}>{children}</div>
        </>
      )}
    </section>
  )
}

/** A escolha atual de uma seção recolhida, numa linha (o rótulo da opção ou "sim/não" dos ajustes). */
function resumoDaSecao(campos: CampoDoPasso[], params: Record<string, unknown>, catalogo: Catalogo): string {
  return campos.map((c) => {
    const v = params[c.key] ?? c.default
    if (c.type === 'boolean') return `${c.label}: ${v ? 'sim' : 'não'}`
    if (c.type === 'event') return `Termina com: ${catalogo.events.find((e) => e.key === v)?.label.toLowerCase() ?? String(v ?? '')}`
    if (c.key === 'limits') return v ? `Outra restrição: ${String(v)}` : ''
    const opcao = c.options?.find((o) => o.value === v)
    return opcao?.label ?? (v === undefined || v === null || v === '' ? '' : String(v))
  }).filter(Boolean).join(' · ')
}

/**
 * Dentro do painel do próprio passo, o nome dele no começo da frase sobra:
 * '"Avisar a equipe": falta…' vira 'Falta…'; '"X" usa IA…' vira 'Este passo usa IA…'.
 */
function semONomeDoPasso(msg: string) {
  const comDoisPontos = msg.match(/^"[^"]*":\s*([\s\S]*)$/)
  if (comDoisPontos) return comDoisPontos[1].charAt(0).toUpperCase() + comDoisPontos[1].slice(1)
  const comVerbo = msg.match(/^"[^"]*"\s+([\s\S]*)$/)
  return comVerbo ? `Este passo ${comVerbo[1]}` : msg
}

/** A lista de problemas do desenho; com `onIrAoPasso`, cada item leva ao passo. */
export function ListaDeProblemas({ problemas, onIrAoPasso, noProprioPasso }: { problemas: ProblemaDoDesenho[]; onIrAoPasso?: (id: string) => void; noProprioPasso?: boolean }) {
  if (!problemas.length) return null
  // Chave estável (o item não reanima quando outro some); repetidos ganham um número.
  const vistos = new Map<string, number>()
  return (
    <ul className="space-y-1.5">
      {problemas.map((p, i) => {
        const base = `${p.nodeId ?? ''}|${p.message}`
        const n = vistos.get(base) ?? 0
        vistos.set(base, n + 1)
        const conteudo = (
          <>
            {p.severity === 'error'
              ? <CircleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-danger)]" aria-hidden />
              : <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-status-pending" aria-hidden />}
            <span className="flex-1 text-left">{noProprioPasso ? semONomeDoPasso(p.message) : p.message}</span>
            {onIrAoPasso && p.nodeId && <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-surface-500" aria-hidden />}
          </>
        )
        const classe = cn(
          'w-full flex items-start gap-2 rounded-[8px] px-3 py-2 text-[12px] leading-relaxed',
          p.severity === 'error' ? 'jt-vermelho' : 'bg-[var(--jt-poco)] text-surface-300',
        )
        return (
          <li key={`${base}|${n}`} className="jornadas-aparecer" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
            {onIrAoPasso && p.nodeId
              ? <button type="button" onClick={() => onIrAoPasso(p.nodeId!)} className={cn(classe, 'cursor-pointer hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500')} title="Ir até o passo">{conteudo}</button>
              : <div className={classe}>{conteudo}</div>}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * A janela de 24 h do WhatsApp no topo dos passos de mensagem livre (P0, 17/11): verde quando a pessoa
 * acabou de responder; âmbar quando pode ter passado de 24 h; vermelho quando ela pode nem ter escrito.
 */
function AvisoDaJanela({ janela, onTrocar }: { janela: { aberta: boolean; grave: boolean; neutro: boolean; texto: string }; onTrocar?: () => void }) {
  const tom = janela.neutro ? 'bg-[var(--jt-poco)] text-surface-300' : janela.aberta ? 'jt-verde' : janela.grave ? 'jt-vermelho' : 'jt-ambar'
  const Icone = janela.neutro ? Info : janela.aberta ? Check : janela.grave ? CircleAlert : TriangleAlert
  return (
    <div className={cn('flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[12px] leading-relaxed', tom)} role={janela.aberta || janela.neutro ? undefined : 'alert'}>
      <Icone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <p><strong className="font-semibold">Janela de 24 h · </strong>{janela.texto}</p>
        {!janela.aberta && !janela.neutro && (onTrocar
          ? <Button size="sm" variant="secondary" onClick={onTrocar}>Trocar por “Enviar modelo”</Button>
          : <p>Ponha este passo logo depois de uma resposta da pessoa (ex.: um botão do modelo) ou use um modelo aprovado.</p>)}
      </div>
    </div>
  )
}

/** "E depois de enviar?": um jeito só de mandar uma mensagem e seguir pela resposta (P1, 17/11). */
function DepoisDeEnviar({ modo, onModo, disabled, temBotoes, separada }: { modo: ModoDoEnvio; onModo: (m: ModoDoEnvio) => void; disabled?: boolean; temBotoes: boolean; separada?: boolean }) {
  return (
    <Secao titulo="E depois de enviar?">
      {/* O desenho antigo: a espera pela resposta está em passos separados logo abaixo. */}
      {separada && (
        <p className="mb-2.5 flex items-start gap-2 rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5 text-[12px] leading-relaxed text-surface-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" aria-hidden />
          <span>
            Os passos logo abaixo já esperam a resposta a esta mensagem.
            {!disabled && <>{' '}<button type="button" onClick={() => onModo('esperar')} className="font-semibold text-surface-100 underline underline-offset-2 cursor-pointer">Juntar neste passo</button>, com os mesmos caminhos.</>}
          </span>
        </p>
      )}
      <CartoesDeEscolha ariaLabel="O que fazer depois de enviar" valor={modo} onChange={(v) => onModo(v as ModoDoEnvio)} disabled={disabled} cor={COR_DO_GRUPO.mensagem} compacto
        itens={[
          { id: 'seguir', titulo: 'Seguir para o próximo passo', sub: 'Só envia. Para avisos que não pedem resposta.' },
          { id: 'esperar', titulo: 'Esperar a resposta', sub: temBotoes ? 'Um caminho por botão, mais "escreveu" e "não respondeu".' : 'Caminhos "escreveu" e "não respondeu".' },
          { id: 'status', titulo: 'Ver o que a pessoa fez', sub: 'Caminhos por respondeu, leu, recebeu ou não recebeu.' },
        ]} />
    </Secao>
  )
}

const TITULO_DOS_CAMINHOS: Record<string, string> = {
  send_and_wait: 'Para onde vai cada resposta?',
  ask_question: 'Para onde vai cada resposta?',
  branch_message_status: 'Para onde vai cada situação?',
  ai_mission: 'Como a missão pode terminar?',
  ai_extract: 'E depois de ler?',
}
/** Os caminhos de cada passo, em português: o que leva a pessoa por ele (P1, 17/11). */
function explicarCaminhos(no: NoDoGrafo, catalogo: Catalogo): { key: string; titulo: string; explicacao: string; posicao: number; neutro?: boolean }[] | null {
  if (!TITULO_DOS_CAMINHOS[no.type]) return null
  const p = no.params
  const STATUS: Record<string, string> = {
    respondeu: 'Respondeu à mensagem.',
    leu: 'Leu e não respondeu. Só aparece para quem deixa a confirmação de leitura do WhatsApp ligada.',
    entregue: 'A mensagem chegou ao celular, mas não foi lida (ou a pessoa desligou a confirmação de leitura).',
    nao_chegou: 'A mensagem não chegou: número sem WhatsApp, bloqueio ou recusa da Meta.',
  }
  return saidasDoNo(no, catalogo).map((s, posicao) => {
    let explicacao = ''
    if (s.key === 'falhou') explicacao = 'A mensagem não saiu (número sem WhatsApp, bloqueio ou recusa da Meta).'
    else if (no.type === 'send_and_wait') explicacao = s.key === 'outra_resposta' ? 'Escreveu uma mensagem em vez de tocar num botão.' : s.key === 'sem_resposta' ? `Não respondeu em ${rotuloDaDuracao(p.timeout)}.` : `Tocou no botão “${s.label}”.`
    else if (no.type === 'ask_question') explicacao = s.key === 'respondeu' ? 'Respondeu como pedido: a resposta fica guardada.' : s.key === 'invalida' ? `Respondeu algo que não serve, mesmo depois de pedir de novo ${Number(p.retries ?? 2)} vez(es).` : `Não respondeu em ${rotuloDaDuracao(p.timeout)}.`
    else if (no.type === 'branch_message_status') explicacao = STATUS[s.key] ?? ''
    else if (no.type === 'ai_mission') explicacao = s.key === 'concluiu' ? `Aconteceu o critério de conclusão: ${catalogo.events.find((e) => e.key === p.successEvent)?.label?.toLowerCase() ?? 'o evento do tipo de missão'}.` : s.key === 'nao_concluiu' ? 'O agente encerrou sem concluir (ex.: a pessoa recusou) ou bateu o máximo de respostas.' : `Passou ${rotuloDaDuracao(p.deadline)} sem concluir.`
    else if (no.type === 'ai_extract') explicacao = s.key === 'encontrou' ? 'A IA achou os dados pedidos e guardou.' : 'A IA não teve certeza: vale uma pessoa conferir.'
    return { key: s.key, titulo: s.label, explicacao, posicao, neutro: ['sem_resposta', 'falhou', 'incerto', 'prazo', 'nao_chegou'].includes(s.key) }
  })
}

/** O campo aparece conforme outra escolha (`showIf.equals` pode ser uma lista). */
function campoVisivel(c: CampoDoPasso, params: Record<string, unknown>): boolean {
  if (!c.showIf) return true
  const v = params[c.showIf.key]
  return Array.isArray(c.showIf.equals) ? c.showIf.equals.includes(v) : v === c.showIf.equals
}

/** Para que serve a seção, quando a pergunta sozinha não basta (17/11). `*` vale para todos os passos. */
const DESCRICAO_DA_SECAO: Record<string, Partial<Record<TipoDeConfiguracao, string>>> = {
  '*': { posse: 'Para a mensagem automática não cair no meio de um atendimento.' },
  hold_conversation: { tempo: 'Depois desse tempo, as respostas voltam a ir para o agente de IA.' },
  webhook_out: { sistema: 'Para quem tem um técnico: ele informa o endereço e confere o que chega do outro lado.' },
  ai_mission: { ia: 'O agente que já atende o número conversa com a pessoa até cumprir a missão, com regras testadas pela Oryon.' },
  handoff_agent: { mensagem: 'O agente continua a conversa sabendo de onde ela veio.' },
}

/** O que cada jeito de entrar faz, numa frase (17/11). */
const EXPLICACAO_DA_PORTA: Record<Porta['type'], string> = {
  schedule_list: 'Todo dia, no horário escolhido, a jornada pega uma lista do sistema do cliente (ex.: a agenda de amanhã) e põe cada pessoa dela na jornada.',
  event: 'A pessoa entra quando algo acontece com ela (ex.: um agendamento é cancelado, uma etiqueta é posta, a conversa para).',
  segment: 'Entra um grupo de contatos já salvo (os mesmos segmentos das campanhas), na frequência escolhida.',
  webhook: 'Outro sistema da empresa avisa a jornada (ex.: o formulário do site). Precisa de alguém técnico para ligar.',
  manual: 'Você põe as pessoas na jornada à mão, pela aba Pessoas.',
}

// ── um passo ─────────────────────────────────────────────────────────────────

/** Os botões do modelo enviado antes deste passo (sobe pelo desenho até achar um "Enviar modelo"). */

function PainelDeUmPasso({ id, versao, catalogo, apoio, problemas, onMudarVersao, onMudarEArrumar, onApagar, onDuplicar, onFechar, onSelecionar, onEscolherProximo, somenteLeitura, numeroDoPasso, resultados, publicada, onTestarJornada, onEnviarTeste, enviandoTeste, jornadaId, comentariosPorPasso, onComentariosMudaram, onCopiar, onSelecionarRamo, celularAberto, onCelular }: PropsDaGaveta & { id: string }) {
  const [comoFunciona, setComoFunciona] = useState(false)
  const [aba, setAba] = useState<AbaDoPasso>('configurar')
  const no = versao.graph.nodes[id]
  if (!no) return null
  const passo = passoDoCatalogo(catalogo, no.type)
  const mudarNo = (parcial: Partial<typeof no>) => onMudarVersao({ ...versao, graph: { ...versao.graph, nodes: { ...versao.graph.nodes, [id]: { ...no, ...parcial } } } })
  // As saídas que não existem mais (outro modelo, ramo de falha desligado) saem das ligações.
  const semSaidasVelhas = (n: typeof no) => {
    const validas = new Set(saidasDoNo(n, catalogo).map((x) => x.key))
    return Object.fromEntries(Object.entries(n.outputs).filter(([k]) => validas.has(k)))
  }
  const mudarParam = (chave: string, valor: unknown) => {
    const params = { ...no.params, [chave]: valor }
    // "Enviar e esperar resposta": cada botão do modelo vira um caminho.
    if (no.type === 'send_and_wait' && chave === 'templateId') {
      const t = apoio.templates.find((x) => x.id === valor)
      params.replies = (t?.buttons ?? []).map((b, i) => ({ key: chaveDoDado(b) || `botao_${i + 1}`, label: b }))
      const novo = { ...no, params }
      mudarNo({ params, outputs: semSaidasVelhas(novo) })
      return
    }
    // Missão: o tipo traz tudo o que foi testado com ele (critério, escolhas, restrições, prazo e máximo, 17/11).
    if (no.type === 'ai_mission' && chave === 'missionType') Object.assign(params, paramsDaMissao(String(valor), apoio))
    // Liberar desconto nas escolhas tira o "Não oferecer desconto" (as duas juntas se contradizem).
    if (no.type === 'ai_mission' && chave === 'missionOptions' && String((valor as Record<string, unknown>)?.offer ?? '').startsWith('discount') && Array.isArray(params.restrictions)) {
      params.restrictions = (params.restrictions as string[]).filter((r) => r !== 'no_discount')
    }
    // "Extrair dados": a instrução acompanha os dados enquanto ninguém a reescreveu.
    if (no.type === 'ai_extract' && chave === 'fields') {
      const atual = String(no.params.instruction ?? '').trim()
      if (!atual || atual === instrucaoDosDados(no.params.fields)) params.instruction = instrucaoDosDados(valor)
    }
    mudarNo({ params })
  }
  // Vários de uma vez (o código e o rótulo de uma lista, uma pergunta pronta, um modelo de classificação).
  const mudarParams = (parcial: Record<string, unknown>) => {
    const params = { ...no.params, ...parcial }
    mudarNo({ params, outputs: semSaidasVelhas({ ...no, params }) })
  }
  const mudarErro = (p: PoliticaDeErro | undefined) => {
    const novo = { ...no, onError: p }
    mudarNo({ onError: p, outputs: semSaidasVelhas(novo) })
  }
  const campos = (passo?.params ?? []).filter((c) => campoVisivel(c, no.params))
  const meus = problemas.filter((p) => p.nodeId === id)
  // Campo obrigatório vazio aparece no próprio campo; o resto fica na lista.
  const erroDoCampo = new Map(meus.filter((p) => p.code === 'required' && p.field).map((p) => [p.field!, 'Preencha para poder publicar.']))
  // A janela de 24 h tem um aviso próprio no topo (com a troca por um modelo no texto livre): sai da lista.
  // Caminhos sem destino: UM aviso com ação ("Terminar aqui"), no lugar de uma caixa vermelha por caminho (P2, 17/11).
  const CAMINHO_VAZIO = new Set(['branch_without_target', 'no_exit'])
  const outros = meus.filter((p) => !(p.code === 'required' && p.field) && p.code !== 'window_not_guaranteed' && !CAMINHO_VAZIO.has(p.code))
  const vazios = meus.some((p) => CAMINHO_VAZIO.has(p.code)) ? saidasDoNo(no, catalogo).filter((s) => !no.outputs[s.key]) : []
  // "Terminar aqui": o motivo de cada saída vem da leitura do caminho (Sem resposta, Recusou…), já com o código (17/11).
  const terminar = (lista: { key: string; label: string }[]) => (onMudarEArrumar ?? onMudarVersao)(terminarAqui(versao, lista.map((s) => {
    const codigo = sugerirSaida(lerCaminhoDaSaida(versao, id, s.key, catalogo, apoio))
    return { origem: id, saida: s.key, codigo, motivo: catalogo.exitReasons.find((r) => r.code === codigo)?.label ?? s.label }
  })))
  // Visto do "aguardar": a mensagem logo acima pode esperar a resposta ela mesma ("Juntar à mensagem").
  const mensagemAcima = no.type === 'wait_event' && !somenteLeitura ? mensagemQueEsperaAqui(versao, id) : null
  const horasPorPasso = PASSOS_DE_TEXTO_LIVRE.has(no.type) ? horasDesdeAUltimaMensagem(versao) : null
  const janela = horasPorPasso
    ? horasPorPasso.has(id)
      ? { ...situacaoDaJanela(horasPorPasso.get(id)), grave: !Number.isFinite(horasPorPasso.get(id) ?? Infinity), neutro: false }
      : { aberta: false, grave: false, neutro: true, texto: 'Ligue este passo ao desenho para conferir a janela de 24 h do WhatsApp.' }
    : null
  // "Enviar texto" fora da janela: vira um "Enviar modelo" no mesmo lugar, com o mesmo próximo passo.
  const trocarPorModelo = no.type === 'send_text' ? () => onMudarVersao({
    ...versao,
    graph: { ...versao.graph, nodes: { ...versao.graph.nodes, [id]: { type: 'send_template', label: no.label, params: { whatsappNumberId: apoio.whatsappNumbers[0]?.id ?? '', templateId: '', variables: [] }, outputs: { next: no.outputs.next ?? null } } } },
  }) : undefined
  // "Aguardar resposta": a mensagem cujos botões ele espera.
  const respostasA = no.type === 'wait_event' ? modeloAntes(id, versao.graph, apoio) : null

  // Os campos agrupados por tipo de configuração, na ordem em que a pessoa pensa.
  const porTipo = new Map<TipoDeConfiguracao, CampoDoPasso[]>()
  for (const c of campos) {
    const t = tipoDaConfiguracao(c, passo)
    porTipo.set(t, [...(porTipo.get(t) ?? []), c])
  }
  const secoes = ordemDasSecoes(no.type).filter((t) => porTipo.has(t))
  // "3 de 4 prontos": as perguntas principais (sem os ajustes finos) sem nada faltando.
  const principais = secoes.filter((t) => !SECOES_AVANCADAS.has(t))
  const prontas = principais.filter((t) => !porTipo.get(t)!.some((c) => erroDoCampo.has(c.key))).length
  const temCelular = TIPOS_COM_CELULAR.has(no.type)
  const comCelular = temCelular && celularAberto !== false

  const nomeDoPasso = (alvo: string) => versao.graph.nodes[alvo]?.label || passoDoCatalogo(catalogo, versao.graph.nodes[alvo]?.type ?? '')?.label || 'passo'
  // O que aconteceu antes deste passo (17/11): base das sugestões no lugar do texto livre.
  const leitura = lerCaminho(versao, id, catalogo, apoio)
  const contexto: ContextoDoCampo = {
    sugestao: somenteLeitura ? undefined : sugestoesDoPasso(no, leitura, catalogo),
    paraOAgente: no.type === 'handoff_agent' ? contextoParaOAgente(leitura, catalogo) : undefined,
    assunto: leitura.assunto.frase,
    temResumo: leitura.temResumo,
    saidas: saidasDoNo(no, catalogo),
    destino: (saida) => { const alvo = no.outputs[saida]; return alvo && versao.graph.nodes[alvo] ? { id: alvo, nome: nomeDoPasso(alvo) } : null },
    irPara: (alvo) => onSelecionar?.(alvo),
    escolherProximo: !somenteLeitura && onEscolherProximo ? (saida) => onEscolherProximo(id, saida) : undefined,
    terminarAqui: !somenteLeitura ? (saida) => { const s = saidasDoNo(no, catalogo).find((x) => x.key === saida); if (s) terminar([s]) } : undefined,
    botoesDoModelo: respostasA?.modelo?.buttons ?? [],
    variaveisDoDesenho: variaveisDoDesenho(versao.graph),
    // Só as mensagens que vêm ANTES deste passo num caminho (as outras não fazem sentido no "de qual mensagem?").
    passosDeMensagem: mensagensAntes(id, versao.graph)
      .map((k) => [k, versao.graph.nodes[k]] as const)
      .map(([k, n]) => ({ id: k, nome: n.label || passoDoCatalogo(catalogo, n.type)?.label || n.type, detalhe: passoDoCatalogo(catalogo, n.type)?.label ?? '' })),
  }

  // Uma seção de configuração (as perguntas do passo).
  const secao = (tipo: TipoDeConfiguracao) => {
    const lista = porTipo.get(tipo)!
    const estado = lista.some((c) => erroDoCampo.has(c.key)) ? 'falta' : null
    const config = TIPOS_DE_CONFIGURACAO[tipo]
    const avancada = SECOES_AVANCADAS.has(tipo)
    return (
            <Secao key={tipo} titulo={perguntaDaSecao(tipo, no.type)} descricao={DESCRICAO_DA_SECAO[no.type]?.[tipo] ?? DESCRICAO_DA_SECAO['*']?.[tipo]} estado={estado} recolhivel={avancada} resumo={avancada ? resumoDaSecao(lista, no.params, catalogo) : undefined}>
              {lista.map((campo) => (
                <CampoDoPassoEditor
                  key={campo.key}
                  campo={campo}
                  valor={no.params[campo.key]}
                  params={no.params}
                  onChange={(v) => mudarParam(campo.key, v)}
                  onMudarParams={mudarParams}
                  catalogo={catalogo}
                  apoio={apoio}
                  somenteLeitura={somenteLeitura}
                  erro={erroDoCampo.get(campo.key)}
                  tipoDoPasso={no.type}
                  contexto={contexto}
                  semRotulo={lista.length === 1}
                  cor={config.cor}
                />
              ))}
            </Secao>
    )
  }
  // Os caminhos explicados, nos passos cujos campos não mostram para onde cada um vai.
  const caminhos = explicarCaminhos(no, catalogo)

  // Passo de mensagem: a prévia no celular ocupa a altura toda da gaveta, à
  // direita, e o X da gaveta passa para o canto dela.
  return (
    <div className="flex flex-1 min-h-0">
    <div className="flex flex-1 min-w-0 flex-col">
      <Cabecalho
        numero={numeroDoPasso}
        titulo={no.label ?? ''}
        placeholder={passo?.label ?? no.type}
        onTitulo={(v) => mudarNo({ label: v || undefined })}
        subtitulo={passo && <>{ROTULO_DO_GRUPO[passo.group]} · {passo.label}{passo.cost.credits > 0 && <span className="jt-texto-violeta"> · {passo.cost.credits.toLocaleString('pt-BR')} crédito{passo.cost.credits > 1 ? 's' : ''}</span>}</>}
        icone={<IconeDoPasso tipo={no.type} grupo={passo?.group} tamanho="g" />}
        acoes={<>
          {temCelular && !comCelular && onCelular && <Button variant="ghost" size="sm" iconOnly aria-label="Mostrar a prévia no celular" title="Mostrar a prévia no celular" onClick={() => onCelular(true)}><Smartphone className="w-4 h-4" /></Button>}
          {!somenteLeitura && <MenuDoPasso onDuplicar={() => onDuplicar(id)} onApagar={() => onApagar(id)} onCopiar={onCopiar ? () => onCopiar(id) : undefined} onSelecionarRamo={onSelecionarRamo ? () => onSelecionarRamo(id) : undefined} />}
        </>}
        onFechar={comCelular ? undefined : onFechar}
        somenteLeitura={somenteLeitura}
      />
      <AbasDoPasso aba={aba} onAba={setAba} alertaEmConfigurar={meus.some((p) => p.severity === 'error')} comentarios={comentariosPorPasso?.get(id)} />
      {aba === 'comentarios' && jornadaId && (
        <div className="jornadas-aparecer flex-1 min-h-0 overflow-y-auto">
          <ComentariosDoPasso jornadaId={jornadaId} nodeId={id} usuarios={apoio.users} onMudou={onComentariosMudaram} />
        </div>
      )}
      {aba === 'testar' && (
        <div className="jornadas-aparecer flex-1 min-h-0 overflow-y-auto">
          <TesteDoPasso no={no} nodeId={id} jornadaId={jornadaId} catalogo={catalogo} apoio={apoio} versao={versao} onIrPara={(alvo) => onSelecionar?.(alvo)} onTestarJornada={onTestarJornada} semPrevia={comCelular} />
        </div>
      )}
      {aba === 'desempenho' && (
        <div className="jornadas-aparecer flex-1 min-h-0 overflow-y-auto">
          <DesempenhoDoPasso id={id} no={no} catalogo={catalogo} resultados={resultados ?? null} publicada={!!publicada} />
        </div>
      )}
      {aba === 'configurar' && <div className="flex-1 min-h-0 overflow-y-auto">
        {principais.length > 1 && (
          <div className="flex items-center gap-3 px-4 pt-3 text-[12px] text-surface-400" aria-live="polite">
            <span className="shrink-0"><strong className="font-semibold text-surface-100 tabular-nums">{prontas} de {principais.length}</strong> prontos</span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--jt-trilho)]" aria-hidden>
              <span className="block h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${(prontas / principais.length) * 100}%` }} />
            </span>
          </div>
        )}
        {fraseDoPasso(no, catalogo, apoio) && (
          <p className="px-4 pt-3 text-[13px] leading-relaxed text-surface-300">{fraseDoPasso(no, catalogo, apoio)}</p>
        )}
        {vazios.length > 0 && (
          <div className="px-4 pt-4">
            <div className="jt-vermelho flex items-start gap-2 rounded-[8px] px-3 py-2 text-[12px] leading-relaxed">
              <CircleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-danger)]" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p>{vazios.length === 1 && vazios[0].key === 'next'
                  ? 'Este passo ainda não leva a lugar nenhum.'
                  : vazios.length === 1 ? `O caminho “${vazios[0].label}” ainda não leva a lugar nenhum.`
                    : `${vazios.length} caminhos ainda não levam a lugar nenhum: ${vazios.map((v) => `“${v.label}”`).join(', ').replace(/, ([^,]*)$/, ' e $1')}.`}
                  {' '}Para publicar, escolha o próximo passo{vazios.length > 1 ? ' de cada um (abaixo)' : ''} ou termine a jornada ali.</p>
                {!somenteLeitura && (
                  <div className="flex flex-wrap gap-1.5">
                    {vazios.length === 1 && onEscolherProximo && (
                      <button type="button" onClick={() => onEscolherProximo(id, vazios[0].key)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[7px] bg-surface-900 font-semibold text-surface-50 ring-1 ring-inset ring-[var(--jt-borda-opcao)] hover:brightness-110 cursor-pointer"><Plus className="w-3 h-3" aria-hidden />Escolher o próximo passo</button>
                    )}
                    <button type="button" onClick={() => terminar(vazios)} className="inline-flex items-center h-7 px-2.5 rounded-[7px] text-surface-100 hover:bg-[var(--rowhover)] cursor-pointer">
                      {vazios.length === 1 ? 'Terminar aqui' : `Terminar ${vazios.length === 2 ? 'os dois' : `os ${vazios.length}`} aqui`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {(outros.length > 0 || erroDoCampo.size > 0) && (
          <div className="px-4 pt-4 space-y-2">
            <ListaDeProblemas problemas={outros} noProprioPasso />
            {erroDoCampo.size > 0 && (
              <p className="flex items-center gap-1.5 text-[12px] text-surface-300">
                <CircleAlert className="w-3.5 h-3.5 text-[var(--color-danger)]" aria-hidden />
                {erroDoCampo.size === 1 ? 'Falta 1 item' : `Faltam ${erroDoCampo.size} itens`} para poder publicar. Estão marcados abaixo.
              </p>
            )}
          </div>
        )}

        {janela && (
          <div className="px-4 pt-4"><AvisoDaJanela janela={janela} onTrocar={trocarPorModelo} /></div>
        )}
        {no.type === 'wait_event' && (respostasA || (Array.isArray(no.params.events) && (no.params.events as { event?: string }[]).some((e) => e.event === 'template.button_replied'))) && (
          <div className="px-4 pt-4">
            <p className="flex items-start gap-2 rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5 text-[12px] leading-relaxed text-surface-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" aria-hidden />
              {respostasA ? (
                <span>
                  Espera as respostas à mensagem{' '}
                  <button type="button" onClick={() => onSelecionar?.(respostasA.nodeId)} className="font-semibold text-surface-100 underline-offset-2 hover:underline cursor-pointer">{nomeDoPasso(respostasA.nodeId)}</button>
                  {!respostasA.modelo ? <>. Escolha o modelo dela para ver os botões.</>
                    : respostasA.modelo.buttons.length ? <>, que tem os botões {respostasA.modelo.buttons.map((b) => `“${b}”`).join(', ')}.</> : <>, que não tem botões.</>}
                  {mensagemAcima && (
                    <span className="mt-1.5 block">
                      Fica mais simples a própria mensagem esperar a resposta, com um caminho por botão.{' '}
                      <button type="button" className="font-semibold text-surface-100 underline underline-offset-2 cursor-pointer"
                        onClick={() => { (onMudarEArrumar ?? onMudarVersao)(trocarModoDoEnvio(versao, mensagemAcima, 'esperar', apoio, catalogo)); onSelecionar?.(mensagemAcima) }}>
                        Juntar a “{nomeDoPasso(mensagemAcima)}”
                      </button>
                    </span>
                  )}
                </span>
              ) : <span>Não há mensagem antes deste passo: os caminhos de botão nunca vão acontecer. Ponha um “Enviar modelo” com botões antes dele.</span>}
            </p>
          </div>
        )}

        {secoes.filter((t) => !SECOES_AVANCADAS.has(t)).map((tipo) => (
          <Fragment key={tipo}>
            {secao(tipo)}
            {tipo === 'mensagem' && (no.type === 'send_template' || no.type === 'send_and_wait') && (
              <DepoisDeEnviar modo={modoDoEnvio(versao, id)} disabled={somenteLeitura} separada={esperaEmPassosSeparados(versao, id)}
                temBotoes={!!apoio.templates.find((t) => t.id === no.params.templateId)?.buttons.length}
                onModo={(m) => (onMudarEArrumar ?? onMudarVersao)(trocarModoDoEnvio(versao, id, m, apoio, catalogo))} />
            )}
          </Fragment>
        ))}
        {caminhos && (
          <Secao titulo={TITULO_DOS_CAMINHOS[no.type] ?? 'Para onde vai cada caminho?'}>
            <CaminhosDoPasso caminhos={caminhos} contexto={contexto} />
          </Secao>
        )}
        {secoes.filter((t) => SECOES_AVANCADAS.has(t)).map((tipo) => <Fragment key={tipo}>{secao(tipo)}</Fragment>)}

        {!secoes.length && <p className="px-4 py-4 text-[14px] text-surface-400">Este passo não precisa de configuração.</p>}

        {passo?.onError && (
          <SeDerErro politica={no.onError} padrao={passo.onError} onChange={mudarErro} disabled={somenteLeitura} destinoDaFalha={contexto.destino('falhou')} onIrPara={(alvo) => onSelecionar?.(alvo)} envio={PASSOS_DE_ENVIO.has(no.type)} exemplo={exemploDoErro(no.type, passo.group)} />
        )}

        {passo && (
          <div className="px-4 py-3">
            <button type="button" onClick={() => setComoFunciona((v) => !v)} aria-expanded={comoFunciona}
              className="inline-flex items-center gap-1.5 text-[12px] text-surface-400 hover:text-surface-200 cursor-pointer">
              <Info className="w-3.5 h-3.5" aria-hidden />Como este passo funciona
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', comoFunciona && 'rotate-180')} aria-hidden />
            </button>
            {comoFunciona && (
              <div className="jornadas-aparecer mt-2 rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5 space-y-2">
                <p className="text-[12px] leading-relaxed text-surface-300">{passo.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Selo tom={passo.cost.credits > 0 ? 'violeta' : 'cinza'}>Custo: {passo.cost.label}</Selo>
                  {passo.requires.includes('window_24h') && <Selo tom="ambar">Precisa da janela de 24 h</Selo>}
                  {passo.requires.includes('connector') && <Selo tom="azul">Usa o sistema do cliente</Selo>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>}
    </div>
    {comCelular && (
      <PreviaNoCelular no={no} id={id} grafo={versao.graph} catalogo={catalogo} apoio={apoio} jornadaId={jornadaId} enviando={enviandoTeste} onFechar={onFechar} onRecolher={onCelular ? () => onCelular(false) : undefined} onEnviarTeste={!somenteLeitura && onEnviarTeste && TIPOS_DE_MENSAGEM.has(no.type) ? () => onEnviarTeste(id) : undefined} />
    )}
    </div>
  )
}

// ── se der erro (§2.6) ───────────────────────────────────────────────────────

const DEPOIS_DO_ERRO: { id: PoliticaDeErro['then']; titulo: string; sub: string }[] = [
  { id: 'human', titulo: 'Entregar a humano', sub: 'A conversa vai para a equipe, com o motivo do erro.' },
  { id: 'skip', titulo: 'Pular este passo', sub: 'Segue para o próximo passo como se tivesse dado certo.' },
  { id: 'exit', titulo: 'Tirar da jornada', sub: 'A pessoa sai, com o motivo "erro".' },
  { id: 'branch', titulo: 'Seguir pelo caminho "Falhou"', sub: 'O passo ganha uma saída "Falhou" no desenho. Você decide o que acontece (ex.: avisar a equipe).' },
]

function frasesDoErro(p: PoliticaDeErro, envio = false): string {
  const depois = { human: 'entrega a humano', skip: 'pula o passo', exit: 'tira da jornada', branch: `segue pelo caminho "${envio ? 'Não enviou' : 'Falhou'}"` }[p.then]
  return p.retries ? `Tenta de novo ${p.retries === 1 ? '1 vez' : `${p.retries} vezes`} e, se não der, ${depois}.` : `Não repete: ${depois}.`
}

/** Nos passos que ENVIAM: a mensagem não saiu, então "entregar a humano" e "Falhou" ganham o texto certo (P0, 17/11). */
const DEPOIS_DO_ERRO_NO_ENVIO: typeof DEPOIS_DO_ERRO = [
  { id: 'exit', titulo: 'Tirar da jornada', sub: 'A pessoa sai, com o motivo "não deu para enviar". Aparece em Pessoas.' },
  { id: 'branch', titulo: 'Seguir pelo caminho "Não enviou"', sub: 'O passo ganha a saída "Não enviou" no desenho (ex.: avisar a equipe para ligar).' },
  { id: 'skip', titulo: 'Pular este passo', sub: 'Segue para o próximo passo como se a mensagem tivesse saído.' },
  { id: 'human', titulo: 'Entregar a humano', sub: 'A conversa vai para a equipe. Atenção: a mensagem não chegou à pessoa.' },
]

/**
 * O exemplo de erro de CADA tipo de passo (P2, 17/11): antes, "a Meta recusou o envio" aparecia
 * até em passos que não enviam nada (segurar a conversa, entregar ao agente, missão).
 */
function exemploDoErro(tipo: string, grupo: string): string {
  if (PASSOS_DE_ENVIO.has(tipo)) return 'Ex.: o número não tem WhatsApp, a pessoa bloqueou a linha ou a Meta recusou o envio. Erros definitivos não se repetem; os passageiros, sim, com espera crescente.'
  if (tipo === 'notify_team') return 'Ex.: o departamento não tem ninguém ou o aviso não saiu. Cada tentativa espera mais que a anterior.'
  if (tipo === 'internal_note') return 'Ex.: a conversa não existe mais. Cada tentativa espera mais que a anterior.'
  if (grupo === 'conversa') return 'Ex.: a conversa foi encerrada ou a linha do WhatsApp está desconectada. Cada tentativa espera mais que a anterior.'
  if (grupo === 'crm') return 'Ex.: a etiqueta, a etapa ou o campo foi apagado, ou o contato foi removido. Cada tentativa espera mais que a anterior.'
  if (grupo === 'integracao') return 'Ex.: o sistema do cliente (agenda, ERP) não respondeu ou recusou o pedido. Cada tentativa espera mais que a anterior.'
  if (grupo === 'ia') return 'Ex.: o serviço de IA ficou fora do ar ou demorou demais para responder. Cada tentativa espera mais que a anterior.'
  return 'Ex.: um serviço ficou fora do ar. Cada tentativa espera mais que a anterior.'
}

/** O que fazer quando o passo falha. Fechado por padrão: mostra a regra em uma linha. */
function SeDerErro({ politica, padrao, onChange, disabled, destinoDaFalha, onIrPara, envio = false, exemplo }: {
  /** Passo que envia mensagem: os textos falam de "não enviou". */
  envio?: boolean
  /** O exemplo de erro deste tipo de passo. */
  exemplo?: string
  politica?: PoliticaDeErro
  padrao: PoliticaDeErro
  onChange: (p: PoliticaDeErro | undefined) => void
  disabled?: boolean
  /** Com o ramo de falha: para onde ele vai, se já estiver ligado. */
  destinoDaFalha?: { id: string; nome: string } | null
  onIrPara?: (id: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const p = politica ?? padrao
  const ehPadrao = p.retries === padrao.retries && p.then === padrao.then
  return (
    <section className="px-4 py-4 border-b border-surface-700">
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="group flex w-full items-center gap-2 text-left cursor-pointer">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-surface-50">E se der erro?</span>
          <span className="block truncate text-[12px] text-surface-400">{frasesDoErro(p, envio)}{ehPadrao ? ' (padrão)' : ''}</span>
        </span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-surface-500 transition-transform duration-200 group-hover:text-surface-300', aberto && 'rotate-180')} aria-hidden />
      </button>
      {aberto && (
        <div className="jornadas-aparecer mt-3 space-y-4">
          <p className="text-[12px] leading-snug text-surface-400">{exemplo ?? (envio
            ? 'Ex.: o número não tem WhatsApp, a pessoa bloqueou a linha ou a Meta recusou o envio. Erros definitivos não se repetem; os passageiros, sim, com espera crescente.'
            : 'Ex.: o sistema do cliente não respondeu ou um serviço ficou fora do ar. Cada tentativa espera mais que a anterior.')}</p>
          <div>
            <Rotulo texto="Tentar de novo" />
            <Pilulas ariaLabel="Quantas vezes tentar de novo" cor="cinza" disabled={disabled} valor={String(p.retries)} onChange={(v) => onChange({ ...p, retries: Number(v) })}
              opcoes={[{ value: '0', label: 'Não repetir' }, { value: '1', label: '1 vez' }, { value: '3', label: '3 vezes' }, { value: '5', label: '5 vezes' }]} />
          </div>
          <div>
            <Rotulo texto={p.retries ? 'Se ainda assim falhar' : 'Quando falhar'} />
            <CartoesDeEscolha ariaLabel="O que fazer depois do erro" valor={p.then} onChange={(v) => onChange({ ...p, then: v as PoliticaDeErro['then'] })} disabled={disabled} cor="cinza" compacto itens={envio ? DEPOIS_DO_ERRO_NO_ENVIO : DEPOIS_DO_ERRO} />
          </div>
          {p.then === 'branch' && (
            <p className="flex items-center gap-2 rounded-[8px] bg-[var(--jt-poco)] px-3 py-2 text-[12px] leading-snug text-surface-300">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--jt-vermelho-sobre)]" aria-hidden />
              {destinoDaFalha
                ? <>“{envio ? 'Não enviou' : 'Falhou'}” vai para <button type="button" className="font-semibold text-surface-100 underline-offset-2 hover:underline cursor-pointer" onClick={() => onIrPara?.(destinoDaFalha.id)}>{destinoDaFalha.nome}</button>.</>
                : <>Ligue o caminho “{envio ? 'Não enviou' : 'Falhou'}” no desenho, embaixo deste passo. Sem ligação, a pessoa sai da jornada.</>}
            </p>
          )}
          {!ehPadrao && !disabled && (
            <button type="button" onClick={() => onChange(undefined)} className="text-[12px] text-surface-400 hover:text-surface-200 cursor-pointer">Voltar ao padrão ({frasesDoErro(padrao, envio).toLowerCase()})</button>
          )}
        </div>
      )}
    </section>
  )
}

// ── a entrada ────────────────────────────────────────────────────────────────

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

const PARAMS_PADRAO = PARAMS_PADRAO_DA_PORTA

const COR_DA_ENTRADA: TomDaJornada = 'teal'

function PainelDaEntrada({ versao, catalogo, apoio, problemas, onMudarVersao, onFechar, somenteLeitura }: PropsDaGaveta) {
  const entrada = versao.entry
  const mudar = (e: Entrada) => onMudarVersao({ ...versao, entry: e })
  const mudarPorta = (i: number, p: Porta) => mudar({ ...entrada, doors: entrada.doors.map((d, j) => (j === i ? p : d)) })
  const dis = somenteLeitura
  const meus = problemas.filter((p) => p.code === 'no_door' || p.code === 'no_start')

  return (
    <>
      <Cabecalho
        titulo="Entrada"
        subtitulo="Como as pessoas entram, quem pode entrar e se entra de novo"
        icone={<IconeDoPasso tipo="entrada" tamanho="g" />}
        onFechar={onFechar}
        somenteLeitura
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {meus.length > 0 && <div className="px-4 pt-4"><ListaDeProblemas problemas={meus} /></div>}
        <Secao titulo="Por onde as pessoas entram?" estado={entrada.doors.length ? null : 'falta'} descricao="O que põe a pessoa na jornada. Pode haver mais de um jeito (ex.: a agenda do dia e um formulário do site).">
          {entrada.doors.map((porta, i) => (
            <div key={porta.id} className="rounded-[10px] bg-[var(--jt-poco)] p-3 space-y-3">
              <div className="flex items-start gap-2">
                <div role="radiogroup" aria-label="Como a pessoa entra" className="grid flex-1 grid-cols-2 gap-1">
                  {OPCOES_DE_PORTA.map((o) => {
                    const ligada = o.value === porta.type
                    return (
                      <button key={o.value} type="button" role="radio" aria-checked={ligada} disabled={dis}
                        onClick={() => { const t = o.value as Porta['type']; if (t !== porta.type) mudarPorta(i, { ...porta, type: t, params: { ...PARAMS_PADRAO[t] } }) }}
                        style={ligada ? tomDaCor(COR_DA_ENTRADA) : undefined}
                        className={cn('inline-flex items-center gap-1.5 min-h-8 px-2.5 py-1.5 rounded-[8px] text-left text-[12px] leading-tight transition-colors cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', ligada ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-300 hover:text-surface-100')}>
                        <IconeDoPasso tipo={TIPO_DA_PORTA[o.value] ?? 'porta_manual'} tamanho="p" /><span>{o.label}</span>
                      </button>
                    )
                  })}
                </div>
                {!dis && entrada.doors.length > 1 && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar este jeito de entrar" onClick={() => mudar({ ...entrada, doors: entrada.doors.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
              <p className="text-[12px] leading-snug text-surface-400">{EXPLICACAO_DA_PORTA[porta.type]}</p>
              <ParametrosDaPorta porta={porta} catalogo={catalogo} apoio={apoio} disabled={dis} onChange={(params) => mudarPorta(i, { ...porta, params })} />
            </div>
          ))}
          {!dis && (
            <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => mudar({ ...entrada, doors: [...entrada.doors, { id: `p_${Math.random().toString(36).slice(2, 7)}`, type: 'event', params: { ...PARAMS_PADRAO.event } }] })}>
              Outro jeito de entrar
            </Button>
          )}
        </Secao>

        <Secao titulo="Quem pode entrar?" descricao="Só entra quem atende às condições abaixo. Sem condição, todos entram.">
          <EditorDeCondicoes grupo={entrada.criteria} onChange={(g) => mudar({ ...entrada, criteria: g })} catalogo={catalogo} apoio={apoio} disabled={dis} naEntrada />
          {entrada.criteria.conditions.length > 0 && (
            <div className="flex items-start justify-between gap-3 rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-surface-100">Conferir de novo antes de cada mensagem</p>
                <p className="mt-0.5 text-[12px] leading-snug text-surface-400">Quem deixou de se encaixar sai (ex.: tirou a etiqueta). Desligado, o filtro vale só na entrada.</p>
              </div>
              <Switch checked={!!entrada.recheckBeforeSend} disabled={dis} onChange={(v) => mudar({ ...entrada, recheckBeforeSend: v })} aria-label="Conferir o filtro de novo antes de cada mensagem" />
            </div>
          )}
          <div className="rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-surface-100">Limitar quantos entram</p>
                <p className="mt-0.5 text-[12px] leading-snug text-surface-400">Para um segmento grande ou uma campanha: passou do limite, a pessoa fica de fora (aparece no "por que não entrou").</p>
              </div>
              <Switch checked={!!entrada.limit} disabled={dis} onChange={(v) => mudar({ ...entrada, limit: v ? { max: 200, per: 'day' } : null })} aria-label="Limitar quantos entram" />
            </div>
            {entrada.limit && (
              <div className="jornadas-aparecer flex flex-wrap items-center gap-2 text-[14px] text-surface-200">
                <span>No máximo</span>
                <Input size="sm" type="number" min={1} className="w-24" aria-label="Máximo de entradas" value={entrada.limit.max} disabled={dis} onChange={(e) => mudar({ ...entrada, limit: { ...entrada.limit!, max: Math.max(1, Number(e.target.value) || 1) } })} />
                <span>pessoas</span>
                <Pilulas ariaLabel="Período do limite de entradas" cor="cinza" disabled={dis} valor={entrada.limit.per} onChange={(v) => mudar({ ...entrada, limit: { ...entrada.limit!, per: v as 'day' | 'week' | 'total' } })}
                  opcoes={[{ value: 'day', label: 'por dia' }, { value: 'week', label: 'por semana' }, { value: 'total', label: 'no total' }]} />
              </div>
            )}
          </div>
        </Secao>

        <Secao titulo="Pode entrar de novo?">
          <CartoesDeEscolha
            ariaLabel="Regra de reentrada"
            valor={entrada.reentry.mode}
            onChange={(v) => mudar({ ...entrada, reentry: { ...entrada.reentry, mode: v as Entrada['reentry']['mode'] } })}
            disabled={dis}
            cor={COR_DO_GRUPO.controle}
            compacto
            itens={[
              { id: 'one_open', titulo: 'Uma de cada vez', sub: 'Pode voltar depois que a anterior terminar. É o padrão.' },
              { id: 'per_subject', titulo: 'Uma por agendamento, negócio ou pedido', sub: 'A mesma pessoa pode estar duas vezes: uma para cada agendamento.' },
              { id: 'once', titulo: 'Só uma vez por pessoa', sub: 'Quem já passou não entra mais.' },
              { id: 'cooldown', titulo: 'De novo depois de alguns dias', sub: 'Um intervalo mínimo entre as entradas.' },
            ]}
          />
          {entrada.reentry.mode === 'per_subject' && (
            <label className="block">
              <Rotulo texto="O que diferencia um do outro" ajuda="Ex.: o número do agendamento. Cada número diferente é uma inscrição." />
              <Input size="sm" className="font-mono text-[12px]" value={entrada.reentry.subjectKey ?? ''} disabled={dis} onChange={(e) => mudar({ ...entrada, reentry: { ...entrada.reentry, subjectKey: e.target.value } })} />
            </label>
          )}
          {entrada.reentry.mode === 'cooldown' && (
            <label className="block">
              <Rotulo texto="Depois de quantos dias" />
              <Input size="sm" type="number" min={1} className="w-28" value={entrada.reentry.cooldownDays ?? 30} disabled={dis} onChange={(e) => mudar({ ...entrada, reentry: { ...entrada.reentry, cooldownDays: Number(e.target.value) } })} />
            </label>
          )}
        </Secao>

        <Secao titulo="Quem nunca entra?" descricao="Vale para todos os jeitos de entrar, antes das condições acima.">
          <div className="flex items-start justify-between gap-3 rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-surface-100">Quem pediu para não receber</p>
              <p className="mt-0.5 text-[12px] leading-snug text-surface-400">Vale para todas as jornadas e não se desliga.</p>
            </div>
            <Selo tom="cinza">Sempre</Selo>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-surface-100">Quem está esperando resposta em outra jornada</p>
              <p className="mt-0.5 text-[12px] leading-snug text-surface-400">Para a pessoa não receber duas conversas automáticas ao mesmo tempo.</p>
            </div>
            <Switch checked={entrada.skipIfHeldByOtherJourney !== false} disabled={dis} onChange={(v) => mudar({ ...entrada, skipIfHeldByOtherJourney: v })} aria-label="Barrar quem está esperando resposta em outra jornada" />
          </div>
        </Secao>
      </div>
    </>
  )
}

/** Os dias da semana, ligados na cor da entrada. */
function DiasDaSemana({ dias, onChange, disabled }: { dias: string[]; onChange: (d: string[]) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Dias da semana">
      {DIAS.map((d) => {
        const ligado = dias.includes(d)
        return (
          <button key={d} type="button" disabled={disabled} aria-pressed={ligado}
            onClick={() => onChange(ligado ? dias.filter((x) => x !== d) : [...dias, d])}
            style={ligado ? tomDaCor(COR_DA_ENTRADA) : undefined}
            className={cn('h-7 min-w-9 px-2 rounded-[7px] text-[12px] font-semibold transition-colors cursor-pointer disabled:cursor-default', ligado ? '' : 'bg-surface-700 text-surface-400 hover:text-surface-200')}>
            {d}
          </button>
        )
      })}
    </div>
  )
}

/** Chaves de um envio de exemplo (no produto: o backend guarda só os NOMES das chaves, `sampleKeys`). */
const EXEMPLO_DO_WEBHOOK = ['nome', 'telefone', 'email', 'id_lead', 'imovel', 'origem', 'mensagem']

/** Webhook de entrada: endereço e segredo próprios, e o mapeamento feito a partir de um envio de exemplo. */
function PortaWebhook({ p, onChange, disabled }: { p: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void; disabled?: boolean }) {
  const [ouvindo, setOuvindo] = useState(false)
  const chaves = (Array.isArray(p.sampleKeys) ? p.sampleKeys : []) as string[]
  const mapa = (p.mapping ?? { phone: '', subject: '', variables: [] }) as { phone: string; subject: string; variables: string[] }
  const setMapa = (m: Partial<typeof mapa>) => onChange({ ...p, mapping: { ...mapa, ...m } })
  const ouvir = () => {
    setOuvindo(true)
    window.setTimeout(() => {
      setOuvindo(false)
      const tel = EXEMPLO_DO_WEBHOOK.find((k) => /tel|phone|whats|celular/.test(k)) ?? ''
      const assunto = EXEMPLO_DO_WEBHOOK.find((k) => /^id/.test(k)) ?? ''
      onChange({ ...p, sampleKeys: EXEMPLO_DO_WEBHOOK, mapping: { phone: tel, subject: assunto, variables: EXEMPLO_DO_WEBHOOK.filter((k) => k !== tel && k !== 'mensagem') } })
    }, 1100)
  }
  return (
    <div className="space-y-2.5">
      <label className="block"><Rotulo texto="Nome (para você reconhecer)" /><Input size="sm" value={String(p.name ?? '')} disabled={disabled} onChange={(e) => onChange({ ...p, name: e.target.value })} /></label>
      <div className="rounded-[8px] bg-[var(--jt-poco)] px-3 py-2 text-[12px] leading-relaxed text-surface-400">
        Outro sistema (ex.: o formulário do site) manda os dados para um endereço desta jornada. O endereço e a senha aparecem ao publicar: passe os dois ao responsável técnico desse sistema.
      </div>
      {!chaves.length ? (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Ear className="w-3.5 h-3.5" />} disabled={disabled || ouvindo} onClick={ouvir}>{ouvindo ? 'Esperando um envio…' : 'Ouvir um exemplo'}</Button>
          <span className="text-[12px] text-surface-500">Peça ao outro sistema um envio de teste: a tela mostra os dados que chegam, para você escolher.</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <Rotulo texto="Em qual dado vem o telefone" obrigatorio />
              <Select size="sm" value={mapa.phone} disabled={disabled} onChange={(e) => setMapa({ phone: e.target.value })}>
                {!mapa.phone && <option value="">Escolha</option>}
                {chaves.map((k) => <option key={k} value={k}>{k}</option>)}
              </Select>
            </label>
            <label className="block">
              <Rotulo texto="O que diferencia um pedido do outro" />
              <Select size="sm" value={mapa.subject} disabled={disabled} onChange={(e) => setMapa({ subject: e.target.value })}>
                <option value="">Nenhum</option>
                {chaves.map((k) => <option key={k} value={k}>{k}</option>)}
              </Select>
            </label>
          </div>
          <div>
            <Rotulo texto="Dados para usar na jornada" ajuda="Os que você marcar ficam disponíveis para as mensagens e as condições." />
            <div className="flex flex-wrap gap-1">
              {chaves.filter((k) => k !== mapa.phone).map((k) => {
                const ligado = mapa.variables.includes(k)
                return (
                  <button key={k} type="button" disabled={disabled} aria-pressed={ligado}
                    onClick={() => setMapa({ variables: ligado ? mapa.variables.filter((x) => x !== k) : [...mapa.variables, k] })}
                    style={ligado ? tomDaCor(COR_DA_ENTRADA) : undefined}
                    className={cn('inline-flex items-center gap-1 h-7 px-2 rounded-[7px] font-mono text-[12px] transition-colors cursor-pointer disabled:cursor-default', ligado ? 'font-semibold' : 'bg-surface-700 text-surface-400 hover:text-surface-200')}>
                    {ligado && <Check className="w-3 h-3" aria-hidden />}{k}
                  </button>
                )
              })}
            </div>
          </div>
          {!disabled && <button type="button" onClick={ouvir} className="text-[12px] text-surface-400 hover:text-surface-200 cursor-pointer">{ouvindo ? 'Esperando um envio…' : 'Ouvir outro exemplo'}</button>}
        </div>
      )}
    </div>
  )
}

function ParametrosDaPorta({ porta, catalogo, apoio, onChange, disabled }: { porta: Porta; catalogo: Catalogo; apoio: ApoioDoEditor; onChange: (p: Record<string, unknown>) => void; disabled?: boolean }) {
  const p = porta.params
  const set = (k: string, v: unknown) => onChange({ ...p, [k]: v })
  switch (porta.type) {
    case 'schedule_list': {
      const dias = (Array.isArray(p.weekdays) ? p.weekdays : []) as string[]
      return (
        <div className="space-y-2.5">
          <label className="block">
            <Rotulo texto="Lista do sistema do cliente" />
            <Select size="sm" value={String(p.operation ?? '')} disabled={disabled} onChange={(e) => set('operation', e.target.value)}>
              {catalogo.connectorOperations.filter((o) => o.kind === 'list').map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><Rotulo texto="Horário" /><Input size="sm" type="time" value={String(p.time ?? '09:00')} disabled={disabled} onChange={(e) => set('time', e.target.value)} /></label>
            <label className="block"><Rotulo texto="Dias à frente" ajuda="1 = a lista de amanhã; 0 = a de hoje." /><Input size="sm" type="number" min={0} value={Number(p.dayOffset ?? 1)} disabled={disabled} onChange={(e) => set('dayOffset', Number(e.target.value))} /></label>
          </div>
          <div>
            <Rotulo texto="Dias da semana" />
            <DiasDaSemana dias={dias} onChange={(d) => set('weekdays', d)} disabled={disabled} />
          </div>
          <p className="text-[12px] text-surface-500 leading-relaxed">No horário da empresa. Cada pessoa da lista entra na jornada; quem ainda não é contato vira contato.</p>
        </div>
      )
    }
    case 'event':
      return (
        <div className="space-y-2.5">
          <label className="block">
            <Rotulo texto="Quando acontecer" />
            <Select size="sm" value={String(p.event ?? '')} disabled={disabled} onChange={(e) => set('event', e.target.value)}>
              {catalogo.events.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
            </Select>
          </label>
          {p.event === 'conversation.inactive' && (
            <label className="block">
              <Rotulo texto="Depois de quantas horas sem resposta do contato" ajuda="Conta a partir da última mensagem da empresa que ficou sem resposta. Ex.: 24 h para um follow-up." />
              <Input size="sm" type="number" min={1} max={720} className="w-28" value={Number(p.hours ?? 24)} disabled={disabled} onChange={(e) => set('hours', Math.max(1, Number(e.target.value) || 1))} />
            </label>
          )}
        </div>
      )
    case 'segment': {
      const frequencia = String(p.frequency ?? 'weekly')
      const dias = (Array.isArray(p.weekdays) ? p.weekdays : []) as string[]
      return (
        <div className="space-y-2.5">
          <label className="block">
            <Rotulo texto="Qual grupo de contatos" ajuda="Os mesmos segmentos salvos das campanhas." />
            <Select size="sm" value={String(p.segmentId ?? '')} disabled={disabled} onChange={(e) => onChange({ ...p, segmentId: e.target.value, segmentName: apoio.segments.find((s) => s.id === e.target.value)?.name ?? '' })}>
              {!p.segmentId && <option value="">Escolha o segmento</option>}
              {apoio.segments.map((s) => <option key={s.id} value={s.id}>{s.name} · {numero(s.size)} contatos</option>)}
            </Select>
          </label>
          <div>
            <Rotulo texto="Com que frequência" />
            <Pilulas ariaLabel="Frequência" cor={COR_DA_ENTRADA} disabled={disabled} valor={frequencia} onChange={(v) => set('frequency', v)}
              opcoes={[{ value: 'daily', label: 'Todo dia' }, { value: 'weekly', label: 'Toda semana' }, { value: 'monthly', label: 'Todo mês' }]} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {frequencia === 'weekly' && <div><Rotulo texto="Em que dias" /><DiasDaSemana dias={dias} onChange={(d) => set('weekdays', d)} disabled={disabled} /></div>}
            {frequencia === 'monthly' && <label className="block"><Rotulo texto="No dia" /><Input size="sm" type="number" min={1} max={28} className="w-20" value={Number(p.monthDay ?? 1)} disabled={disabled} onChange={(e) => set('monthDay', Math.min(28, Math.max(1, Number(e.target.value) || 1)))} /></label>}
            <label className="block"><Rotulo texto="Horário" /><Input size="sm" type="time" className="w-[112px]" value={String(p.time ?? '10:00')} disabled={disabled} onChange={(e) => set('time', e.target.value)} /></label>
          </div>
          <p className="text-[12px] text-surface-500 leading-relaxed">No horário da empresa. Quem já entrou antes segue a regra de “Pode entrar de novo?”, mais abaixo.</p>
        </div>
      )
    }
    case 'webhook':
      return <PortaWebhook p={p} onChange={onChange} disabled={disabled} />
    case 'manual':
      return <p className="text-[12px] text-surface-500 leading-relaxed">Na aba Pessoas, use “Inscrever contatos”. Um sistema da empresa também pode inscrever pela API.</p>
  }
}

// ── as configurações da jornada (janela) ─────────────────────────────────────

const EVENTOS_DE_SAIDA = [
  { key: 'time.subject_passed', label: 'A data passou (ex.: o agendamento já aconteceu)' },
  { key: 'contact.opted_out', label: 'Pediu para não receber' },
]

export function ConfiguracoesDaJornada({ open, onClose, jornada, versao, catalogo, nome, descricao, onMudarVersao, onMudarNome, somenteLeitura, apoio, onJornadaMudou }: {
  open: boolean
  onClose: () => void
  jornada: Jornada
  /** Para escolher quem é avisado dos alertas. */
  apoio?: ApoioDoEditor
  onJornadaMudou?: (j: Jornada) => void
  versao: VersaoDaJornada
  catalogo: Catalogo
  nome: string
  descricao: string
  onMudarVersao: (v: VersaoDaJornada) => void
  onMudarNome: (nome: string, descricao: string) => void
  somenteLeitura: boolean
}) {
  const metas = versao.goals
  const mudar = (m: Metas) => onMudarVersao({ ...versao, goals: m })
  const eventos = [...EVENTOS_DE_SAIDA, ...catalogo.events]
  const dis = somenteLeitura
  const creditos = Object.values(versao.graph.nodes).reduce((s, n) => s + (passoDoCatalogo(catalogo, n.type)?.cost.credits ?? 0), 0)
  const usaIA = Object.values(versao.graph.nodes).some((n) => passoDoCatalogo(catalogo, n.type)?.group === 'ia')
  const versoes = jornada.enrolledByVersion.filter((v) => v.count > 0)
  // Em abas (P2, 16/11): a identidade separada das regras de execução.
  const [aba, setAba] = useState<'geral' | 'metas' | 'horarios' | 'ia' | 'alertas'>('geral')

  return (
    <Modal open={open} onClose={onClose} title="Configurações da jornada" className="max-w-[640px]" footer={<div className="flex justify-end"><Button onClick={onClose}>Pronto</Button></div>}>
      <Tabs label="Partes das configurações" value={aba} onChange={setAba} className="-mt-1 mb-4" tabs={[
        { id: 'geral', label: 'Geral' },
        { id: 'metas', label: 'Metas e saídas' },
        { id: 'horarios', label: 'Horários e limites' },
        { id: 'ia', label: 'IA' },
        ...(apoio && onJornadaMudou ? [{ id: 'alertas' as const, label: 'Alertas' }] : []),
      ]} />
      <div className="space-y-6 text-sm">
        {aba === 'geral' && (<>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Dentro agora', numero(jornada.enrolledNow)],
            ['IA por pessoa', creditos ? `${creditos.toLocaleString('pt-BR')} crédito${creditos > 1 ? 's' : ''}` : 'Sem IA'],
            ['Versão no ar', jornada.publishedVersion ? `v${jornada.publishedVersion}` : 'Nunca publicada'],
            ['Por versão', versoes.length ? versoes.map((v) => `${numero(v.count)} na v${v.version}`).join(' · ') : '—'],
          ].map(([r, v]) => (
            <div key={r} className="rounded-[8px] bg-surface-800 px-3 py-2">
              <dt className="text-[12px] text-surface-500">{r}</dt>
              <dd className="text-[14px] font-semibold text-surface-100 truncate" title={v}>{v}</dd>
            </div>
          ))}
        </dl>

        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">Identificação</h3>
          <label className="block"><Rotulo texto="Nome" obrigatorio /><Input size="sm" value={nome} disabled={dis} onChange={(e) => onMudarNome(e.target.value, descricao)} /></label>
          <label className="block"><Rotulo texto="Descrição" /><Textarea size="sm" rows={2} value={descricao} disabled={dis} onChange={(e) => onMudarNome(nome, e.target.value)} /></label>
        </section>
        </>)}

        {aba === 'metas' && (<>

        <section className="space-y-3">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">Meta contínua</h3>
            <p className="mt-1 text-[12px] text-surface-400">Quando a meta acontece, a pessoa sai na hora, de qualquer passo. Ex.: o agendamento foi confirmado conversando com o agente.</p>
          </div>
          {metas.goals.map((g, i) => (
            <div key={g.id} className="rounded-[10px] border border-surface-700 bg-surface-800 p-3 space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
                <Input size="sm" value={g.label} disabled={dis} aria-label="Nome da meta" onChange={(e) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <Select size="sm" value={g.event} disabled={dis} aria-label="Evento da meta" onChange={(e) => {
                  // O nome acompanha o evento enquanto ninguém o reescreveu (17/11): "Agendamento confirmado".
                  const antes = catalogo.events.find((ev) => ev.key === g.event)?.label
                  const depois = catalogo.events.find((ev) => ev.key === e.target.value)?.label
                  const nome = !g.label.trim() || g.label === 'Nova meta' || g.label === antes ? (depois ?? g.label) : g.label
                  mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, event: e.target.value, label: nome } : x)) })
                }}>
                  {catalogo.events.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
                </Select>
                {!dis && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar meta" onClick={() => mudar({ ...metas, goals: metas.goals.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
              <div className="flex items-center justify-between gap-2 text-[12px] text-surface-400">
                <span>Só do mesmo agendamento (ou negócio) que trouxe a pessoa</span>
                <Switch checked={g.sameSubject} disabled={dis} onChange={(v) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, sameSubject: v } : x)) })} aria-label="Só do mesmo agendamento" />
              </div>
              <div>
                <p className="mb-1.5 text-[12px] text-surface-400">Conta como meta se acontecer</p>
                <Pilulas ariaLabel="Janela da meta" cor="verde" disabled={dis} valor={String(g.windowDays ?? '')}
                  onChange={(v) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, windowDays: v ? Number(v) : null } : x)) })}
                  opcoes={[{ value: '', label: 'Enquanto estiver dentro' }, { value: '1', label: 'Até 1 dia depois' }, { value: '3', label: 'Até 3 dias' }, { value: '7', label: 'Até 7 dias' }, { value: '30', label: 'Até 30 dias' }]} />
                {g.windowDays ? <p className="mt-1.5 text-[12px] leading-snug text-surface-500">Contado a partir da última mensagem da jornada, mesmo que a pessoa já tenha saído. Fora disso, é coincidência e não conta.</p> : null}
              </div>
            </div>
          ))}
          {!dis && <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => mudar({ ...metas, goals: [...metas.goals, { id: `g_${Math.random().toString(36).slice(2, 7)}`, label: catalogo.events.find((ev) => ev.key === 'appointment_confirmed')?.label ?? 'Agendamento confirmado', event: 'appointment_confirmed', sameSubject: true }] })}>Adicionar meta</Button>}
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">Saídas automáticas</h3>
            <p className="mt-1 text-[12px] text-surface-400">Quando acontecer, a pessoa sai sem receber mais nada.</p>
          </div>
          {metas.exitIf.map((x, i) => (
            <div key={x.id} className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Select size="sm" className="w-full" value={x.event} disabled={dis} onChange={(e) => {
                  const ev = eventos.find((v) => v.key === e.target.value)
                  mudar({ ...metas, exitIf: metas.exitIf.map((y, j) => (j === i ? { ...y, event: e.target.value, label: ev?.label ?? y.label } : y)) })
                }} aria-label="Evento de saída">
                  {eventos.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
                </Select>
              </div>
              {!dis && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar saída" onClick={() => mudar({ ...metas, exitIf: metas.exitIf.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
          ))}
          {!dis && <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => mudar({ ...metas, exitIf: [...metas.exitIf, { id: `x_${Math.random().toString(36).slice(2, 7)}`, label: 'Humano assumiu a conversa', event: 'conversation.human_took_over' }] })}>Adicionar saída</Button>}
        </section>


        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">Prazo máximo</h3>
          <label className="block max-w-[300px]">
            <Rotulo texto="Dias que uma pessoa pode ficar na jornada" ajuda={`De 1 a ${LIMITES_DO_MOTOR.maxTtlDays} dias. Passou disso, ela sai com o motivo "prazo".`} />
            <Input size="sm" type="number" min={1} max={LIMITES_DO_MOTOR.maxTtlDays} className="w-28" value={metas.ttlDays} disabled={dis} onChange={(e) => mudar({ ...metas, ttlDays: Number(e.target.value) })} />
          </label>
        </section>
        </>)}

        {aba === 'horarios' && <RegrasDeEnvioEditor regras={versao.rules} onChange={(r) => onMudarVersao({ ...versao, rules: r })} disabled={dis} />}


        {aba === 'alertas' && apoio && onJornadaMudou && <AvisosDeAlerta jornada={jornada} apoio={apoio} onJornadaMudou={onJornadaMudou} disabled={dis} />}

        {aba === 'ia' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 jt-texto-violeta" aria-hidden />
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">Teto de IA no mês</h3>
          </div>
          {usaIA ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <Rotulo texto="Créditos por mês, nesta jornada" />
                <Input size="sm" type="number" min={1} className="w-32" placeholder="Sem teto" value={metas.aiMonthlyCap ?? ''} disabled={dis} onChange={(e) => mudar({ ...metas, aiMonthlyCap: e.target.value === '' ? null : Number(e.target.value) })} />
              </label>
              <p className="flex-1 min-w-[220px] text-[12px] leading-relaxed text-surface-400">Bateu o teto, os passos de IA seguem pelo caminho de reserva ("incerto" ou "não concluiu") e a jornada não para. Vazio: vale só o limite do plano.</p>
            </div>
          ) : (
            <p className="text-[12px] text-surface-400">Esta jornada não usa IA. O teto aparece quando houver um passo de IA.</p>
          )}
        </section>
        )}
      </div>
    </Modal>
  )
}

// ── horários e limites (P1 do benchmark, 16/11) ──────────────────────────────

const DIAS_DA_SEMANA = [
  { value: 1, label: 'seg' }, { value: 2, label: 'ter' }, { value: 3, label: 'qua' }, { value: 4, label: 'qui' },
  { value: 5, label: 'sex' }, { value: 6, label: 'sáb' }, { value: 0, label: 'dom' },
]
const JANELA_PADRAO: NonNullable<RegrasDeEnvio['window']> = { days: [1, 2, 3, 4, 5, 6], from: '08:00', to: '20:00', blockedDates: [], outside: 'wait' }
const LIMITE_PADRAO: NonNullable<RegrasDeEnvio['frequencyCap']> = { maxMessages: 3, perDays: 7 }

/**
 * Horário de envio e limite de mensagens por pessoa (HubSpot "Timing", Braze
 * "Quiet hours", Klaviyo "Smart sending"). Valem para os passos que mandam
 * mensagem; o resto da jornada segue normalmente.
 */
function RegrasDeEnvioEditor({ regras, onChange, disabled }: { regras?: RegrasDeEnvio; onChange: (r: RegrasDeEnvio) => void; disabled?: boolean }) {
  const [novaData, setNovaData] = useState('')
  const janela = regras?.window ?? null
  const limite = regras?.frequencyCap ?? null
  const mudarJanela = (j: RegrasDeEnvio['window']) => onChange({ ...regras, window: j })
  const mudarLimite = (l: RegrasDeEnvio['frequencyCap']) => onChange({ ...regras, frequencyCap: l })
  const dataBr = (iso: string) => { const [a, m, d] = iso.split('-'); return d && m ? `${d}/${m}/${a}` : iso }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">Horários e limites de envio</h3>
        <p className="mt-1 text-[12px] text-surface-400">Valem para os passos que mandam mensagem. O resto da jornada segue normalmente.</p>
      </div>

      <div className="rounded-[10px] border border-surface-700 bg-surface-800 p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-surface-100">Só enviar em horário definido</p>
            <p className="mt-0.5 text-[12px] leading-snug text-surface-400">Fora do horário, a mensagem espera a próxima abertura ou é pulada.</p>
          </div>
          <Switch checked={!!janela} disabled={disabled} onChange={(v) => mudarJanela(v ? JANELA_PADRAO : null)} aria-label="Só enviar em horário definido" />
        </div>
        {janela && (
          <div className="jornadas-aparecer space-y-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
              {DIAS_DA_SEMANA.map((d) => {
                const ligado = janela.days.includes(d.value)
                return (
                  <button key={d.value} type="button" aria-pressed={ligado} disabled={disabled}
                    onClick={() => mudarJanela({ ...janela, days: ligado ? janela.days.filter((x) => x !== d.value) : [...janela.days, d.value] })}
                    className={cn('h-8 min-w-11 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors cursor-pointer disabled:cursor-default', ligado ? 'jt-verde' : 'bg-surface-700 text-surface-400 hover:text-surface-200')}>
                    {d.label}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block"><Rotulo texto="Das" /><Input size="sm" type="time" className="w-28" value={janela.from} disabled={disabled} onChange={(e) => mudarJanela({ ...janela, from: e.target.value })} /></label>
              <label className="block"><Rotulo texto="Até" /><Input size="sm" type="time" className="w-28" value={janela.to} disabled={disabled} onChange={(e) => mudarJanela({ ...janela, to: e.target.value })} /></label>
            </div>
            <div>
              <Rotulo texto="Fora do horário" />
              <Pilulas ariaLabel="Fora do horário" cor="cinza" disabled={disabled} valor={janela.outside} onChange={(v) => mudarJanela({ ...janela, outside: v as 'wait' | 'skip' })}
                opcoes={[{ value: 'wait', label: 'Esperar a próxima abertura' }, { value: 'skip', label: 'Pular a mensagem' }]} />
            </div>
            <div>
              <Rotulo texto="Datas sem envio" ajuda="Feriados e dias em que o negócio não abre." />
              <div className="flex flex-wrap items-center gap-1.5">
                {janela.blockedDates.map((d) => (
                  <span key={d} className="inline-flex h-7 items-center gap-1 rounded-[7px] bg-surface-700 pl-2.5 pr-1 text-[12px] font-medium text-surface-200">
                    {dataBr(d)}
                    {!disabled && <button type="button" aria-label={`Tirar ${dataBr(d)}`} className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100 cursor-pointer" onClick={() => mudarJanela({ ...janela, blockedDates: janela.blockedDates.filter((x) => x !== d) })}><X className="h-3 w-3" /></button>}
                  </span>
                ))}
                {!disabled && (
                  <span className="inline-flex items-center gap-1.5">
                    <Input size="sm" type="date" className="w-40" value={novaData} aria-label="Nova data sem envio" onChange={(e) => setNovaData(e.target.value)} />
                    <Button variant="secondary" size="sm" disabled={!novaData || janela.blockedDates.includes(novaData)} onClick={() => { mudarJanela({ ...janela, blockedDates: [...janela.blockedDates, novaData].sort() }); setNovaData('') }}>Adicionar</Button>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[10px] border border-surface-700 bg-surface-800 p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-surface-100">Limitar mensagens por pessoa</p>
            <p className="mt-0.5 text-[12px] leading-snug text-surface-400">Passou do limite, a mensagem é pulada e fica no registro da pessoa.</p>
          </div>
          <Switch checked={!!limite} disabled={disabled} onChange={(v) => mudarLimite(v ? LIMITE_PADRAO : null)} aria-label="Limitar mensagens por pessoa" />
        </div>
        {limite && (
          <div className="jornadas-aparecer flex flex-wrap items-center gap-2 text-[14px] text-surface-200">
            <span>No máximo</span>
            <Input size="sm" type="number" min={1} className="w-20" aria-label="Máximo de mensagens" value={limite.maxMessages} disabled={disabled} onChange={(e) => mudarLimite({ ...limite, maxMessages: Math.max(1, Number(e.target.value) || 1) })} />
            <span>mensagens a cada</span>
            <Pilulas ariaLabel="Período do limite" cor="cinza" disabled={disabled} valor={String(limite.perDays)} onChange={(v) => mudarLimite({ ...limite, perDays: Number(v) })}
              opcoes={[{ value: '1', label: '1 dia' }, { value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }]} />
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Quem é avisado quando abre um alerta (P1, 16/11): inscrição presa, sistema do
 * cliente fora, erros acima do normal. Vale para a jornada, não para a versão.
 */
function AvisosDeAlerta({ jornada, apoio, onJornadaMudou, disabled }: { jornada: Jornada; apoio: ApoioDoEditor; onJornadaMudou: (j: Jornada) => void; disabled?: boolean }) {
  const cfg = jornada.alertRecipients ?? { userIds: [], channels: ['email'] as ('email' | 'whatsapp')[] }
  const salvar = async (novo: typeof cfg) => onJornadaMudou(await jornadasApi.configurarAlertas(jornada.id, novo.userIds.length ? novo : null))
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-surface-500">Avisos de alerta</h3>
        <p className="mt-1 text-[12px] text-surface-400">Quem fica sabendo, fora do app, quando a jornada tem inscrição presa, sistema do cliente fora ou erros acima do normal.</p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quem é avisado">
        {apoio.users.map((u) => {
          const ligado = cfg.userIds.includes(u.id)
          return (
            <button key={u.id} type="button" aria-pressed={ligado} disabled={disabled}
              onClick={() => void salvar({ ...cfg, userIds: ligado ? cfg.userIds.filter((x) => x !== u.id) : [...cfg.userIds, u.id] })}
              className={cn('h-8 rounded-full px-3 text-[12px] font-medium transition-colors cursor-pointer disabled:cursor-default', ligado ? 'jt-azul' : 'bg-surface-800 text-surface-300 hover:text-surface-100')}>
              {u.name}
            </button>
          )
        })}
      </div>
      {cfg.userIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[14px] text-surface-200">
          <span>Por</span>
          {(['email', 'whatsapp'] as const).map((c) => {
            const ligado = cfg.channels.includes(c)
            return (
              <button key={c} type="button" aria-pressed={ligado} disabled={disabled || (ligado && cfg.channels.length === 1)}
                onClick={() => void salvar({ ...cfg, channels: ligado ? cfg.channels.filter((x) => x !== c) : [...cfg.channels, c] })}
                className={cn('h-8 rounded-[8px] px-3 text-[12px] font-semibold transition-colors cursor-pointer disabled:cursor-default', ligado ? 'jt-verde' : 'bg-surface-800 text-surface-400 hover:text-surface-100')}>
                {c === 'email' ? 'E-mail' : 'WhatsApp'}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
