import type { CSSProperties } from 'react'
import {
  Clock, Database, GitBranch, Hand, MessageSquareText, PlugZap, SlidersHorizontal, Smartphone, Sparkles, Tags, UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { CampoDoPasso, GrupoDoPasso, PassoDoCatalogo } from '@/services/jornadas/tipos'

/**
 * ORY-60 — a linguagem visual do painel do passo.
 *
 * - Cada CATEGORIA de passo (mensagem, conversa, controle, CRM, sistema, IA) tem
 *   uma cor estável, a mesma no cartão do canvas e no painel.
 * - Cada campo do catálogo cai num TIPO DE CONFIGURAÇÃO (canal, mensagem, tempo,
 *   caminhos…). O painel agrupa os campos por tipo, numa seção com pergunta,
 *   ícone e cor próprios, e cada tipo tem o seu controle (Campos.tsx).
 *
 * Cores: pares SÓLIDOS por tema (fundo suave + texto da mesma família), em
 * `jornadas.css` (--jt-<tom>-fundo / --jt-<tom>-sobre). Nada de translucidez,
 * de mistura com a superfície nem de borda colorida (padrão do app).
 */

export type TomDaJornada = 'verde' | 'azul' | 'ambar' | 'rosa' | 'ardosia' | 'violeta' | 'teal' | 'cinza' | 'vermelho'

export const COR_DO_GRUPO: Record<GrupoDoPasso, TomDaJornada> = {
  mensagem: 'verde',
  conversa: 'azul',
  controle: 'ambar',
  crm: 'rosa',
  integracao: 'ardosia',
  ia: 'violeta',
}

/** Ícone, ficha ou selo no tom: fundo sólido suave e o texto da mesma família. */
export function tomDaCor(tom: TomDaJornada): CSSProperties {
  return { backgroundColor: `var(--jt-${tom}-fundo)`, color: `var(--jt-${tom}-sobre)` }
}

/** Só a cor de texto (ou de um ponto) do tom. */
export function corDoTom(tom: TomDaJornada): string {
  return `var(--jt-${tom}-sobre)`
}

/**
 * A cor de cada saída (ramo), pela posição. A mesma no rodapé do cartão e nos
 * cartões de caminho do painel. "Sem resposta", "Senão" e "Incerto" ficam neutros.
 */
const TONS_DOS_RAMOS: TomDaJornada[] = ['verde', 'azul', 'violeta', 'rosa', 'teal', 'ambar']
const SAIDAS_NEUTRAS = new Set(['sem_resposta', 'senao', 'incerto', 'prazo', 'nao_concluiu'])
export function corDaSaida(chave: string, posicao: number): string {
  if (SAIDAS_NEUTRAS.has(chave)) return corDoTom('cinza')
  // O ramo de falha e "não chegou" ficam vermelhos.
  if (chave === 'falhou' || chave === 'nao_chegou') return corDoTom('vermelho')
  return corDoTom(TONS_DOS_RAMOS[posicao % TONS_DOS_RAMOS.length])
}

export type TipoDeConfiguracao = 'canal' | 'mensagem' | 'tempo' | 'caminhos' | 'pessoas' | 'crm' | 'sistema' | 'ia' | 'posse' | 'detalhes' | 'ajustes'

export const TIPOS_DE_CONFIGURACAO: Record<TipoDeConfiguracao, { pergunta: string; icone: LucideIcon; cor: TomDaJornada }> = {
  canal: { pergunta: 'Por onde envia?', icone: Smartphone, cor: COR_DO_GRUPO.mensagem },
  mensagem: { pergunta: 'O que a pessoa recebe?', icone: MessageSquareText, cor: COR_DO_GRUPO.mensagem },
  tempo: { pergunta: 'Quanto tempo?', icone: Clock, cor: COR_DO_GRUPO.controle },
  caminhos: { pergunta: 'Para onde vai cada caminho?', icone: GitBranch, cor: COR_DO_GRUPO.conversa },
  pessoas: { pergunta: 'Quem da equipe?', icone: UsersRound, cor: COR_DO_GRUPO.conversa },
  crm: { pergunta: 'O que muda no cadastro?', icone: Tags, cor: COR_DO_GRUPO.crm },
  sistema: { pergunta: 'Com que sistema conversa?', icone: PlugZap, cor: COR_DO_GRUPO.integracao },
  ia: { pergunta: 'O que a IA faz?', icone: Sparkles, cor: COR_DO_GRUPO.ia },
  posse: { pergunta: 'E se alguém da equipe estiver na conversa?', icone: Hand, cor: COR_DO_GRUPO.conversa },
  detalhes: { pergunta: 'Detalhes', icone: Database, cor: COR_DO_GRUPO.integracao },
  ajustes: { pergunta: 'Ajustes', icone: SlidersHorizontal, cor: COR_DO_GRUPO.integracao },
}

/** A ordem das seções no painel: por onde → para quem → o quê → quando → e depois. */
export const ORDEM_DAS_SECOES: TipoDeConfiguracao[] = ['canal', 'pessoas', 'mensagem', 'crm', 'sistema', 'ia', 'tempo', 'caminhos', 'posse', 'detalhes', 'ajustes']

/** Ordem própria de alguns passos (a pergunta e o que serve como resposta ficam juntos). */
const ORDEM_POR_PASSO: Record<string, TipoDeConfiguracao[]> = {
  ask_question: ['mensagem', 'detalhes', 'crm', 'tempo', 'posse', 'ajustes'],
  // O aviso à equipe: para quem, o que fazer e o que diz (17/11).
  notify_team: ['pessoas', 'detalhes', 'mensagem', 'ajustes'],
}
export function ordemDasSecoes(tipoDoPasso: string): TipoDeConfiguracao[] {
  return ORDEM_POR_PASSO[tipoDoPasso] ?? ORDEM_DAS_SECOES
}

/** O tipo de configuração "natural" de cada categoria de passo. */
const TIPO_DO_GRUPO: Record<GrupoDoPasso, TipoDeConfiguracao> = {
  mensagem: 'mensagem', conversa: 'pessoas', controle: 'detalhes', crm: 'crm', integracao: 'sistema', ia: 'ia',
}

/** Em que seção cada campo do catálogo entra. */
export function tipoDaConfiguracao(campo: CampoDoPasso, passo: PassoDoCatalogo | undefined): TipoDeConfiguracao {
  const doGrupo = passo ? TIPO_DO_GRUPO[passo.group] : 'detalhes'
  // "Perguntar e guardar a resposta": o que serve como resposta fica numa seção só.
  if (passo?.type === 'ask_question' && ['answerType', 'options', 'retries', 'retryText'].includes(campo.key)) return 'detalhes'
  if (campo.type === 'message_step') return 'mensagem'
  // Segurar a conversa decide se o agente responde junto: fica ao lado do tempo de espera, não em "Ajustes" (P1, 17/11).
  if (campo.key === 'holdConversation') return 'tempo'
  // O critério de conclusão da missão vem do tipo: só muda quem sabe o que faz, em "Ajustes" (P1, 17/11).
  // As orientações em texto livre ficam junto da missão, com as sugestões por segmento (17/11).
  if (passo?.type === 'ai_mission' && campo.key === 'successEvent') return 'ajustes'
  if (passo?.type === 'notify_team' && campo.key === 'action') return 'detalhes'
  if (passo?.type === 'notify_team' && campo.key === 'include') return 'mensagem'
  // O valor do campo do cadastro aceita "+ Dado" (texto com dados), mas é do cadastro (17/11).
  if (passo?.type === 'set_field' && campo.key === 'value') return 'crm'
  switch (campo.type) {
    case 'whatsapp_number': return 'canal'
    case 'template': case 'template_variables': return 'mensagem'
    case 'duration': case 'time_of_day': return 'tempo'
    case 'events': case 'conditions': return 'caminhos'
    case 'department': case 'user': return 'pessoas'
    case 'tag': case 'stage': case 'custom_field': case 'deal_stage': return 'crm'
    case 'mission_options': case 'mission_restrictions': return 'ia'
    case 'date_variable': case 'offset_days': return 'tempo'
    case 'connector_operation': return 'sistema'
    case 'boolean': return 'ajustes'
    case 'longtext': return passo?.group === 'ia' ? 'ia' : 'mensagem'
    case 'list': return campo.key === 'categories' ? 'caminhos' : doGrupo
    case 'select':
      if (campo.key === 'ifHuman') return 'posse'
      if (campo.key === 'to') return 'pessoas'
      if (passo?.type === 'wait') return 'tempo'
      return doGrupo
    case 'number':
      if (passo?.type === 'wait') return 'tempo'
      return doGrupo
    default:
      return doGrupo
  }
}

/** A pergunta da seção, ajustada ao passo quando a genérica não serve. */
const PERGUNTA_POR_PASSO: Record<string, Partial<Record<TipoDeConfiguracao, string>>> = {
  send_text: { mensagem: 'O que a pessoa recebe?' },
  send_and_wait: { tempo: 'Quanto tempo esperar a resposta?' },
  ask_question: { mensagem: 'O que perguntar?', detalhes: 'Que resposta serve?', crm: 'Onde guardar a resposta?', tempo: 'Quanto tempo esperar?' },
  branch_message_status: { mensagem: 'De qual mensagem?', tempo: 'Quanto tempo esperar antes de decidir?' },
  notify_team: { pessoas: 'Quem da equipe recebe o aviso?', detalhes: 'O que a equipe deve fazer?', mensagem: 'O que o aviso diz?' },
  internal_note: { mensagem: 'O que fica anotado na conversa?' },
  hold_conversation: { tempo: 'Por quanto tempo a jornada segura a conversa?' },
  handoff_agent: { mensagem: 'O que o agente fica sabendo?' },
  handoff_human: { pessoas: 'Quem assume a conversa, e por quê?' },
  tag: { crm: 'Qual etiqueta, e o que fazer com ela?' },
  set_stage: { crm: 'Para qual etapa o contato vai?' },
  assign: { pessoas: 'Para quem vai a conversa?' },
  deal_action: { crm: 'O que fazer com o negócio?' },
  connector_call: { sistema: 'O que pedir ao sistema do cliente?' },
  webhook_out: { sistema: 'Para onde avisar, e com quais dados?' },
  wait: { tempo: 'Quanto tempo esperar?' },
  branch: { caminhos: 'Quais caminhos existem?' },
  goal: { detalhes: 'Como chamar esta meta?' },
  exit: { detalhes: 'Por que a pessoa sai aqui?' },
  ai_classify: { ia: 'O que a IA decide?', caminhos: 'Quais são as respostas possíveis?' },
  ai_extract: { ia: 'O que a IA procura na conversa?' },
  ai_summarize: { ia: 'Que resumo a IA faz?' },
  ai_mission: { ia: 'Qual é a missão do agente?', tempo: 'Até quando?' },
  set_field: { crm: 'Qual campo, e com que valor?' },
  wait_event: { tempo: 'Quanto tempo esperar pela resposta?', caminhos: 'Para onde vai cada resposta?', ajustes: 'Vale resposta a outra mensagem?' },
}

export function perguntaDaSecao(tipo: TipoDeConfiguracao, tipoDoPasso: string): string {
  return PERGUNTA_POR_PASSO[tipoDoPasso]?.[tipo] ?? TIPOS_DE_CONFIGURACAO[tipo].pergunta
}

/** O tom da categoria do passo para os ícones (a Entrada e as portas são teal). */
export function tomDoTipo(tipo: string, grupo?: GrupoDoPasso): TomDaJornada {
  if (tipo === 'entrada' || tipo.startsWith('porta_')) return 'teal'
  return grupo ? COR_DO_GRUPO[grupo] : 'cinza'
}

/** A porta da Entrada (tipo do backend) → o ícone dela na galeria (IconeDoPasso). */
export const TIPO_DA_PORTA: Record<string, string> = {
  schedule_list: 'porta_agenda', event: 'porta_evento', segment: 'porta_segmento', webhook: 'porta_webhook', manual: 'porta_manual',
}
