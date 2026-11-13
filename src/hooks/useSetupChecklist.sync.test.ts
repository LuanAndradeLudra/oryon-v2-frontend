import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSetupChecklist } from './useSetupChecklist'

afterEach(() => localStorage.clear())

describe('useSetupChecklist — cópias sincronizadas (12/11)', () => {
  it('fechar o banner na página tira o "Novo" do menu lateral na hora', () => {
    const menu = renderHook(() => useSetupChecklist('u1'))
    const pagina = renderHook(() => useSetupChecklist('u1'))
    expect(menu.result.current.checklist.dashboard).toBe(false)
    act(() => pagina.result.current.markDone('dashboard'))
    expect(menu.result.current.checklist.dashboard).toBe(true)
  })

  it('outro usuário no mesmo navegador não é afetado', () => {
    const outro = renderHook(() => useSetupChecklist('u2'))
    const pagina = renderHook(() => useSetupChecklist('u1'))
    act(() => pagina.result.current.markDone('campaigns'))
    expect(outro.result.current.checklist.campaigns).toBe(false)
  })
})
