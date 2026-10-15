import type { OrigemDaMensagem } from './origemDaMensagem'
/**
 * SUPORTE INTEGRADO — o vocabulário do chamado (épico SCRUM-1376; desenho v3
 * em docs/confiabilidade-suporte/DESENHO-SUPORTE-INTEGRADO-V3-2026-10-14.md).
 *
 * Três eixos neutros (servem a qualquer segmento):
 *  • ORIGEM do problema — quem gerou: IA, automação, regra, equipe, contato,
 *    a conversa como um todo (algo que NÃO aconteceu) ou a plataforma;
 *  • CATEGORIA — o que falhou (taxonomia comum de triagem e relatórios);
 *  • FATOS — o que quem reporta viu acontecer. Nunca a gravidade: a
 *    prioridade é da Oryon (regra v3 no backend + triagem) e não aparece aqui.
 */

/** Origem do problema = origem da mensagem + "conversa" + "plataforma". */
export type OrigemDoProblema = OrigemDaMensagem | 'conversa' | 'plataforma'
export type Categoria = 'wrong_info' | 'wrong_action' | 'no_response' | 'delivery' | 'platform' | 'question' | 'request'
export type Alcance = 'esta_conversa' | 'outras_conversas' | 'parando_agora'
export type DesdeQuando = 'hoje' | 'ontem' | 'dias' | 'nao_sei'
export type StatusChamado =
  | 'received' | 'triaged' | 'investigating' | 'awaiting_client' | 'mitigated'
  | 'fix_planned' | 'residual_risk' | 'not_reproduced' | 'resolved' | 'closed'

/**
 * CHAMADO SEM CONVERSA (plataforma): o TIPO do pedido é a 1ª pergunta e decide
 * o destino — defeito e lentidão vão para a fila técnica; dúvida, para o
 * atendimento; sugestão, para produto (fora do SLA); cobrança, para o financeiro.
 */
export type TipoDePedido = 'defeito' | 'lentidao' | 'duvida' | 'sugestao' | 'cobranca'
export const TIPOS_DE_PEDIDO: Record<TipoDePedido, { nome: string; categoria: Categoria; destino: string }> = {
  defeito: { nome: 'Algo não funciona', categoria: 'platform', destino: 'Fila técnica' },
  lentidao: { nome: 'Está lento', categoria: 'platform', destino: 'Fila técnica' },
  duvida: { nome: 'Dúvida de uso', categoria: 'question', destino: 'Atendimento' },
  sugestao: { nome: 'Sugestão', categoria: 'request', destino: 'Produto (fora do prazo de resposta)' },
  cobranca: { nome: 'Plano ou cobrança', categoria: 'question', destino: 'Financeiro' },
}
/**
 * FATOS DO IMPACTO — quem reporta descreve O QUE ACONTECEU, nunca a gravidade:
 * escalas de "quanto atrapalha" inflam (quem tem pressa marca o máximo). Fato
 * específico é mais difícil de exagerar e a triagem confere.
 */
export type Contornou = 'sim' | 'nao' | 'nao_tentei'
export const CONTORNOU: Record<Contornou, string> = { sim: 'Sim, contornei', nao: 'Não consegui', nao_tentei: 'Não tentei' }
export type QuemMais = 'so_eu' | 'outras_pessoas' | 'nao_sei'
export const QUEM_MAIS: Record<QuemMais, string> = { so_eu: 'Só comigo', outras_pessoas: 'Com outras pessoas', nao_sei: 'Não sei' }
export type ImpedeAgora = 'responder' | 'agendar' | 'campanhas' | 'relatorios' | 'configurar' | 'nada_urgente'
export const IMPEDE_AGORA: Record<ImpedeAgora, string> = {
  responder: 'Responder contatos', agendar: 'Agendar', campanhas: 'Enviar campanhas', relatorios: 'Ver relatórios', configurar: 'Configurar', nada_urgente: 'Nada urgente',
}
export type ContatoViu = 'info_errada' | 'sem_resposta' | 'nao_viu' | 'nao_sei'
export const CONTATO_VIU: Record<ContatoViu, string> = { info_errada: 'Recebeu a informação errada', sem_resposta: 'Ficou sem resposta', nao_viu: 'Não chegou a ver', nao_sei: 'Não sei' }
export type JaCorrigiram = 'sim' | 'ainda_nao' | 'nao_precisa'
export const JA_CORRIGIRAM: Record<JaCorrigiram, string> = { sim: 'Sim', ainda_nao: 'Ainda não', nao_precisa: 'Não precisa' }
export interface FatosDoImpacto {
  /** Sem conversa (defeito e lentidão). */
  contornou?: Contornou | null
  quemMais?: QuemMais | null
  impede?: ImpedeAgora[]
  /** Com conversa. */
  contatoViu?: ContatoViu | null
  jaCorrigiram?: JaCorrigiram | null
}
/** Por onde o chamado entrou no app. */
export type EntradaDoChamado = 'conversa' | 'pagina_suporte' | 'menu_do_usuario'
/** Capturado no navegador ao abrir o formulário sem conversa (ver contextoTecnico.ts). */
export interface ContextoTecnico {
  tela: string
  endereco: string
  navegador: string
  sistema: string
  versaoDoApp: string
  resolucao: string
  janela: string
  idioma: string
  fusoHorario: string
  capturadoEm: string
}

