// ─── Limites do plano (SCRUM-1207) ────────────────────────────────────────────
// O backend responde 403 com `code: 'entitlement_exceeded'` (limite do contrato
// atingido) ou `code: 'account_suspended'` (conta suspensa por inadimplência),
// sempre com uma `message` pronta para o usuário ("Seu plano permite X números
// de WhatsApp..."). Telas de criação usam isto para não esconder essa mensagem
// atrás de um "erro ao criar" genérico.

export type PlanLimitCode = 'entitlement_exceeded' | 'account_suspended' | 'account_ended' | 'module_not_contracted'

const PLAN_LIMIT_CODES: readonly string[] = ['entitlement_exceeded', 'account_suspended', 'account_ended', 'module_not_contracted']

interface PlanLimitBody {
  code?: string
  message?: string | string[]
  error?: string
}

/** Mensagem do bloqueio por plano/suspensão, ou null se o erro é outro. */
export function planLimitMessage(err: unknown): string | null {
  const body = (err as { response?: { data?: PlanLimitBody } })?.response?.data
  if (!body || !body.code || !PLAN_LIMIT_CODES.includes(body.code)) return null
  const msg = Array.isArray(body.message) ? body.message[0] : body.message
  return msg || body.error || 'Limite do plano atingido. Fale com a equipe Oryon para ampliar.'
}

/** Aviso de franquia medida (ex.: campanhas no mês) que acompanha uma criação bem-sucedida. */
export function billingWarningOf(data: unknown): string | null {
  const w = (data as { billingWarning?: { message?: string } } | null)?.billingWarning
  return w?.message ?? null
}
