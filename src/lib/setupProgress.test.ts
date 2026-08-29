import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  SETUP_STEPS, loadSetupStep, saveSetupStep, clearSetupProgress,
  isSetupStep, stepNumber, nextStep, previousStep,
} from './setupProgress'

// F13-899: o wizard virou rota retomável. O passo é a única coisa persistida —
// o conteúdo já vive no servidor.
describe('setupProgress — retomada do wizard (F13-899)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('os três passos são whatsapp → time → contexto da IA, nessa ordem', () => {
    expect([...SETUP_STEPS]).toEqual(['whatsapp', 'team', 'hub'])
    expect(SETUP_STEPS.map(stepNumber)).toEqual([1, 2, 3])
  })

  it('sem nada salvo, começa no primeiro passo', () => {
    expect(loadSetupStep('t1')).toBe('whatsapp')
  })

  it('retoma o passo salvo do MESMO tenant', () => {
    saveSetupStep('t1', 'team')

    expect(loadSetupStep('t1')).toBe('team')
    // Outro tenant não herda progresso alheio.
    expect(loadSetupStep('t2')).toBe('whatsapp')
  })

  it('valor corrompido no storage cai no primeiro passo em vez de quebrar', () => {
    localStorage.setItem('oryon.setup.step.t1', 'passo-que-nao-existe')

    expect(loadSetupStep('t1')).toBe('whatsapp')
  })

  it('concluir limpa o progresso — o wizard não reabre no meio no próximo login', () => {
    saveSetupStep('t1', 'hub')
    clearSetupProgress('t1')

    expect(loadSetupStep('t1')).toBe('whatsapp')
    expect(localStorage.getItem('oryon.setup.step.t1')).toBeNull()
  })

  it('localStorage indisponível (aba privada): o wizard funciona, só não retoma', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })

    expect(() => saveSetupStep('t1', 'team')).not.toThrow()
    expect(loadSetupStep('t1')).toBe('whatsapp')
  })

  it('navegação: avança até o fim e volta até o começo', () => {
    expect(nextStep('whatsapp')).toBe('team')
    expect(nextStep('team')).toBe('hub')
    // Depois do último não há próximo — quem chama trata como "concluir".
    expect(nextStep('hub')).toBeNull()

    expect(previousStep('hub')).toBe('team')
    expect(previousStep('team')).toBe('whatsapp')
    expect(previousStep('whatsapp')).toBeNull()
  })

  it('isSetupStep aceita só os passos conhecidos', () => {
    expect(isSetupStep('hub')).toBe(true)
    expect(isSetupStep('done')).toBe(false)
    expect(isSetupStep(null)).toBe(false)
  })
})