export const ORIGENS_DO_PROBLEMA: Record<OrigemDoProblema, string> = {
  ia: 'Resposta da IA',
  automacao: 'Automação',
  regra: 'Resposta automática',
  equipe: 'Mensagem da equipe',
  contato: 'Mensagem do contato',
  conversa: 'Conversa',
  plataforma: 'Plataforma',
}

export const CATEGORIAS: Record<Categoria, string> = {
  wrong_info: 'Informação errada',
  wrong_action: 'Ação errada ou não executada',
  no_response: 'Não respondeu ou atrasou',
  delivery: 'Entrega da mensagem',
  platform: 'Tela ou funcionamento',
  question: 'Dúvida',
  request: 'Sugestão',
}
export function tituloDaCategoria(c: Categoria): string {
  return CATEGORIAS[c] ?? c
}

export const ALCANCES: Record<Alcance, { conversa: string; plataforma: string }> = {
  esta_conversa: { conversa: 'Só nesta conversa', plataforma: 'Só comigo' },
  outras_conversas: { conversa: 'Em outras conversas também', plataforma: 'Com outras pessoas também' },
  parando_agora: { conversa: 'Está parando o atendimento agora', plataforma: 'Está parando o atendimento agora' },
}
export const DESDE_QUANDO: Record<DesdeQuando, string> = { hoje: 'Hoje', ontem: 'Ontem', dias: 'Há alguns dias', nao_sei: 'Não sei' }
/** Áreas do produto para "Onde aconteceu?" (chamado sem conversa). */
export const AREAS_DO_PRODUTO = ['Conversas', 'Contatos', 'Funis', 'Disparos', 'Automações', 'Agentes IA', 'Relatórios', 'Configurações', 'Outro']

/**
 * Título legível: origem (+ nome da automação/regra) + assunto ou categoria.
 * Ex.: "Automação · Lembrete de retorno · Enviou para quem não devia".
 * Sem conversa: "onde · tipo" ("Funis · Algo não funciona").
 */
export function tituloDoChamado(c: {
  origemDoProblema: OrigemDoProblema
  origemNome?: string | null
  assunto?: { titulo: string } | null
  categoria: Categoria
  tipoDePedido?: TipoDePedido | null
  ondeAconteceu?: string | null
}): string {
  if (c.origemDoProblema === 'plataforma' && c.tipoDePedido) return [c.ondeAconteceu ?? 'Plataforma', TIPOS_DE_PEDIDO[c.tipoDePedido].nome].join(' · ')
  return [ORIGENS_DO_PROBLEMA[c.origemDoProblema], c.origemNome, c.assunto?.titulo ?? tituloDaCategoria(c.categoria)].filter(Boolean).join(' · ')
}

/** A gestão da empresa vê a prioridade em palavras, só quando alta. */
export const PRIORIDADE_PARA_EMPRESA: Record<'P0' | 'P1', string> = { P0: 'Prioridade crítica', P1: 'Prioridade alta' }

export const STATUS: Record<StatusChamado, { nome: string; tom: 'neutral' | 'info' | 'amber' | 'accent' | 'success' }> = {
  received: { nome: 'Recebido', tom: 'neutral' },
  triaged: { nome: 'Em análise', tom: 'info' },
  investigating: { nome: 'Em análise', tom: 'info' },
  awaiting_client: { nome: 'Aguardando resposta', tom: 'amber' },
  mitigated: { nome: 'Contornado', tom: 'accent' },
  fix_planned: { nome: 'Correção planejada', tom: 'accent' },
  residual_risk: { nome: 'Limite conhecido', tom: 'neutral' },
  not_reproduced: { nome: 'Não reproduzido', tom: 'neutral' },
  resolved: { nome: 'Resolvido', tom: 'success' },
  closed: { nome: 'Encerrado', tom: 'success' },
}
/**
 * Encerrado é SÓ resolvido ou fechado — a mesma definição do backend
 * (`STATUS_ENCERRADOS`, revisão da 1378): "limite conhecido" e "não
 * reproduzido" continuam abertos, esperando a resposta da equipe.
 */
export const STATUS_ENCERRADOS: readonly StatusChamado[] = ['resolved', 'closed']
export function emAberto(c: { status: StatusChamado }): boolean {
  return !STATUS_ENCERRADOS.includes(c.status)
}

export function dataCurta(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * MODELO DO FORMULÁRIO (`GET /support/form-config`) — NEUTRO, igual para toda
 * empresa: assuntos, exemplos e a pergunta "como deveria ser" dependem da
 * ORIGEM do problema; cada assunto aponta para uma categoria comum. A
 * personalização é da empresa: campos próprios (texto ou lista).
 */
export interface AssuntoDoModelo { id: string; titulo: string; categoria: Categoria }
export interface CampoDaEmpresa { id: string; rotulo: string; tipo: 'texto' | 'lista'; opcoes?: string[]; placeholder?: string; obrigatorio: boolean }
export interface ModeloDoFormulario {
  assuntos: Partial<Record<OrigemDoProblema, AssuntoDoModelo[]>>
  exemplos: Partial<Record<OrigemDoProblema, string>>
  esperado: Partial<Record<OrigemDoProblema, { rotulo: string; exemplo: string }>>
  camposDaEmpresa: CampoDaEmpresa[]
}
