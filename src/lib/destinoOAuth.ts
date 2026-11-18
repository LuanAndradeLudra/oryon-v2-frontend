// Revisão do épico ORY-94 (18/11): a tela do OAuth (/oauth/authorize?pedido=…, /oauth/aprovar/:id)
// não pode se perder no caminho até o login. Quando a sessão do app venceu e o app manda para o
// /login com um redirecionamento "duro" (sem o state do router), o destino fica guardado aqui,
// só na aba (sessionStorage), e o login (ou a troca de senha obrigatória) volta para ele.
const CHAVE = 'oryon:destino-oauth'

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

/** Guarda o destino se a página atual é do OAuth. */
export function guardarDestinoOAuth(caminho = `${window.location.pathname}${window.location.search}`): void {
  if (!destinoOAuthSeguro(caminho)) return
  try {
    sessionStorage.setItem(CHAVE, caminho)
  } catch {
    // aba sem armazenamento: o pedido continua no aplicativo de fora
  }
}

/** Devolve o destino guardado (uma vez só) ou null. */
export function tomarDestinoOAuth(): string | null {
  try {
    const v = sessionStorage.getItem(CHAVE)
    sessionStorage.removeItem(CHAVE)
    return destinoOAuthSeguro(v) ? v : null
  } catch {
    return null
  }
}
