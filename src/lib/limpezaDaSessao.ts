/**
 * Caches de MÓDULO que pertencem à sessão (revisão 03/10, causa estrutural).
 *
 * O logout é SPA (sem recarregar a página). Cada store/cache em variável de
 * módulo sobrevivia à troca de conta — saldo, linhas com IA, linhas dos
 * agentes… — e cada um foi descoberto separadamente. Regra: todo cache de
 * módulo com dado do tenant/usuário se registra aqui com `aoSairDaSessao`, e o
 * AuthContext chama `limparSessao()` ao sair.
 */
const limpezas = new Set<() => void>()

export function aoSairDaSessao(limpar: () => void): void {
  limpezas.add(limpar)
}

export function limparSessao(): void {
  for (const limpar of limpezas) {
    try { limpar() } catch { /* uma limpeza com erro não impede as outras */ }
  }
}
