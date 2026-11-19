// Revisão do épico ORY-94: a tela do OAuth (/oauth/authorize?pedido=…, /oauth/aprovar/:id)
// não pode se perder no caminho até o login. Quando a sessão do app venceu e o app manda para o
// /login com um redirecionamento "duro" (sem o state do router), o destino fica guardado aqui,
// só na aba (sessionStorage), e o login (ou a troca de senha obrigatória) volta para ele.
//
// 2ª rodada: o destino tem DONO e PRAZO — vale só para a mesma pessoa da sessão que venceu e
// por 10 min (o pedido do OAuth vence em 5 min se ninguém o abriu, e em 10 min depois de aberto;
// passado o prazo, a tela diz que o pedido expirou). Sai no logout e em todo login.
const CHAVE = 'oryon:destino-oauth'
const CHAVE_DA_SESSAO = 'oryon:session'
export const PRAZO_DO_DESTINO_MS = 10 * 60_000

interface DestinoGuardado {
  caminho: string
  dono: string | null
  em: number
}

/** Só caminho relativo do próprio app, começado por /oauth/ (nunca //outro.site, /\, esquema…). */
export function destinoOAuthSeguro(caminho: unknown): caminho is string {
  return (
    typeof caminho === 'string' &&
    caminho.startsWith('/oauth/') &&
    !caminho.startsWith('//') &&
    !caminho.includes('\\') &&
    !/[\s]/.test(caminho) &&
    caminho.length <= 2048
  )
}

/** O id da pessoa da sessão guardada no navegador (ou null). */
function pessoaDaSessao(): string | null {
  try {
    const bruto = localStorage.getItem(CHAVE_DA_SESSAO)
    const id = bruto ? (JSON.parse(bruto) as { user?: { id?: unknown } }).user?.id : null
    return typeof id === 'string' ? id : null
  } catch {
    return null
  }
}

/** Guarda o destino se a página atual é do OAuth (chamar ANTES de apagar a sessão). */
export function guardarDestinoOAuth(caminho = `${window.location.pathname}${window.location.search}`): void {
  if (!destinoOAuthSeguro(caminho)) return
  try {
    const guardado: DestinoGuardado = { caminho, dono: pessoaDaSessao(), em: Date.now() }
    sessionStorage.setItem(CHAVE, JSON.stringify(guardado))
  } catch {
    // aba sem armazenamento: o pedido continua no aplicativo de fora
  }
}

/** Apaga o destino guardado (logout, login concluído por outro caminho). */
export function descartarDestinoOAuth(): void {
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    // nada a apagar
  }
}

/**
 * Devolve o destino guardado (uma vez só) ou null. Só volta se ainda estiver no prazo e se a
 * pessoa logada agora for a mesma de quando foi guardado (quando se sabe quem era).
 */
export function tomarDestinoOAuth(): string | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE)
    sessionStorage.removeItem(CHAVE)
    if (!bruto) return null
    const g = JSON.parse(bruto) as Partial<DestinoGuardado>
    if (!destinoOAuthSeguro(g.caminho)) return null
    if (typeof g.em !== 'number' || Date.now() - g.em > PRAZO_DO_DESTINO_MS) return null
    const agora = pessoaDaSessao()
    if (g.dono && agora && g.dono !== agora) return null
    return g.caminho
  } catch {
    return null
  }
}
