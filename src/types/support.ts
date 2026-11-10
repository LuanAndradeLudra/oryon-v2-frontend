/**
 * Suporte integrado (épico SCRUM-1376) — formas da API `/support/*`, espelho
 * do backend (`support/dominio/apresentacao.ts` e `support.service.ts`).
 *
 * A EMPRESA recebe uma lista explícita de campos: nada de motivos ou
 * prioridade da regra, responsável, causa, evidência ou nota interna. A
 * prioridade só aparece para a gestão (admin/business_admin), em palavras e
 * só quando alta (`P0`/`P1`); para os outros papéis vem `null`.
 */
import type {
  Alcance, Categoria, ContextoTecnico, DesdeQuando, EntradaDoChamado, FatosDoImpacto, OrigemDoProblema, StatusChamado, TipoDePedido,
} from '@/components/support/supportModel'
import type { OrigemDaMensagem } from '@/components/support/origemDaMensagem'
import type { CausaRaiz, Prioridade, Relogio } from '@/components/support/fila/modeloDaFila'

export type PrioridadeParaEmpresa = 'P0' | 'P1' | null
export type Avaliacao = 'resolveu' | 'nao_resolveu' | null

/** Item da lista (página Suporte, seção Chamados do painel do contato). */
export interface ResumoDoChamado {
  id: string
  numero: string
  origemDoProblema: OrigemDoProblema
  origemNome: string | null
  tipoDePedido: TipoDePedido | null
  categoria: Categoria
  assunto: { id: string; titulo: string } | null
  ondeAconteceu: string | null
  /** A 1ª linha do relato (revisão de UX de 27/10): distingue chamados com o mesmo título. */
  trecho?: string
  status: StatusChamado
  prioridade: PrioridadeParaEmpresa
  perguntaPendente: string | null
  avaliacao: Avaliacao
  conversationId: string | null
  contatoNome: string | null
  abertoPor: string
  abertoEm: string
  atualizadoEm: string
  /** Só na lista filtrada por conversa: as mensagens marcadas (bandeira no chat). */
  mensagensMarcadas?: string[]
}

/** De quem é a vez (página Suporte): da empresa (a Oryon perguntou ou pede confirmação), da Oryon ou encerrado. */
export type VezDoChamado = 'empresa' | 'oryon' | 'encerrados'
export type ResumoPorVez = Record<VezDoChamado, number>

export interface PaginaDeChamados {
  itens: ResumoDoChamado[]
  /** `null` = não há mais páginas. */
  proximoCursor: string | null
}

export interface MensagemDoChamado {
  /** Id da mensagem da conversa (ou da cópia, quando a mensagem já não existe). */
  id: string
  autor: OrigemDaMensagem
  autorNome: string | null
  texto: string
  enviadaEm: string
}

export interface EventoDoChamado {
  id: string
  tipo: string
  texto: string
  corpo: string | null
  autor: string
  autorTipo: string
  em: string
}

export interface AnexoDoChamado {
  id: string
  nome: string
  mime: string
  tamanho: number
  em: string
}

/** O chamado completo, como a empresa vê. */
export interface ChamadoDaEmpresa {
  id: string
  numero: string
  origem: string
  entrada: EntradaDoChamado | null
  origemDoProblema: OrigemDoProblema
  origemNome: string | null
  tipoDePedido: TipoDePedido | null
  categoria: Categoria
  assunto: { id: string; titulo: string } | null
  descricao: string
  complemento: string | null
  oQueSeriaCerto: string | null
  camposExtras: Array<{ rotulo: string; valor: string }>
  fatos: FatosDoImpacto | null
  conversasAfetadas: Array<{ id: string; contatoNome: string }>
  dadosDeTerceiros: boolean
  desdeQuando: DesdeQuando | null
  ondeAconteceu: string | null
  impacto: string | null
  alcance: Alcance | null
  status: StatusChamado
  prioridade: PrioridadeParaEmpresa
  /** Enquanto a Oryon não respondeu: o prazo da 1ª resposta (revisão de UX de 27/10). Só P0/P1 até o SLA real. */
  respostaPrevistaAte?: string | null
  /** A Oryon ainda não respondeu e a vez é dela (com ou sem previsão). */
  aguardandoPrimeiraResposta?: boolean
  /** A 1ª linha do relato (também no chamado, para o cartão recém-criado). */
  trecho?: string
  perguntaPendente: string | null
  resumoParaClinica: string | null
  dependeDaClinica: string | null
  avaliacao: Avaliacao
  contextoTecnico: ContextoTecnico | null
  conversationId: string | null
  contatoNome: string | null
  abertoPor: string
  abertoEm: string
  atualizadoEm: string
  mensagens: MensagemDoChamado[]
  anexos: AnexoDoChamado[]
  eventos: EventoDoChamado[]
}

