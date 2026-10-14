// ─── Dados fiscais da empresa (SCRUM-1212) ────────────────────────────────────
// Usado no primeiro acesso e em Configurações > Empresa (só o dono edita).
// Os mesmos dados vão para a nota fiscal e para o cadastro no gateway na
// próxima etapa — por isso CPF/CNPJ são validados aqui e o código IBGE vem
// do CEP, sem perguntar ao cliente. Mudou CEP, cidade ou UF, o código IBGE
// antigo é descartado (senão a nota sairia para o município errado) e o CEP
// novo é consultado de novo ao sair do campo.
//
// Layout (13/10, PO): grupos Identificação, Endereço e Cobrança numa grade de
// 12 colunas pela largura do contêiner (cabe no primeiro acesso e na coluna de
// Configurações); tipo de documento como seletor e opcionais marcados e por último.

import { useRef, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { showToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import {
  formatCep, formatTaxId, isValidTaxId, lookupCep, lookupCnpj, normalizeTaxId, onlyDigits, type DocumentType,
} from '@/lib/brDocuments'
import type { FiscalData } from '@/services/firstAccessApi'

export interface FiscalErrors { [k: string]: string | undefined }

/** Validação mínima (espelha o FiscalDataDto do backend). */
export function validateFiscal(d: FiscalData): FiscalErrors {
  const e: FiscalErrors = {}
  const type = (d.documentType ?? 'cnpj') as DocumentType
  if (!d.taxId || !isValidTaxId(type, d.taxId)) e.taxId = `${type.toUpperCase()} inválido`
  if (!d.legalName || d.legalName.trim().length < 2) e.legalName = 'Obrigatório'
  if (!d.billingEmail || !/^\S+@\S+\.\S+$/.test(d.billingEmail)) e.billingEmail = 'E-mail inválido'
  if (onlyDigits(d.addressZip).length !== 8) e.addressZip = 'CEP deve ter 8 dígitos'
  if (!d.addressStreet?.trim()) e.addressStreet = 'Obrigatório'
  if (!d.addressNumber?.trim()) e.addressNumber = 'Obrigatório'
  if (!d.addressDistrict?.trim()) e.addressDistrict = 'Obrigatório'
  if (!d.addressCity?.trim()) e.addressCity = 'Obrigatório'
  if (!/^[A-Za-z]{2}$/.test(d.addressState ?? '')) e.addressState = 'UF'
  return e
}

function Grupo({ titulo, descricao, primeiro, children }: { titulo: string; descricao?: string; primeiro?: boolean; children: ReactNode }) {
  return (
    <section className={cn('space-y-3.5', !primeiro && 'mt-5 pt-5 border-t border-surface-700')}>
      <div>
        <h3 className="text-[13px] font-semibold text-surface-100">{titulo}</h3>
        {descricao && <p className="text-xs text-surface-400 mt-0.5">{descricao}</p>}
      </div>
      {children}
    </section>
  )
}

export function FiscalDataForm({
  value, onChange, errors = {}, disabled = false,
}: {
  value: FiscalData
  onChange: (v: FiscalData) => void
  errors?: FiscalErrors
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  // CEP digitado desde a última consulta → o blur consulta o ViaCEP de novo.
  const cepDirty = useRef(false)
  const type = (value.documentType ?? 'cnpj') as DocumentType
  const set = (k: keyof FiscalData) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value })

  async function fromCnpj() {
    setBusy(true)
    try {
      const r = await lookupCnpj(value.taxId ?? '')
      onChange({
        ...value,
        legalName: r.legalName ?? value.legalName,
        billingEmail: value.billingEmail || r.email || null,
        billingPhone: value.billingPhone || r.phone || null,
        addressZip: r.addressZip ?? value.addressZip,
        addressStreet: r.addressStreet ?? value.addressStreet,
        addressNumber: r.addressNumber ?? value.addressNumber,
        addressComplement: r.addressComplement ?? value.addressComplement,
        addressDistrict: r.addressDistrict ?? value.addressDistrict,
        addressCity: r.addressCity ?? value.addressCity,
        addressState: r.addressState ?? value.addressState,
        // Endereço novo sem IBGE não herda o código do endereço anterior.
        addressIbgeCode: r.addressIbgeCode ?? (r.addressZip || r.addressCity || r.addressState ? null : value.addressIbgeCode),
      })
      showToast('Dados da Receita preenchidos. Confira e ajuste se precisar.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Consulta de CNPJ indisponível', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function fromCep() {
    cepDirty.current = false
    try {
      const r = await lookupCep(value.addressZip ?? '')
      onChange({
        ...value,
        addressZip: r.addressZip ?? value.addressZip,
        addressStreet: r.addressStreet || value.addressStreet,
        addressDistrict: r.addressDistrict || value.addressDistrict,
        addressCity: r.addressCity ?? value.addressCity,
        addressState: r.addressState ?? value.addressState,
        // O IBGE é do CEP consultado agora — nunca herda o do endereço anterior.
        addressIbgeCode: r.addressIbgeCode ?? null,
      })
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Consulta de CEP indisponível', 'error')
    }
  }

  const G = 'grid grid-cols-12 gap-x-4 gap-y-4'
  return (
    <div className="@container">
      <Grupo primeiro titulo="Identificação" descricao="Aparece nas faturas e na nota fiscal.">
        <div className={G}>
          <div className="col-span-12 @3xl:col-span-6">
            <FormField label="Documento" required error={errors.taxId}>
              <div className="flex gap-2">
                <div className="flex">
                  <SegmentedControl label="Tipo de documento" size="md" value={type}
                    onChange={(v) => { if (!disabled) onChange({ ...value, documentType: v, taxId: null }) }}
                    options={[{ value: 'cnpj', label: 'CNPJ' }, { value: 'cpf', label: 'CPF' }]} />
                </div>
                <Input
                  className="flex-1 min-w-0"
                  aria-label={type === 'cnpj' ? 'CNPJ' : 'CPF'}
                  value={formatTaxId(type, value.taxId ?? '')}
                  onChange={(e) => onChange({ ...value, taxId: normalizeTaxId(type, e.target.value) })}
                  inputMode={type === 'cpf' ? 'numeric' : 'text'}
                  disabled={disabled}
                />
                {type === 'cnpj' && (
                  <Button variant="secondary" onClick={fromCnpj} loading={busy} title="Buscar na Receita"
                    disabled={disabled || !value.taxId || !isValidTaxId('cnpj', value.taxId)} leftIcon={<Search className="w-4 h-4" />}>
                    Buscar
                  </Button>
                )}
              </div>
            </FormField>
          </div>
          <div className="col-span-12 @3xl:col-span-6">
            <FormField label={type === 'cnpj' ? 'Razão social' : 'Nome completo'} required error={errors.legalName}>
              <Input value={value.legalName ?? ''} onChange={set('legalName')} disabled={disabled} />
            </FormField>
          </div>
        </div>
      </Grupo>

      <Grupo titulo="Endereço" descricao="Endereço de cobrança. O CEP preenche rua, bairro e cidade.">
        <div className={G}>
          <div className="col-span-12 @xl:col-span-5 @3xl:col-span-4">
            <FormField label="CEP" required error={errors.addressZip}>
              <div className="flex gap-2">
                <Input
                  aria-label="CEP"
                  value={formatCep(value.addressZip ?? '')}
                  onChange={(e) => {
                    const zip = onlyDigits(e.target.value)
                    if (zip === onlyDigits(value.addressZip)) return
                    cepDirty.current = true
                    onChange({ ...value, addressZip: zip, addressIbgeCode: null })
                  }}
                  onBlur={() => { if (cepDirty.current && onlyDigits(value.addressZip).length === 8) void fromCep() }}
                  inputMode="numeric"
                  disabled={disabled}
                />
                <Button variant="secondary" onClick={fromCep} disabled={disabled || onlyDigits(value.addressZip).length !== 8}>Preencher</Button>
              </div>
            </FormField>
          </div>
          <div className="col-span-12 @xl:col-span-7 @3xl:col-span-6"><FormField label="Rua" required error={errors.addressStreet}><Input value={value.addressStreet ?? ''} onChange={set('addressStreet')} disabled={disabled} /></FormField></div>
          <div className="col-span-4 @3xl:col-span-2"><FormField label="Número" required error={errors.addressNumber}><Input value={value.addressNumber ?? ''} onChange={set('addressNumber')} disabled={disabled} /></FormField></div>
          <div className="col-span-8 @3xl:col-span-4"><FormField label="Complemento"><Input value={value.addressComplement ?? ''} onChange={set('addressComplement')} disabled={disabled} /></FormField></div>
          <div className="col-span-12 @xl:col-span-6 @3xl:col-span-3"><FormField label="Bairro" required error={errors.addressDistrict}><Input value={value.addressDistrict ?? ''} onChange={set('addressDistrict')} disabled={disabled} /></FormField></div>
          <div className="col-span-9 @xl:col-span-4 @3xl:col-span-3">
            <FormField label="Cidade" required error={errors.addressCity}>
              <Input value={value.addressCity ?? ''} onChange={(e) => onChange({ ...value, addressCity: e.target.value, addressIbgeCode: null })} disabled={disabled} />
            </FormField>
          </div>
          <div className="col-span-3 @xl:col-span-2">
            <FormField label="UF" required error={errors.addressState}>
              <Input maxLength={2} value={value.addressState ?? ''} onChange={(e) => onChange({ ...value, addressState: e.target.value.toUpperCase(), addressIbgeCode: null })} disabled={disabled} />
            </FormField>
          </div>
        </div>
      </Grupo>

      <Grupo titulo="Cobrança" descricao="Para onde vão as faturas e os avisos de cobrança (Termos 25.5).">
        <div className={G}>
          <div className="col-span-12 @3xl:col-span-6"><FormField label="E-mail que recebe as faturas" required error={errors.billingEmail}><Input type="email" value={value.billingEmail ?? ''} onChange={set('billingEmail')} disabled={disabled} /></FormField></div>
          <div className="col-span-12 @xl:col-span-6 @3xl:col-span-3"><FormField label="Contato do financeiro" requirement="optional"><Input value={value.billingContact ?? ''} onChange={set('billingContact')} disabled={disabled} /></FormField></div>
          <div className="col-span-12 @xl:col-span-6 @3xl:col-span-3"><FormField label="Telefone do financeiro" requirement="optional"><Input value={value.billingPhone ?? ''} onChange={set('billingPhone')} disabled={disabled} /></FormField></div>
          <div className="col-span-12 @xl:col-span-6"><FormField label="Inscrição estadual" requirement="optional"><Input value={value.stateRegistration ?? ''} onChange={set('stateRegistration')} disabled={disabled} /></FormField></div>
          <div className="col-span-12 @xl:col-span-6"><FormField label="Inscrição municipal" requirement="optional"><Input value={value.municipalRegistration ?? ''} onChange={set('municipalRegistration')} disabled={disabled} /></FormField></div>
        </div>
      </Grupo>
    </div>
  )
}
