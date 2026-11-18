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
