import { describe, it, expect } from 'vitest'
import { erroDoAgente } from './copilotServiceBackend'

// Revisão 11/10: o Copilot mostrava "Agent Server error 402: {json}" no campo.
describe('erroDoAgente', () => {
  it('402/not_provisioned vira texto para a pessoa, sem status nem JSON', () => {
    const e = erroDoAgente(402, JSON.stringify({ error: 'Sua conta não tem direito de uso…', code: 'not_provisioned' }))
    expect(e.message).toBe('O Copilot não está liberado no plano desta empresa. Fale com o administrador.')
    expect(e.message).not.toMatch(/402|\{|Agent Server/)
    expect(e.status).toBe(402)
    expect(e.code).toBe('not_provisioned')
  })

  it('usa a mensagem amigável do corpo quando existe', () => {
    expect(erroDoAgente(400, JSON.stringify({ error: 'Arquivo grande demais.' })).message).toBe('Arquivo grande demais.')
  })

  it('corpo que não é JSON e erro do servidor não vazam', () => {
    const e = erroDoAgente(502, '<html>Bad gateway</html>')
    expect(e.message).toBe('O Copilot está indisponível no momento. Tente de novo em instantes.')
  })

  it('429 mantém o status para o tratamento de limite', () => {
    expect(erroDoAgente(429, '').status).toBe(429)
  })
})
