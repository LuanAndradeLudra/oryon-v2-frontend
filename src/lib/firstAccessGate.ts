// ─── Portão do primeiro acesso (SCRUM-1212) ───────────────────────────────────
// "Cliente não entra na plataforma sem concluir as etapas": enquanto o
// contrato estiver pendente, o dono é levado para /first-access. O status é
// buscado UMA vez por sessão (não a cada troca de rota) e invalidado quando o
// primeiro acesso é concluído.
// Falha ao consultar NÃO libera (senão uma queda de rede pulava os termos e
// os dados fiscais pela sessão inteira): a promessa rejeita, o portão mostra
// "Tentar de novo" e a falha não fica em cache.

import { firstAccessApi } from '@/services/firstAccessApi'

let cached: { userId: string; promise: Promise<boolean> } | null = null

/** true = precisa passar pelo primeiro acesso. Rejeita se o status não pôde ser consultado. */
export function firstAccessRequired(userId: string): Promise<boolean> {
  if (cached && cached.userId === userId) return cached.promise
  const promise = firstAccessApi.status().then((s) => s.required)
  cached = { userId, promise }
  promise.catch(() => { if (cached?.promise === promise) cached = null })
  return promise
}

export function invalidateFirstAccessStatus(): void {
  cached = null
}
