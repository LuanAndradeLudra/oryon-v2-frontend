// ─── CPF / CNPJ / CEP (SCRUM-1205 e SCRUM-1212) ───────────────────────────────
// Validação por dígito verificador (espelha backend common/utils/br-documents)
// e preenchimento automático a partir das bases públicas:
//   * CNPJ → BrasilAPI (dados da Receita, inclui o código IBGE do município)
//   * CEP  → ViaCEP (endereço + código IBGE, sem perguntar ao cliente)
// As consultas saem do navegador direto para as APIs públicas (CORS aberto);
// nada disso passa pelo backend da Oryon.

export type DocumentType = 'cpf' | 'cnpj'

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D+/g, '')
}

/** CPF: só dígitos. CNPJ: maiúsculas sem máscara — aceita o CNPJ alfanumérico (IN RFB 2.229/2024). */
export function normalizeTaxId(type: DocumentType, value: string | null | undefined): string {
  return type === 'cpf' ? onlyDigits(value).slice(0, 11) : (value ?? '').toUpperCase().replace(/[^0-9A-Z]+/g, '').slice(0, 14)
}

const allSame = (d: string) => /^(\d)\1+$/.test(d)

export function isValidCpf(value: string | null | undefined): boolean {
  const d = onlyDigits(value)
  if (d.length !== 11 || allSame(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

export function isValidCnpj(value: string | null | undefined): boolean {
  const d = normalizeTaxId('cnpj', value)
  if (!/^[0-9A-Z]{12}\d{2}$/.test(d) || allSame(d)) return false
  const val = (i: number) => d.charCodeAt(i) - 48
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += val(i) * w[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

export function isValidTaxId(type: DocumentType, value: string): boolean {
  return type === 'cpf' ? isValidCpf(value) : isValidCnpj(value)
}

export function formatTaxId(type: DocumentType, value: string): string {
  const d = normalizeTaxId(type, value)
  if (type === 'cpf') {
    return d.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  const A = '[0-9A-Z]'
  return d
    .slice(0, 14)
    .replace(new RegExp(`^(${A}{2})(${A})`), '$1.$2')
    .replace(new RegExp(`^(${A}{2})[.](${A}{3})(${A})`), '$1.$2.$3')
    .replace(new RegExp(`[.](${A}{3})(${A})`), '.$1/$2')
    .replace(new RegExp(`(${A}{4})(${A})`), '$1-$2')
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Endereço e dados da empresa preenchidos a partir das bases públicas. */
export interface CompanyLookup {
  legalName?: string
  tradeName?: string
  email?: string
  phone?: string
  addressZip?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
  addressIbgeCode?: string
}

const clean = (v: unknown): string | undefined => {
  if (typeof v !== 'string' && typeof v !== 'number') return undefined
  const s = String(v).trim()
  return s ? s : undefined
}

/** CNPJ → dados da Receita (BrasilAPI). Lança se o CNPJ não existe ou a API falhar. */
export async function lookupCnpj(cnpj: string, fetchImpl: typeof fetch = fetch): Promise<CompanyLookup> {
  const d = normalizeTaxId('cnpj', cnpj)
  if (!isValidCnpj(d)) throw new Error('CNPJ inválido')
  // A base pública (BrasilAPI) ainda só conhece CNPJ numérico.
  if (!/^\d{14}$/.test(d)) throw new Error('Consulta automática ainda não disponível para CNPJ alfanumérico — preencha à mão')
  const res = await fetchImpl(`https://brasilapi.com.br/api/cnpj/v1/${d}`)
  if (!res.ok) throw new Error(res.status === 404 ? 'CNPJ não encontrado na Receita' : 'Consulta de CNPJ indisponível agora')
  const j = (await res.json()) as Record<string, unknown>
  const ibge = clean(j.codigo_municipio_ibge)
  return {
    legalName: clean(j.razao_social),
    tradeName: clean(j.nome_fantasia),
    email: clean(j.email)?.toLowerCase(),
    phone: clean(j.ddd_telefone_1),
    addressZip: clean(j.cep) ? onlyDigits(String(j.cep)) : undefined,
    addressStreet: [clean(j.descricao_tipo_de_logradouro), clean(j.logradouro)].filter(Boolean).join(' ') || undefined,
    addressNumber: clean(j.numero),
    addressComplement: clean(j.complemento),
    addressDistrict: clean(j.bairro),
    addressCity: clean(j.municipio),
    addressState: clean(j.uf)?.toUpperCase(),
    addressIbgeCode: ibge && /^\d{7}$/.test(ibge) ? ibge : undefined,
  }
}

/** CEP → endereço + código IBGE (ViaCEP). Lança se o CEP não existe. */
export async function lookupCep(cep: string, fetchImpl: typeof fetch = fetch): Promise<CompanyLookup> {
  const d = onlyDigits(cep)
  if (d.length !== 8) throw new Error('CEP deve ter 8 dígitos')
  const res = await fetchImpl(`https://viacep.com.br/ws/${d}/json/`)
  if (!res.ok) throw new Error('Consulta de CEP indisponível agora')
  const j = (await res.json()) as Record<string, unknown>
  if (j.erro) throw new Error('CEP não encontrado')
  return {
    addressZip: d,
    addressStreet: clean(j.logradouro),
    addressDistrict: clean(j.bairro),
    addressCity: clean(j.localidade),
    addressState: clean(j.uf)?.toUpperCase(),
    addressIbgeCode: clean(j.ibge),
  }
}