/** Anexo enviado ANTES do chamado (provisório por 24 h): o id entra em `anexos` na criação. */
export interface AnexoEnviado {
  id: string
  nome: string
  mime: string
  tamanho: number
}

/** Corpo do `POST /support/tickets` (CriarChamadoDto no backend). */
export interface NovoChamado {
  origemDoProblema: OrigemDoProblema
  /** O backend recalcula a partir das mensagens marcadas. */
  origemNome?: string | null
  categoria: Categoria
  assuntoId?: string | null
  /** Informado por quem reporta ("aconteceu em outras conversas"); o impacto, o backend deriva dos fatos. */
  alcance?: Alcance
  desdeQuando?: DesdeQuando | null
  ondeAconteceu?: string | null
  dadosDeTerceiros: boolean
  conversationId?: string | null
  messageIds: string[]
  descricao: string
  oQueSeriaCerto?: string
  camposExtras?: Record<string, string>
  anexos?: string[]
  conversasAfetadas?: Array<{ id: string; contatoNome?: string }>
  tipoDePedido?: TipoDePedido | null
  fatos?: FatosDoImpacto | null
  complemento?: string | null
  contextoTecnico?: ContextoTecnico | null
  entrada?: EntradaDoChamado
  /** Quem reporta viu o aviso de repetido e disse que é OUTRO problema: não agrupa nem conta. */
  ehOutro?: boolean
  /** SCRUM-1393: o relato nasceu do rascunho da IA, sem mudar ('usado') ou editado ('editado'). */
  rascunhoDaIa?: 'usado' | 'editado' | null
}

/** SCRUM-1393 — o que vai para o rascunho do relato (o backend lê as mensagens marcadas, nunca o texto daqui). */
export interface PedidoDeRascunho {
  origemDoProblema: string
  categoria?: string
  conversationId?: string | null
  messageIds: string[]
  ondeAconteceu?: string | null
  textoAtual?: string | null
  contextoTecnico?: unknown
}

// ─── Fila da EQUIPE ORYON (`/admin/support/*`, SCRUM-1384) ──────────────────
// Espelho de `paraEquipe` e `resumoParaEquipe` (backend): a equipe vê tudo,
// com a marcação do que é interno.

/** O prazo ainda aberto que vence primeiro (a fila destaca quando está perto). */
export interface ProximoPrazo {
  relogio: Relogio
  ate: string
  vencido: boolean
  perto: boolean
}

/** Item da fila (todos os clientes). */
export interface ItemDaFila {
  id: string
  numero: string
  kind: 'sup' | 'oco'
  tenantId: string
  tenantNome: string
  visivelParaEmpresa: boolean
  origem: string
  entrada: EntradaDoChamado | null
  origemDoProblema: OrigemDoProblema
  origemNome: string | null
  tipoDePedido: TipoDePedido | null
  categoria: Categoria
  assunto: { id: string; titulo: string } | null
  ondeAconteceu: string | null
  descricao: string
  status: StatusChamado
  prioridade: Prioridade
  prioridadeManual: boolean
  responsavelId: string | null
  responsavel: string | null
  perguntaPendente: string | null
  avaliacao: Avaliacao
  contatoNome: string | null
  abertoPor: string
  abertoEm: string
  atualizadoEm: string
  alteradoEm: string
  primeiraRespostaEm: string | null
  proximoPrazo: ProximoPrazo | null
  version: number
}

export interface PaginaDaFila {
  itens: ItemDaFila[]
  proximoCursor: string | null
}

export interface ResumoDaFila {
  contadores: { urgentes: number; semResposta: number; comCliente: number; minha: number; semDono: number; todos: number }
  empresas: Array<{ id: string; nome: string; abertos: number }>
}

export type FilaDaEquipe = 'minha' | 'sem_dono' | 'todos'
export type AtalhoDaFila = 'urgentes' | 'sem_resposta' | 'com_cliente'
export type SituacaoDaFila = 'abertos' | 'encerrados' | 'todos'

export interface FiltrosDaFila {
  fila?: FilaDaEquipe
  situacao?: SituacaoDaFila
  atalho?: AtalhoDaFila
  empresa?: string
  origemDoProblema?: OrigemDoProblema
  soSinais?: boolean
  busca?: string
  cursor?: string
  limite?: number
}

/** Evento como a equipe vê: com a visibilidade e os detalhes (de/para, motivo). */
export interface EventoDaEquipe extends EventoDoChamado {
  visivelParaEmpresa: boolean
  dados: Record<string, unknown> | null
}

