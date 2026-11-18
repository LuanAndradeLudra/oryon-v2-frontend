// ─── "Entrar com a Oryon" — consentimento OAuth (ORY-96, épico ORY-94) ─────────
// Backend: /oauth/pedidos/:id (sessão normal do app). O pedido nasce no
// `GET /api/oauth/authorize` do backend, que manda a pessoa para /oauth/authorize?pedido=<id>.
import api from './api'

export type NivelOAuth = 'leitura' | 'escrita'

export interface GrupoDeConsentimento {
  grupo: string
  ver: boolean
  alterar: boolean
}

export interface DetalheDoPedidoOAuth {
  pedido: string
  csrf: string
  cliente: { nome: string; dominio: string; logoUri: string | null }
  /** Host para onde a pessoa volta depois de decidir (ex.: claude.ai). */
  retornoPara: string
  workspace: { nome: string }
  pessoa: { nome: string }
  apiLiberada: boolean
  politica: { liberado: boolean; motivo: string | null; nivelMaximo: NivelOAuth }
  niveis: Record<NivelOAuth, { disponivel: boolean; grupos: GrupoDeConsentimento[] }>
  /** Revisão ORY-94: a senha é pedida em toda aprovação (o pedido é de uso único). */
  precisaSenha: boolean
}

export interface DecisaoOAuth {
  csrf: string
  aprovar: boolean
  nivel?: NivelOAuth
  senha?: string
}

export async function detalharPedidoOAuth(pedido: string): Promise<DetalheDoPedidoOAuth> {
  const { data } = await api.get<DetalheDoPedidoOAuth>(`/oauth/pedidos/${encodeURIComponent(pedido)}`)
  return data
}

/**
 * A decisão devolve o endereço de retorno ao aplicativo (com `code`/`error`, `state` e `iss`).
 * Senha necessária, errada ou trava de tentativas voltam 403 (a sessão do app está viva):
 * nada de renovar a sessão nem repetir o pedido com a senha.
 */
export async function decidirPedidoOAuth(pedido: string, decisao: DecisaoOAuth): Promise<{ redirecionarPara: string }> {
  const { data } = await api.post<{ redirecionarPara: string }>(`/oauth/pedidos/${encodeURIComponent(pedido)}/decisao`, decisao)
  return data
}

/** O código de erro do backend (`{ error: { code, message } }`), se houver. */
export function erroDoOAuth(err: unknown): { status: number | null; codigo: string | null; mensagem: string | null } {
  const r = (err as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } })?.response
  return { status: r?.status ?? null, codigo: r?.data?.error?.code ?? null, mensagem: r?.data?.error?.message ?? null }
}

/**
 * Revisão ORY-94: a mensagem do backend (`error.message`, em português) ou um texto nosso —
 * nunca o "Request failed with status code 422" do axios.
 */
export function mensagemDoOAuth(err: unknown, padrao: string): string {
  const { mensagem, status } = erroDoOAuth(err)
  if (mensagem) return mensagem
  if (status === null) return 'Sem conexão com a Oryon. Confira a internet e tente de novo.'
  return padrao
}

/**
 * O retorno ao aplicativo só sai para https (ou http em localhost, no desenvolvimento).
 * O backend já confere o endereço; isto é a segunda trava (nunca `javascript:` etc.).
 */
export function retornoSeguro(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:') return true
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

// ─── Aprovação de ações críticas (ORY-97) ──────────────────────────────────────
// Numa conexão de aplicativo externo, a ação crítica (enviar mensagem, convidar pessoa,
// mudar regras de agente…) só executa depois que a pessoa aprova aqui, no app.

export type SituacaoDaAprovacao = 'pendente' | 'aprovada' | 'recusada'

export interface DetalheDaAprovacao {
  id: string
  csrf: string
  cliente: string
  /** O resumo da ação, o mesmo que o aplicativo mostrou. */
  acao: string
  /** A ação inteira, em linhas `campo: valor` (dados de contato mascarados). */
  previa: string
  /** A prévia passou do tamanho que cabe aqui: dá para recusar, mas não para aprovar. */
  previaCortada: boolean
  status: SituacaoDaAprovacao
  criadoEm: string
  expiraEm: string
}

export async function detalharAprovacaoOAuth(id: string): Promise<DetalheDaAprovacao> {
  const { data } = await api.get<DetalheDaAprovacao>(`/oauth/aprovacoes/${encodeURIComponent(id)}`)
  return data
}

export async function decidirAprovacaoOAuth(id: string, decisao: { csrf: string; aprovar: boolean }): Promise<{ status: SituacaoDaAprovacao }> {
  const { data } = await api.post<{ status: SituacaoDaAprovacao }>(`/oauth/aprovacoes/${encodeURIComponent(id)}/decisao`, decisao)
  return data
}

// ─── Política do workspace e aplicativos conectados (ORY-98) ──────────────────

export interface ClienteOAuthDisponivel {
  clientId: string
  nome: string
  dominio: string
  logoUri: string | null
}

export interface PoliticaOAuth {
  ativo: boolean
  clientesPermitidos: string[]
  nivelMaximo: NivelOAuth
  /** `null` = todos os papéis. */
  papeisPermitidos: string[] | null
}

export interface ConexaoOAuth {
  id: string
  cliente: ClienteOAuthDisponivel
  /** Só na lista do workspace (admin). */
  pessoa?: { id: string; nome: string }
  /** O nível que vale AGORA (o concedido, limitado pelo papel e pela política). */
  nivel: NivelOAuth
  /** O administrador (ou o papel) limitou o que a pessoa tinha concedido. */
  limitado: boolean
  grupos: GrupoDeConsentimento[]
  conectadoEm: string
  ultimaAtividade: string | null
  venceEm: string
}

export interface PoliticaLida {
  politica: PoliticaOAuth
  /** Quando a política foi salva por último (`null` = nunca). Vai de volta no salvar. */
  versao: string | null
  clientesDisponiveis: ClienteOAuthDisponivel[]
  papeis: string[]
}

export async function lerPoliticaOAuth(): Promise<PoliticaLida> {
  const { data } = await api.get('/oauth/politica')
  return data
}

/** 409 `politica_mudou`: outra pessoa salvou depois da leitura (recarregar antes de salvar). */
export async function salvarPoliticaOAuth(
  politica: PoliticaOAuth & { versao: string | null },
): Promise<{ politica: PoliticaOAuth; versao: string | null; conexoesEncerradas: number }> {
  const { data } = await api.put('/oauth/politica', politica)
  return data
}

export async function minhasConexoesOAuth(): Promise<ConexaoOAuth[]> {
  const { data } = await api.get<{ conexoes: ConexaoOAuth[] }>('/oauth/conexoes')
  return data.conexoes
}

export async function conexoesDoWorkspaceOAuth(): Promise<ConexaoOAuth[]> {
  const { data } = await api.get<{ conexoes: ConexaoOAuth[] }>('/oauth/conexoes/workspace')
  return data.conexoes
}

export async function desconectarOAuth(id: string): Promise<void> {
  await api.delete(`/oauth/conexoes/${encodeURIComponent(id)}`)
}
