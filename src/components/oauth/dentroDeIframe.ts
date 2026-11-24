/**
 * A tela está dentro de outra página (iframe)? O cabeçalho da Vercel já nega
 * (`frame-ancestors 'none'` em /oauth/*); isto é a segunda trava contra clickjacking.
 */
export function dentroDeIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}
