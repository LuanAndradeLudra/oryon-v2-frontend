// ─── Primeiro acesso e dados fiscais (SCRUM-1212) ─────────────────────────────

import { api } from './api'

export interface FirstAccessStatus {
  required: boolean
  isOwner: boolean
  steps: {
    terms: {
      done: boolean
      pending: Array<{ id: string; document: string; version: string; contentUrl: string | null }>
      /** Documento obrigatório sem versão publicada: o primeiro acesso não conclui. */
      unpublished?: string[]
    }
    /** `done` = completo e conferido pelo dono (A20); `complete` = já preenchido (ex.: pelo operador). */
    company: { done: boolean; complete?: boolean; confirmedAt?: string | null }
  }
}

export interface FiscalData {
  documentType: 'cpf' | 'cnpj' | null
  taxId: string | null
  legalName: string | null
  stateRegistration: string | null
  municipalRegistration: string | null
  billingEmail: string | null
  billingContact: string | null
  billingPhone: string | null
  addressZip: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressDistrict: string | null
  addressCity: string | null
  addressState: string | null
  addressIbgeCode: string | null
}

export const EMPTY_FISCAL: FiscalData = {
  documentType: 'cnpj', taxId: null, legalName: null, stateRegistration: null, municipalRegistration: null,
  billingEmail: null, billingContact: null, billingPhone: null, addressZip: null, addressStreet: null,
  addressNumber: null, addressComplement: null, addressDistrict: null, addressCity: null, addressState: null,
  addressIbgeCode: null,
}

/** Opcionais que o cliente pode APAGAR: vazio vai como `null` (o backend limpa). */
const CLEARABLE_FISCAL: ReadonlyArray<keyof FiscalData> = [
  'stateRegistration', 'municipalRegistration', 'billingContact', 'billingPhone', 'addressComplement', 'addressIbgeCode',
]

const FISCAL_KEYS = Object.keys(EMPTY_FISCAL) as Array<keyof FiscalData>

/**
 * CL1 — só os campos do formulário. O GET devolve também `complete` e
 * `confirmedAt` (A20); se forem guardados no estado e reenviados no PUT, o
 * backend recusa campo desconhecido e o dono nunca mais salva.
 */
export function pickFiscal(r: Partial<FiscalData>): FiscalData {
  const f = { ...EMPTY_FISCAL }
  for (const k of FISCAL_KEYS) {
    const v = r[k]
    if (v !== undefined) (f as Record<keyof FiscalData, unknown>)[k] = v
  }
  return { ...f, documentType: f.documentType ?? 'cnpj' }
}

/**
 * Corpo do PUT /organizations/current/fiscal. Obrigatório vazio não vai
 * (ausente = "não mudar"; a validação da tela já barra); opcional esvaziado
 * vai como `null`, senão o valor antigo ficava gravado para sempre.
 * CL1 — itera só as chaves do formulário: nada de `complete`/`confirmedAt`.
 */
export function fiscalBody(data: FiscalData): Partial<Record<keyof FiscalData, string | null>> {
  const body: Partial<Record<keyof FiscalData, string | null>> = {}
  for (const k of FISCAL_KEYS) {
    const v = data[k]
    const empty = v == null || (typeof v === 'string' && v.trim() === '')
    if (!empty) body[k] = v
    else if (CLEARABLE_FISCAL.includes(k)) body[k] = null
  }
  return body
}

export const firstAccessApi = {
  async status(): Promise<FirstAccessStatus> {
    return (await api.get<FirstAccessStatus>('/first-access/status')).data
  },
  async complete(): Promise<{ status: string }> {
    return (await api.post('/first-access/complete')).data
  },
  async resendLink(token: string): Promise<{ message: string }> {
    return (await api.post('/first-access/resend-link', { token })).data
  },
  /** A20 — o dono confirma os dados como estão ("Está correto"). */
  async confirmFiscal(): Promise<FiscalData & { complete: boolean; confirmedAt?: string | null }> {
    return (await api.post('/organizations/current/fiscal/confirm')).data
  },
  async getFiscal(): Promise<FiscalData & { complete: boolean; confirmedAt?: string | null }> {
    return (await api.get('/organizations/current/fiscal')).data
  },
  async saveFiscal(data: FiscalData): Promise<FiscalData & { complete: boolean; confirmedAt?: string | null }> {
    return (await api.put('/organizations/current/fiscal', fiscalBody(data))).data
  },
}