/** Prazos (…Ate) e quando cada relógio foi cumprido (…Em). */
export interface SlaDoChamado {
  primeiraRespostaAte: string | null
  triagemAte: string | null
  contornoAte: string | null
  solucaoAte: string | null
  pausadoDesde: string | null
  pausadoMinutos: number
  primeiraRespostaEm: string | null
  triagemEm: string | null
  contornoEm: string | null
  solucaoEm: string | null
  encerradoEm: string | null
}

/** O chamado completo, como a equipe Oryon vê. */
export interface ChamadoDaEquipe extends Omit<ChamadoDaEmpresa, 'prioridade' | 'eventos'> {
  kind: 'sup' | 'oco'
  tenantId: string
  tenantNome: string
  visivelParaEmpresa: boolean
  prioridade: Prioridade
  prioridadeDaRegra: Prioridade
  motivosDaPrioridade: string[]
  prioridadeManual: boolean
  regraVersao: string
  relatores: number
  sla: SlaDoChamado
  proximoPrazo: ProximoPrazo | null
  causaRaiz: CausaRaiz | null
  responsavelId: string | null
  responsavel: string | null
  problemaId: string | null
  jiraRef: string | null
  acessoAteEm: string | null
  alteradoEm: string
  version: number
  eventos: EventoDaEquipe[]
  /** SCRUM-1389 — chamado da empresa aberto a partir de uma ocorrência interna: a ocorrência. */
  ocorrencia?: { id: string; numero: string } | null
  /** SCRUM-1389 — na ocorrência interna: o chamado da empresa aberto a partir dela. */
  chamadoDaEmpresa?: { id: string; numero: string } | null
  /** SCRUM-1387 — o problema do chamado (vários chamados, o mesmo defeito). */
  problema?: ResumoDoProblema | null
  /** SCRUM-1392 — quanto o relato desta empresa se confirma na triagem (só a equipe). */
  calibracao?: ResumoDaCalibracao | null
  /** SCRUM-1393: o relato nasceu do rascunho da IA ('usado' sem mudança, 'editado' pela pessoa). */
  rascunhoDaIa?: 'usado' | 'editado' | null
  /** SCRUM-1393: o "Sugerir causa" só com a sugestão ligada (custa modelo). */
  assistente?: { causa: boolean }
}

/** SCRUM-1392 — dos chamados que a regra pôs em P2 pelos fatos e que a equipe triou, quantos ela confirmou. */
export interface ResumoDaCalibracao {
  triados: number
  confirmados: number
  /** Em %, ou null sem chamado triado. */
  taxa: number | null
  situacao: 'poucos_dados' | 'confirma' | 'inflado'
  janelaDias: number
  ajusteLigado: boolean
}

export interface ConfigDaCalibracao {
  ligado: boolean
  janelaDias: number
  minimo: number
  /** Abaixo desta taxa (0–1), o relato é inflado. */
  limiar: number
}

export type DistribuicaoDePrioridade = Record<Prioridade, number>

export interface VisaoDaCalibracao {
  config: ConfigDaCalibracao
  empresas: Array<ResumoDaCalibracao & {
    tenantId: string
    empresa: string
    rebaixados: number
    elevados: number
    /** Fatos "acontece com outras pessoas" com mais de 24 h. */
    aConfirmar: number
    /** ...em que ninguém mais relatou o mesmo problema. */
    naoConfirmados: number
  }>
  /** A distribuição da prioridade sugerida na janela, antes e depois do ajuste (como se estivesse ligado). */
  simulacao: { chamados: number; antes: DistribuicaoDePrioridade; depois: DistribuicaoDePrioridade; mudariam: number }
}

/** SCRUM-1391 — um indicador da qualidade: sempre numerador, denominador e período (o texto traz os dois). */
export interface IndicadorDaQualidade {
  chave: string
  titulo: string
  numerador: number | null
  denominador: number | null
  percentual: number | null
  texto: string
  nota: string | null
}

/** A qualidade de uma empresa num mês. Mês fechado com retrato: os mesmos números do e-mail. */
export interface QualidadeDaEmpresa {
  tenantId: string
  empresa: string
  periodo: string
  nomeDoPeriodo: string
  fechado: boolean
  retrato: { geradoEm: string; enviadoEm: string | null; destinatarios: number } | null
  indicadores: IndicadorDaQualidade[]
  /** Sem a amostra revisada (SCRUM-1365), a taxa de erro não aparece: só este aviso. */
  avisoDaTaxaDeErro: string
  periodos: string[]
}

/** A visão da equipe: todas as empresas com o suporte, no mês ou nos últimos 7 dias. */
export interface VisaoDaQualidade {
  periodo: string
  nomeDoPeriodo: string
  fechado: boolean
  empresas: Array<{ tenantId: string; empresa: string; retrato: boolean; indicadores: IndicadorDaQualidade[] }>
  avisoDaTaxaDeErro: string
  periodos: string[]
}

export interface PreviaDoEmailDaQualidade {
  assunto: string
  html: string
  retrato: boolean
}

