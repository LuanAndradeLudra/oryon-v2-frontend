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
}
