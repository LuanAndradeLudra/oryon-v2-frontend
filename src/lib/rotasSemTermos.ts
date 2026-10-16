/**
 * Onde o pedido de re-aceite de termos (GlobalTermsPrompt, SCRUM-777) NÃO
 * aparece: telas de entrada (que têm o próprio aceite ou nem têm sessão) e as
 * páginas públicas. Integração 1200 (16/10): logado, o modal cobria a landing,
 * as páginas de venda e o popup do Canva — que não são a plataforma.
 */
const PREFIXOS = [
  '/login', '/activate', '/first-access', '/register', '/forgot-password', '/reset-password', '/set-password',
  '/plataforma/', '/solucoes', '/perguntas', '/demonstracao', '/canva/callback',
]

export function rotaSemPedidoDeTermos(pathname: string): boolean {
  // "/" é a landing: comparação exata (todo caminho começa com "/").
  return pathname === '/' || PREFIXOS.some((p) => pathname.startsWith(p))
}