/** SCRUM-1387 — status do problema. "Corrigido" exige o candidato a teste de regressão. */
export type StatusDoProblema = 'aberto' | 'investigando' | 'corrigido' | 'nao_corrigir'

/** O problema como a fila mostra (só a equipe). A contagem vem do banco: N chamados em M empresas. */
export interface ResumoDoProblema {
  id: string
  numero: string
  titulo: string
  status: StatusDoProblema
  nomeDoStatus: string
  causaRaiz: CausaRaiz | null
  jiraRef: string | null
  chamados: number
  empresas: number
  /** Tem o candidato a teste de regressão (libera o "corrigido"). */
  temFixture: boolean
  /** Na sugestão (SCRUM-1393): por que parece o mesmo erro — assinatura e/ou relato parecido, de qualquer empresa. */
  motivo?: string
  mesmaAssinatura?: boolean
  parecido?: { percentual: number; chamado: string; empresa: string } | null
}

/** O problema aberto: assinatura, o candidato a teste (sem o conteúdo) e os chamados. */
export interface ProblemaCompleto extends ResumoDoProblema {
  assinatura: string
  /** null com `temFixture`: o conteúdo foi apagado por pedido do titular (LGPD); o id do caso fica. */
  fixture: { id: string; deChamado: string; geradaEm: string } | null
  lista: Array<{ id: string; numero: string; status: StatusChamado; prioridade: Prioridade; origem: OrigemDoProblema; empresa: string; abertoEm: string }>
}

/** SCRUM-1388 — a conversa do número de suporte da Oryon, para converter em chamado da empresa do contato. */
export interface ContextoDaConversaDeSuporte {
  /** O nome como está no contato e só o final do telefone. */
  contato: { nome: string | null; telefone: string | null }
  /** As últimas mensagens, mascaradas (o que vai para o chamado é exatamente isto). `noChamado`: já copiada para o chamado aberto. */
  mensagens: Array<{ id: string; de: 'contato' | 'equipe'; texto: string; em: string; noChamado?: boolean }>
  /** Usuários de empresa com o mesmo telefone do contato: a sugestão de empresa e de quem abre. */
  sugestoes: Array<{ tenantId: string; empresa: string; userId: string; nome: string; papel: string }>
  /** Chamado ainda aberto desta conversa: converter de novo oferece juntar. */
  existente: ChamadoDaConversaDeSuporte | null
}

export interface ChamadoDaConversaDeSuporte {
  id: string
  numero: string
  status: StatusChamado
  tenantId: string
  empresa: string
}

export interface EmpresaParaChamado {
  id: string
  nome: string
  /** Sem o suporte ligado, a empresa não vê a página Suporte (a resposta ao contato vai sem link). */
  suporteLigado: boolean
}

export interface ConversaoParaChamado {
  messageIds: string[]
  tenantId?: string
  tipoDePedido?: TipoDePedido
  relato?: string
  abertoPorUserId?: string | null
  juntarA?: string | null
  abrirOutro?: boolean
}

export interface ResultadoDaConversao {
  chamado: { id: string; numero: string; empresa: string }
  juntado: boolean
  /** A resposta automática (número e link) saiu pela conversa? */
  respostaEnviada: boolean
}

/** Parecidos de qualquer empresa e problemas abertos com a mesma assinatura (SCRUM-1387). Só sugestão. */
export interface SugestoesDoChamado {
  problemas: ResumoDoProblema[]
  parecidos: ItemDaFila[]
}

export type StatusDaEvidencia = 'coletando' | 'pronta' | 'parcial' | 'indisponivel' | 'expirada' | 'removida'

/** Uma parte da evidência (coletor). `secoes` é o retrato gravado, mascarado. */
export interface EvidenciaDoChamado {
  id: string
  coletor: string
  chave: string
  status: StatusDaEvidencia
  refs: Record<string, unknown>
  secoes: Record<string, unknown> | null
  disponibilidade: Record<string, string> | null
  classificacao: string[]
  erro: string | null
  bytes: number
  coletadaEm: string | null
  expiraEm: string
}

export interface EvidenciasDoChamado {
  chamado: { id: string; numero: string; tenantId: string; status: StatusChamado }
  evidencias: EvidenciaDoChamado[]
  /** "Repetir o turno" custa IA: só aparece com a configuração ligada. */
  replayHabilitado?: boolean
}

/** A conversa do chamado, para quem tem o acesso de suporte vigente (SCRUM-1385). Texto mascarado. */
export interface ConversaDoChamado {
  conversationId: string
  contatoNome: string | null
  /** Até quando vale o acesso de quem está lendo. */
  ate: string
  mensagens: Array<MensagemDoChamado & { tipo: string; marcada: boolean }>
}
