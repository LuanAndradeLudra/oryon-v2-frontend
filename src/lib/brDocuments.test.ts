import { describe, it, expect, vi } from 'vitest'
import { formatTaxId, isValidCnpj, isValidCpf, lookupCep, lookupCnpj } from './brDocuments'

describe('brDocuments', () => {
  it('valida CNPJ e CPF por dígito verificador', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false)
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })

  it('aceita CNPJ alfanumérico', () => {
    expect(isValidCnpj('12.ABC.345/01DE-35')).toBe(true)
    expect(formatTaxId('cnpj', '12abc34501de35')).toBe('12.ABC.345/01DE-35')
  })

  it('formata', () => {
    expect(formatTaxId('cnpj', '11222333000181')).toBe('11.222.333/0001-81')
    expect(formatTaxId('cpf', '52998224725')).toBe('529.982.247-25')
  })

  it('CNPJ → dados da Receita com código IBGE', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        razao_social: 'ACME LTDA', nome_fantasia: 'Acme', cep: '01310100',
        descricao_tipo_de_logradouro: 'AVENIDA', logradouro: 'PAULISTA', numero: '1000',
        bairro: 'BELA VISTA', municipio: 'SAO PAULO', uf: 'sp', codigo_municipio_ibge: 3550308,
      }),
    })
    const r = await lookupCnpj('11.222.333/0001-81', fetchMock as unknown as typeof fetch)
    expect(fetchMock).toHaveBeenCalledWith('https://brasilapi.com.br/api/cnpj/v1/11222333000181')
    expect(r).toMatchObject({
      legalName: 'ACME LTDA', addressStreet: 'AVENIDA PAULISTA', addressState: 'SP', addressIbgeCode: '3550308',
    })
  })

  it('CNPJ inválido nem consulta', async () => {
    const fetchMock = vi.fn()
    await expect(lookupCnpj('123', fetchMock as unknown as typeof fetch)).rejects.toThrow('CNPJ inválido')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('CEP → endereço e IBGE; CEP inexistente lança', async () => {
    const ok = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Curitiba', uf: 'PR', ibge: '4106902' }) })
    await expect(lookupCep('80010-000', ok as unknown as typeof fetch)).resolves.toMatchObject({ addressCity: 'Curitiba', addressIbgeCode: '4106902' })
    const missing = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) })
    await expect(lookupCep('00000000', missing as unknown as typeof fetch)).rejects.toThrow('CEP não encontrado')
  })
})
