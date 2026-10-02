// ─── Regras puras do console de cobrança (SCRUM-1205/1209) ────────────────────
// Funções sem React usadas pelo ProvisionForm e pelas Faturas do operador, para
// poderem ser testadas com datas injetadas (2ª revisão do SCRUM-1200, itens AD).

import type { CompanyLookup } from './brDocuments'
import { localIsoDate } from './localDate'
import type {
  ContractTermId, PaymentMethodId, PaymentModeId, ProvisionCompany,
} from '@/services/adminBillingApi'

// ─── Dia civil de Brasília ────────────────────────────────────────────────────
// Mesma conta do backend (billing/invoicing/brt.ts): UTC-3 fixo, sem horário
// de verão. Régua, encargos e tela contam o atraso em dias civis.
const DAY_MS = 24 * 60 * 60 * 1000
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000

/** Número do dia civil em Brasília. */
export const brtDay = (d: Date): number => Math.floor((d.getTime() - BRT_OFFSET_MS) / DAY_MS)

/**
 * AD7 — "Vencida" só a partir do dia SEGUINTE ao vencimento (dia civil de
 * Brasília). O vencimento é gravado ao meio-dia de Brasília; comparar o
 * instante marcava a fatura como vencida já na tarde do próprio dia.
 */
export function isOverdueBrt(dueAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!dueAt) return false
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return false
  return brtDay(now) > brtDay(due)
}

/**
 * AD2 — `paidAt` da baixa manual. Hoje → omitido (o backend usa o instante
 * dele; mandar meio-dia de hoje antes do meio-dia era "data no futuro" e dava
 * 400; mandar o relógio do navegador arriscaria o mesmo por diferença de
 * relógio). Outro dia → meio-dia local daquele dia.
 */
export function paidAtForPayDate(payDate: string, now: Date = new Date()): string | undefined {
  if (!payDate || payDate === localIsoDate(now)) return undefined
  return new Date(`${payDate}T12:00:00`).toISOString()
}

// ─── Empresa (ProvisionCompanyDto) ────────────────────────────────────────────

/** Campos que o backend aceita em `company` (ProvisionCompanyDto). */
export const PROVISION_COMPANY_KEYS = [
  'documentType', 'taxId', 'legalName', 'stateRegistration', 'municipalRegistration',
  'billingEmail', 'billingContact', 'billingPhone',
  'addressZip', 'addressStreet', 'addressNumber', 'addressComplement', 'addressDistrict',
  'addressCity', 'addressState', 'addressIbgeCode',
] as const satisfies ReadonlyArray<keyof ProvisionCompany>

/**
 * AD1 — só os campos do DTO e sem vazios. O backend recusa campo desconhecido
 * (`forbidNonWhitelisted`): um `tradeName` perdido dava 400 em todo envio.
 */
export function pickProvisionCompany(c: Record<string, unknown> | null | undefined): ProvisionCompany {
  const out: Record<string, unknown> = {}
  if (!c) return out as ProvisionCompany
  for (const k of PROVISION_COMPANY_KEYS) {
    const v = c[k]
    if (v !== '' && v != null) out[k] = v
  }
  return out as ProvisionCompany
}

/**
 * AD1 — "Buscar CNPJ" mapeado campo a campo (como o FiscalDataForm):
 * `phone`→`billingPhone`, `email`→`billingEmail` (sem sobrescrever o que o
 * operador já digitou) e `tradeName` fica de fora (vira só sugestão de nome da
 * conta, na tela).
 */
export function companyFromCnpjLookup(prev: ProvisionCompany, r: CompanyLookup): ProvisionCompany {
  const newAddress = !!(r.addressZip || r.addressCity || r.addressState)
  return {
    ...prev,
    legalName: r.legalName ?? prev.legalName,
    billingEmail: prev.billingEmail || r.email || undefined,
    billingPhone: prev.billingPhone || r.phone || undefined,
    addressZip: r.addressZip ?? prev.addressZip,
    addressStreet: r.addressStreet ?? prev.addressStreet,
    addressNumber: r.addressNumber ?? prev.addressNumber,
    addressComplement: r.addressComplement ?? prev.addressComplement,
    addressDistrict: r.addressDistrict ?? prev.addressDistrict,
    addressCity: r.addressCity ?? prev.addressCity,
    addressState: r.addressState ?? prev.addressState,
    // Endereço novo sem IBGE não herda o código do endereço anterior.
    addressIbgeCode: r.addressIbgeCode ?? (newAddress ? undefined : prev.addressIbgeCode),
  }
}

// ─── Prazo, parcelas e excedente ──────────────────────────────────────────────

export const termMonthsOf = (term: ContractTermId): number =>
  term === 'annual' ? 12 : term === 'semiannual' ? 6 : 1

/**
 * AD5 — parcelas padrão: à vista = 1; parcelado e mensalidade = meses do prazo.
 * Na mensalidade as parcelas são SEMPRE os meses (uma fatura por mês): ficar
 * preso em 1 ao trocar o prazo cobrava o anual inteiro numa fatura só.
 */
export const defaultInstallments = (mode: PaymentModeId, termMonths: number): number =>
  mode === 'upfront' ? 1 : termMonths

/**
 * AD4 — padrão do backend (provision-terms.ts): excedente na fatura Pix
 * seguinte só com fatura todo mês (parcelas ≥ meses). No parcelado em 3× o
 * excedente esperaria até 4 meses (E8).
 */
export const defaultOnNextInvoice = (method: PaymentMethodId, installments: number, termMonths: number): boolean =>
  method === 'pix_invoice' && installments >= termMonths

// ─── Percentuais ──────────────────────────────────────────────────────────────

/**
 * AD9 — percentual com vírgula ou ponto decimal ("7,5" → 7.5). `null` = vazio;
 * `NaN` = texto que não é número. Antes o campo só aceitava dígitos e "7,5"
 * virava 75%.
 */
export function parsePercent(text: string): number | null {
  const t = text.trim()
  if (t === '') return null
  if (!/^-?\d+([.,]\d+)?$/.test(t)) return Number.NaN
  return Number(t.replace(',', '.'))
}

/** Número → texto pt-BR do campo de percentual ("7.5" → "7,5"). */
export const formatPercent = (n: number | null): string => (n == null ? '' : String(n).replace('.', ','))
