// ─── Dados fiscais da empresa (SCRUM-1212) ────────────────────────────────────
// Usado no primeiro acesso e em Configurações > Empresa (só o dono edita).
// Os mesmos dados vão para a nota fiscal e para o cadastro no gateway na
// próxima etapa — por isso CPF/CNPJ são validados aqui e o código IBGE vem
// do CEP, sem perguntar ao cliente. Mudou CEP, cidade ou UF, o código IBGE
// antigo é descartado (senão a nota sairia para o município errado) e o CEP
// novo é consultado de novo ao sair do campo.

import { useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { showToast } from '@/hooks/useToast'
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
  const set = (k: keyof FiscalData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value })

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Tipo de documento" required>
        <Select
          value={type}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, documentType: e.target.value as DocumentType, taxId: null })}
        >
          <option value="cnpj">CNPJ</option>
          <option value="cpf">CPF (empresário individual ou profissional)</option>
        </Select>
      </FormField>
      <FormField label={type === 'cnpj' ? 'CNPJ' : 'CPF'} required error={errors.taxId}>
        <div className="flex gap-2">
          <Input
            value={formatTaxId(type, value.taxId ?? '')}
            onChange={(e) => onChange({ ...value, taxId: normalizeTaxId(type, e.target.value) })}
            inputMode={type === 'cpf' ? 'numeric' : 'text'}
            disabled={disabled}
          />
          {type === 'cnpj' && (
            <Button
              variant="secondary"
              onClick={fromCnpj}
              loading={busy}
              disabled={disabled || !value.taxId || !isValidTaxId('cnpj', value.taxId)}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Buscar
            </Button>
          )}
        </div>
      </FormField>
      <FormField label={type === 'cnpj' ? 'Razão social' : 'Nome completo'} required error={errors.legalName}>
        <Input value={value.legalName ?? ''} onChange={set('legalName')} disabled={disabled} />
      </FormField>
      <FormField label="E-mail que recebe as faturas" required error={errors.billingEmail}>
        <Input type="email" value={value.billingEmail ?? ''} onChange={set('billingEmail')} disabled={disabled} />
      </FormField>
      <FormField label="Inscrição estadual"><Input value={value.stateRegistration ?? ''} onChange={set('stateRegistration')} disabled={disabled} /></FormField>
      <FormField label="Inscrição municipal"><Input value={value.municipalRegistration ?? ''} onChange={set('municipalRegistration')} disabled={disabled} /></FormField>
      <FormField label="Contato do financeiro"><Input value={value.billingContact ?? ''} onChange={set('billingContact')} disabled={disabled} /></FormField>
      <FormField label="Telefone do financeiro"><Input value={value.billingPhone ?? ''} onChange={set('billingPhone')} disabled={disabled} /></FormField>
      <FormField label="CEP" required error={errors.addressZip}>
        <div className="flex gap-2">
          <Input
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
          <Button variant="secondary" onClick={fromCep} disabled={disabled || onlyDigits(value.addressZip).length !== 8}>
            Preencher
          </Button>
        </div>
      </FormField>
      <FormField label="Rua" required error={errors.addressStreet}><Input value={value.addressStreet ?? ''} onChange={set('addressStreet')} disabled={disabled} /></FormField>
      <FormField label="Número" required error={errors.addressNumber}><Input value={value.addressNumber ?? ''} onChange={set('addressNumber')} disabled={disabled} /></FormField>
      <FormField label="Complemento"><Input value={value.addressComplement ?? ''} onChange={set('addressComplement')} disabled={disabled} /></FormField>
      <FormField label="Bairro" required error={errors.addressDistrict}><Input value={value.addressDistrict ?? ''} onChange={set('addressDistrict')} disabled={disabled} /></FormField>
      <FormField label="Cidade" required error={errors.addressCity}>
        <Input value={value.addressCity ?? ''} onChange={(e) => onChange({ ...value, addressCity: e.target.value, addressIbgeCode: null })} disabled={disabled} />
      </FormField>
      <FormField label="UF" required error={errors.addressState}>
        <Input maxLength={2} value={value.addressState ?? ''} onChange={(e) => onChange({ ...value, addressState: e.target.value.toUpperCase(), addressIbgeCode: null })} disabled={disabled} />
      </FormField>
    </div>
  )
}
