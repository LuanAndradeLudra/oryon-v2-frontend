// ─── Histórico do catálogo em linguagem de gente (SCRUM-1211) ─────────────────
// O backend grava o plano/pacote INTEIRO antes e depois de cada alteração.
// Aqui comparamos os dois e listamos só o que mudou (nome, preço, créditos,
// excedente, ativo, cada limite e cada módulo; pacotes: valor e ativo).

import { ENTITLEMENT_LABELS, formatBRL, type EntitlementKeyId } from '@/services/adminBillingApi'
import { PLAN_MODULES, PLAN_MODULE_LABEL, isModuleOn } from '@/lib/billingModules'

type Snapshot = Record<string, unknown> | null | undefined

const ENTITLEMENT_KEYS = Object.keys(ENTITLEMENT_LABELS) as EntitlementKeyId[]

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
/** Limite/franquia: vazio = ilimitado. */
const qty = (v: unknown): string => {
  const n = num(v)
  return n == null ? 'ilimitado' : n.toLocaleString('pt-BR')
}
const money = (v: unknown): string => {
  const n = num(v)
  return n == null ? '—' : formatBRL(n)
}

function activeChange(before: Record<string, unknown>, after: Record<string, unknown>): string | null {
  const b = before.active !== false
  const a = after.active !== false
  if (b === a) return null
  return a ? 'reativado' : 'desativado'
}

function planChanges(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const out: string[] = []
  if ((before.displayName ?? '') !== (after.displayName ?? '')) {
    out.push(`nome "${String(before.displayName ?? '')}" → "${String(after.displayName ?? '')}"`)
  }
  if (num(before.priceMonthlyCents) !== num(after.priceMonthlyCents)) {
    out.push(`preço ${money(before.priceMonthlyCents)} → ${money(after.priceMonthlyCents)}`)
  }
  if (num(before.monthlyCredits) !== num(after.monthlyCredits)) {
    out.push(`créditos/mês ${qty(before.monthlyCredits)} → ${qty(after.monthlyCredits)}`)
  }
  const fb = asRecord(before.features)
  const fa = asRecord(after.features)
  if (num(fb.overagePriceCents) !== num(fa.overagePriceCents)) {
    out.push(`excedente ${money(fb.overagePriceCents)} → ${money(fa.overagePriceCents)} por crédito`)
  }
  const active = activeChange(before, after)
  if (active) out.push(active)

  const eb = asRecord(fb.entitlements)
  const ea = asRecord(fa.entitlements)
  for (const k of ENTITLEMENT_KEYS) {
    if (num(eb[k]) !== num(ea[k])) out.push(`${ENTITLEMENT_LABELS[k]} ${qty(eb[k])} → ${qty(ea[k])}`)
  }

  const mb = asRecord(fb.modules)
  const ma = asRecord(fa.modules)
  const moduleKeys = Array.from(new Set<string>([...PLAN_MODULES, ...Object.keys(mb), ...Object.keys(ma)]))
  for (const m of moduleKeys) {
    const b = isModuleOn(mb, m)
    const a = isModuleOn(ma, m)
    if (b !== a) {
      const label = PLAN_MODULE_LABEL[m as keyof typeof PLAN_MODULE_LABEL] ?? m
      out.push(`módulo ${label} ${a ? 'ligado' : 'desligado'}`)
    }
  }
  return out
}

function packChanges(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const out: string[] = []
  if (num(before.valueCents) !== num(after.valueCents)) {
    out.push(`valor ${money(before.valueCents)} → ${money(after.valueCents)}`)
  }
  const active = activeChange(before, after)
  if (active) out.push(active)
  return out
}

/** Lista legível do que mudou entre `before` e `after`. */
export function summarizeCatalogChange(entity: 'plan' | 'pack', before: Snapshot, after: Snapshot): string[] {
  const a = asRecord(after)
  if (!before) {
    return entity === 'plan'
      ? [`criado — ${money(a.priceMonthlyCents)}/mês`]
      : [`criado — ${money(a.valueCents)}`]
  }
  const b = asRecord(before)
  const changes = entity === 'plan' ? planChanges(b, a) : packChanges(b, a)
  return changes.length ? changes : ['salvo sem mudança de valores']
}
